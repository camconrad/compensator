// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./IComp.sol";
import "./IGovernorBravo.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

//  ________  ________  _____ ______   ________  ________  ___  ___  ________   ________     
// |\   ____\|\   __  \|\   _ \  _   \|\   __  \|\   __  \|\  \|\  \|\   ___  \|\   ___ \    
// \ \  \___|\ \  \|\  \ \  \\\__\ \  \ \  \|\  \ \  \|\  \ \  \\\  \ \  \\ \  \ \  \_|\ \   
//  \ \  \    \ \  \\\  \ \  \\|__| \  \ \   ____\ \  \\\  \ \  \\\  \ \  \\ \  \ \  \ \\ \  
//   \ \  \____\ \  \\\  \ \  \    \ \  \ \  \___|\ \  \\\  \ \  \\\  \ \  \\ \  \ \  \_\\ \ 
//    \ \_______\ \_______\ \__\    \ \__\ \__\    \ \_______\ \_______\ \__\\ \__\ \_______\
//     \|_______|\|_______|\|__|     \|__|\|__|     \|_______|\|_______|\|__| \|__|\|_______|

/**
 * @title Compensator
 * @notice A contract that allows COMP token holders to delegate their voting power
 * and earn rewards. The delegate can deposit COMP to distribute rewards to delegators.
 * The contract enforces a 5% cap on the total COMP that can be delegated to a single delegate.
 */
contract Compensator is ERC20, Initializable {
    using SafeERC20 for IComp;

    //////////////////////////
    // Variables
    //////////////////////////

    /// @notice The COMP governance token contract
    IComp public constant compToken = IComp(0xc00e94Cb662C3520282E6f5717214004A7f26888);

    /// @notice The Governor Bravo contract for COMP governance
    IGovernorBravo public constant governorBravo = IGovernorBravo(0x309a862bbC1A00e45506cB8A802D1ff10004c8C0);

    /// @notice The address of the delegate receiving voting power
    address public delegate;

    /// @notice The name selected by this delegate when they registered
    string public delegateName;

    /// @notice The amount of COMP deposited by the delegate available for rewards to delegators
    uint256 public availableRewards;

    /// @notice The rate at which COMP is distributed to delegators (COMP per second)
    uint256 public rewardRate;

    /// @notice Current reward index used for distributing COMP rewards to delegators
    uint256 public rewardIndex;

    /// @notice Timestamp of the last time rewards were claimed (i.e. the rewardIndex was updated)
    uint256 public lastRewarded;

    /// @notice Total amount of COMP delegated to this delegate through this system
    uint256 public totalDelegatedCOMP;

    /// @notice Cap on the amount of COMP that can be delegated to this delegate (5% of total COMP supply)
    uint256 public constant DELEGATION_CAP_PERCENT = 5; // 5%
    
    /// @notice Absolute value of the delegation cap in COMP tokens
    uint256 public delegationCap;

    /// @notice Total pending rewards for all delegators that have been accrued but not yet claimed
    uint256 public totalPendingRewards;

    /// @notice Tracks the starting reward index for each delegator to calculate pending rewards
    mapping(address => uint256) public startRewardIndex;

    /// @notice Tracks the outcome of each proposal (0 = not resolved, 1 = For won, 2 = Against won)
    mapping(uint256 => uint8) public proposalOutcomes;

    /// @notice Structure to track individual delegator stakes on proposals
    struct ProposalStake {
        /// @notice Amount staked in support of a proposal
        uint256 forStake;
        /// @notice Amount staked against a proposal
        uint256 againstStake;
    }

    /// @notice Mapping to track stakes for each proposal by each delegator
    mapping(uint256 => mapping(address => ProposalStake)) public proposalStakes;

    /// @notice Total stakes "For" each proposal
    mapping(uint256 => uint256) public totalStakesFor;

    /// @notice Total stakes "Against" each proposal
    mapping(uint256 => uint256) public totalStakesAgainst;

    //////////////////////////
    // Events
    //////////////////////////

    /// @notice Emitted when the delegate deposits COMP into the contract
    event DelegateDeposit(address indexed delegate, uint256 amount);

    /// @notice Emitted when the delegate withdraws COMP from the contract
    event DelegateWithdraw(address indexed delegate, uint256 amount);

    /// @notice Emitted when the delegate updates the reward rate
    event RewardRateUpdate(address indexed delegate, uint256 newRate);

    /// @notice Emitted when a delegator deposits COMP into the contract
    event DelegatorDeposit(address indexed delegator, uint256 amount);

    /// @notice Emitted when a delegator withdraws COMP from the contract
    event DelegatorWithdraw(address indexed delegator, uint256 amount);

    /// @notice Emitted when a delegator claims their rewards
    event ClaimRewards(address indexed delegator, uint256 amount);

    /// @notice Emitted when a delegator stakes COMP on a proposal
    event ProposalStaked(address indexed staker, uint256 proposalId, uint8 support, uint256 amount);

    /// @notice Emitted when stakes are distributed after a proposal is resolved
    event ProposalStakeDistributed(uint256 proposalId, uint8 winningSupport);

    /// @notice Emitted when a delegator reclaims their losing stake after a proposal is resolved
    event LosingStakeReclaimed(address indexed delegator, uint256 proposalId, uint256 amount);

    //////////////////////////
    // Modifiers
    //////////////////////////

    /// @notice Restricts access to the delegate
    modifier onlyDelegate() {
        require(msg.sender == delegate, "Not the delegate");
        _;
    }

    //////////////////////////
    // Constructor & Initialization
    //////////////////////////

    /**
     * @notice Initializes the Compensator contract with name and symbol
     * @dev ERC20 token is non-transferrable and only used for accounting
     */
    constructor() ERC20("Compensator", "COMPENSATOR") {}

    /**
     * @notice Initializes the contract with the delegate's address and name
     * @dev Sets up initial delegation and calculates the 5% delegation cap
     * @param _delegate The address of the delegate
     * @param _delegateName The name of the delegate
     */
    function initialize(address _delegate, string memory _delegateName) public initializer {
        require(_delegate != address(0), "Invalid delegate address");
        delegate = _delegate;
        delegateName = _delegateName;
        rewardIndex = 1e18; // Initialize reward index at 1 with 18 decimals
        compToken.delegate(delegate); // Delegate voting power to the delegate

        // Set the delegation cap to 5% of the total COMP supply
        delegationCap = (compToken.totalSupply() * DELEGATION_CAP_PERCENT) / 100;
    }

    //////////////////////////
    // View Methods
    //////////////////////////

    /**
     * @notice Calculates the timestamp until which rewards will be distributed
     * @dev Returns current timestamp if no rewards are being distributed
     * @return until The timestamp until which rewards will be distributed based on current rate
     */
    function rewardsUntil() external view returns (uint256) {
        if (rewardRate == 0 || availableRewards <= totalPendingRewards) return block.timestamp;
        uint256 remainingRewardsTime = (availableRewards - totalPendingRewards) / rewardRate;
        return lastRewarded + remainingRewardsTime;
    }

    /**
     * @notice Returns the amount of pending rewards for a delegator
     * @dev Accounts for both claimed and unclaimed rewards
     * @param delegator The address of the delegator
     * @return The total amount of rewards available to be claimed by the delegator
     */
    function getPendingRewards(address delegator) external view returns (uint256) {
        if (availableRewards <= totalPendingRewards) {
            return balanceOf(delegator) * (rewardIndex - startRewardIndex[delegator]) / 1e18;
        }
        uint256 currIndex = _getCurrentRewardsIndex();
        return balanceOf(delegator) * (currIndex - startRewardIndex[delegator]) / 1e18;
    }

    //////////////////////////
    // Delegate Methods
    //////////////////////////

    /**
     * @notice Allows the delegate to deposit COMP to be used for rewards
     * @dev Updates reward index before increasing available rewards
     * @param amount The amount of COMP to deposit
     */
    function delegateDeposit(uint256 amount) external onlyDelegate {
        require(amount > 0, "Amount must be greater than 0");
        compToken.transferFrom(delegate, address(this), amount);
        availableRewards += amount;
        _updateRewardsIndex();
        emit DelegateDeposit(delegate, amount);
    }

    /**
     * @notice Allows the delegate to withdraw COMP that is not used for rewards
     * @dev Ensures sufficient funds remain for pending rewards before withdrawal
     * @param amount The amount of COMP to withdraw
     */
    function delegateWithdraw(uint256 amount) external onlyDelegate {
        require(amount > 0, "Amount must be greater than 0");
        _updateRewardsIndex();
        uint256 withdrawableAmount = availableRewards - totalPendingRewards;
        require(amount <= withdrawableAmount, "Amount exceeds available rewards");
        availableRewards -= amount;
        compToken.transfer(delegate, amount);
        emit DelegateWithdraw(delegate, amount);
    }

    /**
     * @notice Allows the delegate to update the reward rate
     * @dev Updates reward index before changing rate to ensure proper accounting
     * @param newRate The new reward rate in COMP per second
     */
    function setRewardRate(uint256 newRate) external onlyDelegate {
        require(newRate >= 0, "Reward rate must be non-negative");
        _updateRewardsIndex();
        rewardRate = newRate;
        emit RewardRateUpdate(delegate, newRate);
    }

    //////////////////////////
    // Delegator Methods
    //////////////////////////

    /**
    * @notice Allows a delegator to delegate tokens to the delegate to receive rewards
    * @param amount The amount of COMP to delegate
    */
    function delegatorDeposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(totalDelegatedCOMP + amount <= delegationCap, "Delegation cap exceeded");
        _updateRewardsIndex();
        uint256 currentBalance = balanceOf(msg.sender);
        uint256 pendingRewards = 0;
        if (currentBalance > 0) {
            pendingRewards = currentBalance * (rewardIndex - startRewardIndex[msg.sender]) / 1e18;
        }
        compToken.transferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
        totalDelegatedCOMP += amount;
        if (currentBalance + amount > 0) {
            startRewardIndex[msg.sender] = rewardIndex - (pendingRewards * 1e18 / (currentBalance + amount));
        } else {
            startRewardIndex[msg.sender] = rewardIndex;
        }
        emit DelegatorDeposit(msg.sender, amount);
    }

    /**
     * @notice Allows a delegator to withdraw tokens from the contract
     * @dev Claims pending rewards before processing withdrawal
     * @param amount The amount of COMP to withdraw
     */
    function delegatorWithdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        _claimRewards(msg.sender);
        _burn(msg.sender, amount);
        compToken.transfer(msg.sender, amount);
        totalDelegatedCOMP -= amount;
        emit DelegatorWithdraw(msg.sender, amount);
    }

    /**
     * @notice Allows a delegator to claim their rewards for delegating
     * @dev Transfers accumulated COMP rewards to the delegator
     */
    function claimRewards() external {
        _claimRewards(msg.sender);
    }

    /**
     * @notice Allows a delegator to stake COMP on a proposal
     * @dev Only active proposals can be staked on
     * @param proposalId The ID of the proposal
     * @param support The vote option (0 = Against, 1 = For)
     * @param amount The amount of COMP to stake
     */
    function stakeForProposal(uint256 proposalId, uint8 support, uint256 amount) external {
        require(support == 0 || support == 1, "Invalid support value");
        require(amount > 0, "Amount must be greater than 0");
        require(proposalOutcomes[proposalId] == 0, "Proposal already resolved");

        IGovernorBravo.ProposalState state = governorBravo.state(proposalId);
        require(state == IGovernorBravo.ProposalState.Active, "Staking only allowed for active proposals");

        compToken.transferFrom(msg.sender, address(this), amount);

        if (support == 1) {
            proposalStakes[proposalId][msg.sender].forStake += amount;
            totalStakesFor[proposalId] += amount;
        } else {
            proposalStakes[proposalId][msg.sender].againstStake += amount;
            totalStakesAgainst[proposalId] += amount;
        }

        emit ProposalStaked(msg.sender, proposalId, support, amount);
    }

    /**
     * @notice Allows the delegate to distribute stakes after a proposal is resolved
     * @dev Only transfers winning stakes to delegate, losing stakes remain reclaimable
     * @param proposalId The ID of the proposal
     * @param winningSupport The winning vote option (0 = Against, 1 = For)
     */
    function distributeStakes(uint256 proposalId, uint8 winningSupport) external onlyDelegate {
        require(winningSupport == 0 || winningSupport == 1, "Invalid support value");
        require(proposalOutcomes[proposalId] == 0, "Proposal already resolved");
        
        proposalOutcomes[proposalId] = winningSupport + 1;
        
        if (winningSupport == 1) {
            compToken.transfer(delegate, totalStakesFor[proposalId]);
        } else {
            compToken.transfer(delegate, totalStakesAgainst[proposalId]);
        }
        
        emit ProposalStakeDistributed(proposalId, winningSupport);
    }

    /**
     * @notice Allows delegators to reclaim their losing stake after a proposal is resolved
     * @dev Can only be called after proposal is resolved with recorded outcome
     * @param proposalId The ID of the proposal to reclaim stake from
     */
    function reclaimLosingStake(uint256 proposalId) external {
        uint8 outcome = proposalOutcomes[proposalId];
        require(outcome != 0, "Proposal not resolved yet");
        
        ProposalStake storage stake = proposalStakes[proposalId][msg.sender];
        uint8 winningSupport = outcome - 1;
        
        uint256 amountToReturn;
        if (winningSupport == 1) {
            amountToReturn = stake.againstStake;
            stake.againstStake = 0;
            totalStakesAgainst[proposalId] -= amountToReturn;
        } else {
            amountToReturn = stake.forStake;
            stake.forStake = 0;
            totalStakesFor[proposalId] -= amountToReturn;
        }
        
        require(amountToReturn > 0, "No losing stake to reclaim");
        compToken.transfer(msg.sender, amountToReturn);
        emit LosingStakeReclaimed(msg.sender, proposalId, amountToReturn);
    }

    //////////////////////////
    // Internal Functions
    //////////////////////////

    /**
     * @notice Internal function to claim rewards for a delegator
     * @dev Updates reward index and transfers COMP to delegator
     * @param delegator The address of the delegator claiming rewards
     */
    function _claimRewards(address delegator) internal {
        _updateRewardsIndex();
        uint256 pendingRewards = balanceOf(delegator) * (rewardIndex - startRewardIndex[delegator]) / 1e18;
        startRewardIndex[delegator] = rewardIndex;
        compToken.transfer(delegator, pendingRewards);
        emit ClaimRewards(delegator, pendingRewards);
    }

    /**
     * @notice Updates the reward index based on elapsed time and reward rate
     * @dev Handles cases where available rewards are insufficient for pending rewards
     */
    function _updateRewardsIndex() internal {
        uint256 supply = totalSupply();
        
        // Early return if no delegators exist
        if (supply == 0) {
            lastRewarded = block.timestamp;
            return;
        }

        // Existing insufficient rewards check
        if (availableRewards <= totalPendingRewards) {
            lastRewarded = block.timestamp;
            return;
        }
        
        // Calculate new rewards
        uint256 timeDelta = block.timestamp - lastRewarded;
        uint256 rewards = timeDelta * rewardRate;
        uint256 availableForNewRewards = availableRewards - totalPendingRewards;
        
        // Handle potential overflow
        if (rewards > availableForNewRewards) {
            rewards = availableForNewRewards;
            availableRewards = totalPendingRewards;
        } else {
            availableRewards -= rewards;
        }

        // Distribute rewards (supply > 0 guaranteed by first check)
        rewardIndex += rewards * 1e18 / supply;
        totalPendingRewards += rewards;
        lastRewarded = block.timestamp;
    }

    /**
    * @notice Returns the current rewards index, adjusted for time since last rewarded
    * @dev Used for view functions to calculate pending rewards. Now capped by availableRewards
    * and returns current reward index including unaccrued rewards (never exceeding available)
    */
    function _getCurrentRewardsIndex() internal view returns (uint256) {
        if (availableRewards <= totalPendingRewards) {
            return rewardIndex;
        }
        
        uint256 timeDelta = block.timestamp - lastRewarded;
        uint256 potentialRewards = timeDelta * rewardRate;
        uint256 supply = totalSupply();
        
        // Cap rewards to remaining available funds
        uint256 remainingRewards = availableRewards - totalPendingRewards;
        uint256 actualRewards = potentialRewards > remainingRewards 
            ? remainingRewards 
            : potentialRewards;

        if (supply > 0) {
            return rewardIndex + (actualRewards * 1e18) / supply;
        }
        return rewardIndex;
    }

    //////////////////////////
    // ERC20 Overrides
    //////////////////////////

    /**
     * @notice Overrides the transfer function to block transfers
     * @dev Compensator tokens are non-transferrable
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        revert("Transfers are disabled");
    }

    /**
     * @notice Overrides the transferFrom function to block transfers
     * @dev Compensator tokens are non-transferrable
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        revert("Transfers are disabled");
    }
}
