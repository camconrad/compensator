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

    /// @notice The COMP governance token
    IComp public constant compToken = IComp(0xc00e94Cb662C3520282E6f5717214004A7f26888);

    /// @notice The Governor Bravo contract for COMP governance
    IGovernorBravo public constant governorBravo = IGovernorBravo(0x309a862bbC1A00e45506cB8A802D1ff10004c8C0);

    /// @notice The address of the delegate
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
    uint256 public delegationCap;

    /// @notice Total pending rewards for all delegators
    uint256 public totalPendingRewards;

    /// @notice Tracks the starting reward index for each delegator
    mapping(address => uint256) public startRewardIndex;

    /// @notice Tracks stakes for proposals by delegators
    struct ProposalStake {
        uint256 forStake; // Amount staked "For" a proposal
        uint256 againstStake; // Amount staked "Against" a proposal
    }

    /// @notice Mapping to track stakes for each proposal by each delegator
    mapping(uint256 => mapping(address => ProposalStake)) public proposalStakes;

    /// @notice Total stakes "For" a proposal
    mapping(uint256 => uint256) public totalStakesFor;

    /// @notice Total stakes "Against" a proposal
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

    //////////////////////////
    // Modifiers
    //////////////////////////

    /// @notice Restricts access to the delegate
    modifier onlyDelegate() {
        require(msg.sender == delegate, "Not the delegate");
        _;
    }

    //////////////////////////
    // Constructor
    //////////////////////////

    /**
     * @notice Initializes the Compensator contract with name and symbol
     */
    constructor() ERC20("Compensator", "COMPENSATOR") {}

    //////////////////////////
    // Initialization
    //////////////////////////

    /**
     * @notice Initializes the contract with the delegate's address and name
     * @param _delegate The address of the delegate
     * @param _delegateName The name of the delegate
     */
    function initialize(address _delegate, string memory _delegateName) public initializer {
        require(_delegate != address(0), "Invalid delegate address");
        delegate = _delegate;
        delegateName = _delegateName;
        rewardIndex = 1e18; // Initialize reward index
        compToken.delegate(delegate); // Delegate voting power to the delegate

        // Set the delegation cap to 5% of the total COMP supply
        delegationCap = (compToken.totalSupply() * DELEGATION_CAP_PERCENT) / 100;
    }

    //////////////////////////
    // View Methods
    //////////////////////////

    /**
     * @notice Calculates the timestamp until which rewards will be distributed
     * @return until The timestamp until which rewards will be distributed
     */
    function rewardsUntil() external view returns (uint256) {
        if (rewardRate == 0) return block.timestamp;
        uint256 remainingRewardsTime = availableRewards / rewardRate;
        return lastRewarded + remainingRewardsTime;
    }

    /**
     * @notice Returns the amount of pending rewards for a delegator
     * @param delegator The address of the delegator
     * @return The total amount of rewards available to be claimed by the delegator
     */
    function getPendingRewards(address delegator) external view returns (uint256) {
        uint256 currIndex = _getCurrentRewardsIndex();
        return balanceOf(delegator) * (currIndex - startRewardIndex[delegator]) / 1e18;
    }

    //////////////////////////
    // Delegate/Owner Methods
    //////////////////////////

    /**
     * @notice Allows the delegate to deposit COMP to be used for rewards
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
     * @param amount The amount of COMP to withdraw
     */
    function delegateWithdraw(uint256 amount) external onlyDelegate {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= availableRewards - totalPendingRewards, "Amount exceeds available rewards");

        availableRewards -= amount;
        compToken.transfer(delegate, amount);

        emit DelegateWithdraw(delegate, amount);
    }

    /**
     * @notice Allows the delegate to update the reward rate
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

        // Transfer COMP from delegator to the contract
        compToken.transferFrom(msg.sender, address(this), amount);

        // Update this delegator's starting reward index
        startRewardIndex[msg.sender] = rewardIndex;

        // Mint them an ERC20 token back for record keeping
        _mint(msg.sender, amount);

        // Update the total delegated COMP
        totalDelegatedCOMP += amount;

        emit DelegatorDeposit(msg.sender, amount);
    }

    /**
     * @notice Allows a delegator to withdraw tokens from the contract
     * @param amount The amount of COMP to withdraw
     */
    function delegatorWithdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");

        _claimRewards(msg.sender); // Updates the index and transfers rewards
        _burn(msg.sender, amount);
        compToken.transfer(msg.sender, amount);

        // Update the total delegated COMP
        totalDelegatedCOMP -= amount;

        emit DelegatorWithdraw(msg.sender, amount);
    }

    /**
     * @notice Allows a delegator to claim their rewards for delegating
     */
    function claimRewards() external {
        _claimRewards(msg.sender);
    }

    /**
    * @notice Allows a delegator to stake COMP on a proposal
    * @param proposalId The ID of the proposal
    * @param support The vote option (0 = Against, 1 = For)
    * @param amount The amount of COMP to stake
    */
    function stakeForProposal(uint256 proposalId, uint8 support, uint256 amount) external {
        require(support == 0 || support == 1, "Invalid support value");
        require(amount > 0, "Amount must be greater than 0");

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
     * @param proposalId The ID of the proposal
     * @param winningSupport The winning vote option (0 = Against, 1 = For)
     */
    function distributeStakes(uint256 proposalId, uint8 winningSupport) external onlyDelegate {
        require(winningSupport == 0 || winningSupport == 1, "Invalid support value");

        if (winningSupport == 1) {
            // Delegators who staked "For" pass their stake to the delegate
            compToken.transfer(delegate, totalStakesFor[proposalId]);
            // Delegators who staked "Against" get their stake back
            compToken.transfer(address(this), totalStakesAgainst[proposalId]);
        } else {
            // Delegators who staked "Against" pass their stake to the delegate
            compToken.transfer(delegate, totalStakesAgainst[proposalId]);
            // Delegators who staked "For" get their stake back
            compToken.transfer(address(this), totalStakesFor[proposalId]);
        }

        emit ProposalStakeDistributed(proposalId, winningSupport);
    }

    //////////////////////////
    // Internal Functions
    //////////////////////////

    /**
     * @notice Internal function to claim rewards for a delegator
     * @param delegator The address of the delegator
     */
    function _claimRewards(address delegator) internal {
        _updateRewardsIndex();
        uint256 pendingRewards = balanceOf(delegator) * (rewardIndex - startRewardIndex[delegator]) / 1e18;
        startRewardIndex[delegator] = rewardIndex; // Update the delegator's starting reward index
        compToken.transfer(delegator, pendingRewards); // Transfer rewards to the delegator
        emit ClaimRewards(delegator, pendingRewards);
    }

    /**
     * @notice Updates the reward index based on how much time has passed and the rewards rate
     */
    function _updateRewardsIndex() internal {
        uint256 timeDelta = block.timestamp - lastRewarded;
        uint256 rewards = timeDelta * rewardRate;

        if (rewards > availableRewards) {
            rewards = availableRewards;
            availableRewards = 0;
        } else {
            availableRewards -= rewards;
        }

        uint256 supply = totalSupply();
        if (supply > 0) {
            rewardIndex += rewards * 1e18 / supply;
            totalPendingRewards += rewards;
        }

        lastRewarded = block.timestamp;
    }

    /**
     * @notice Returns the current rewards index, adjusted for time since last rewarded
     * @return The current reward index
     */
    function _getCurrentRewardsIndex() internal view returns (uint256) {
        uint256 timeDelta = block.timestamp - lastRewarded;
        uint256 rewards = timeDelta * rewardRate;
        uint256 supply = totalSupply();
        if (supply > 0) {
            return rewardIndex + rewards * 1e18 / supply;
        } else {
            return rewardIndex;
        }
    }

    //////////////////////////
    // ERC20 Overrides
    //////////////////////////

    /**
     * @notice Overrides the transfer function to block transfers
     * @param to The address receiving tokens
     * @param amount The amount of tokens to transfer
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        revert("Transfers are disabled");
    }

    /**
     * @notice Overrides the transferFrom function to block transfers
     * @param from The address sending tokens
     * @param to The address receiving tokens
     * @param amount The amount of tokens to transfer
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        revert("Transfers are disabled");
    }
}
