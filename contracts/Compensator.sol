// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {IComp} from "./IComp.sol";
import {IGovernor} from "./IGovernor.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

//  ________  ________  _____ ______   ________  ________  ___  ___  ________   ________     
// |\   ____\|\   __  \|\   _ \  _   \|\   __  \|\   __  \|\  \|\  \|\   ___  \|\   ___ \    
// \ \  \___|\ \  \|\  \ \  \\\__\ \  \ \  \|\  \ \  \|\  \ \  \\\  \ \  \\ \  \ \  \_|\ \   
//  \ \  \    \ \  \\\  \ \  \\|__| \  \ \   ____\ \  \\\  \ \  \\\  \ \  \\ \  \ \  \ \\ \  
//   \ \  \____\ \  \\\  \ \  \    \ \  \ \  \___|\ \  \\\  \ \  \\\  \ \  \\ \  \ \  \_\\ \ 
//    \ \_______\ \_______\ \__\    \ \__\ \__\    \ \_______\ \_______\ \__\\ \__\ \_______\
//     \|_______|\|_______|\|__|     \|__|\|__|     \|_______|\|_______|\|__| \|__|\|_______|

/**
 * @title Compensator
 * @notice A contract that allows COMP holders to delegate their voting power
 * and earn rewards. The delegate can deposit COMP to distribute rewards to delegators.
 * COMP holders may also stake COMP for or against proposals once delegated.
 * @custom:security-contact support@compensator.io
 */
contract Compensator is ERC20, ReentrancyGuard, Ownable {
    using SafeERC20 for IComp;

    //////////////////////////
    // Type Declarations
    //////////////////////////

    /// @notice Structure to track individual delegator stakes on proposals
    struct ProposalStake {
        /// @notice Amount staked in support of a proposal
        uint128 forStake;
        /// @notice Amount staked against a proposal
        uint128 againstStake;
    }

    /// @notice Possible outcomes for a proposal
    enum ProposalOutcome {
        NotResolved,
        AgainstWon,
        ForWon
    }

    //////////////////////////
    // State Variables
    //////////////////////////

    /// @notice The COMP governance token contract
    IComp public immutable COMP_TOKEN;

    /// @notice The Compound Governor contract
    IGovernor public immutable COMPOUND_GOVERNOR;

    /// @notice The address of the delegate receiving voting power
    /// @dev The delegate is the person who receives COMP delegations and can earn rewards
    address public immutable delegate;

    /// @notice The name selected by this delegate when they registered
    string public immutable delegateName;

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
    uint256 public constant DELEGATION_CAP_PERCENT = 500; // 5% in basis points
    
    /// @notice Absolute value of the delegation cap in COMP tokens
    uint256 public delegationCap;

    /// @notice Total pending rewards for all delegators that have been accrued but not yet claimed
    uint256 public totalPendingRewards;

    /// @notice Tracks the starting reward index for each delegator to calculate pending rewards
    mapping(address delegator => uint256 index) public startRewardIndex;

    /// @notice Tracks previously accrued but unclaimed rewards for each delegator
    mapping(address delegator => uint256 amount) public unclaimedRewards;

    /// @notice Tracks the outcome of each proposal
    mapping(uint256 proposalId => ProposalOutcome outcome) public proposalOutcomes;

    /// @notice Tracks when each proposal was created
    mapping(uint256 proposalId => uint256 timestamp) public proposalCreationTime;

    /// @notice Maximum time a proposal can remain unresolved (30 days)
    uint256 public constant MAX_PROPOSAL_RESOLUTION_TIME = 30 days;

    /// @notice Mapping to track stakes for each proposal by each delegator
    mapping(uint256 proposalId => mapping(address delegator => ProposalStake stake)) public proposalStakes;

    /// @notice Total stakes "For" each proposal
    mapping(uint256 proposalId => uint256 amount) public totalStakesFor;

    /// @notice Total stakes "Against" each proposal
    mapping(uint256 proposalId => uint256 amount) public totalStakesAgainst;

    /// @notice Minimum lock period for delegated COMP (7 days)
    uint256 public constant MIN_LOCK_PERIOD = 7 days;

    /// @notice Tracks when each delegator's COMP will be unlocked
    mapping(address delegator => uint256 timestamp) public unlockTime;

    /// @notice Latest proposal ID that has been seen
    uint256 public latestProposalId;

    /// @notice Tracks active proposals
    mapping(uint256 proposalId => bool isActive) public activeProposals;

    /// @notice Tracks proposals that are about to start (within 1 day)
    mapping(uint256 proposalId => bool isPending) public pendingProposals;

    /// @notice Tracks whether the delegate has voted on a proposal
    mapping(uint256 proposalId => bool hasVoted) public delegateVoted;

    /// @notice Tracks the delegate's vote direction on a proposal
    mapping(uint256 proposalId => uint8 direction) public delegateVoteDirection;

    /// @notice Precision factor for reward calculations (18 decimals)
    uint256 public constant REWARD_PRECISION = 1e18;

    /// @notice Percentage basis points (100%)
    uint256 public constant BASIS_POINTS = 10000; // 100% = 10000 basis points

    /// @notice Address of the trusted off-chain service that can record votes
    address public VOTE_RECORDER;

    /// @notice Timestamp when the vote recorder was last updated
    uint256 public voteRecorderLastUpdate;

    /// @notice Minimum time between vote recorder updates (24 hours)
    uint256 public constant VOTE_RECORDER_UPDATE_DELAY = 24 hours;

    /// @notice Pending new vote recorder address
    address public pendingVoteRecorder;

    /// @notice Timestamp when the pending vote recorder can be confirmed
    uint256 public voteRecorderUpdateTime;

    /// @notice Address that proposed the pending vote recorder update
    address public voteRecorderUpdateProposer;

    /// @notice Address of the Compensator factory that can validate vote recorders
    address public immutable factory;

    /// @notice Number of blocks per day for proposal timing calculations
    /// @dev Default is 6500 blocks per day (mainnet)
    uint256 public blocksPerDay = 6500;

    //////////////////////////
    // Events
    //////////////////////////

    /// @notice Emitted when a delegator's COMP is locked
    event COMPLocked(address indexed delegator, uint256 unlockTime);

    /// @notice Emitted when a new proposal is detected
    event NewProposalDetected(uint256 indexed proposalId);

    /// @notice Emitted when a proposal is marked as active
    event ProposalActivated(uint256 indexed proposalId);

    /// @notice Emitted when a proposal is marked as inactive
    event ProposalDeactivated(uint256 indexed proposalId);

    /// @notice Emitted when a proposal is automatically resolved
    event ProposalAutoResolved(uint256 indexed proposalId, uint8 winningSupport);

    /// @notice Emitted when the delegate deposits COMP into the contract
    /// @param delegate The address of the delegate depositing COMP
    /// @param amount The amount of COMP being deposited
    event DelegateDeposit(address indexed delegate, uint256 amount);

    /// @notice Emitted when the delegate withdraws COMP from the contract
    /// @param delegate The address of the delegate withdrawing COMP
    /// @param amount The amount of COMP being withdrawn
    event DelegateWithdraw(address indexed delegate, uint256 amount);

    /// @notice Emitted when the delegate updates the reward rate
    /// @param delegate The address of the delegate updating the rate
    /// @param newRate The new reward rate in COMP per second
    event RewardRateUpdate(address indexed delegate, uint256 newRate);

    /// @notice Emitted when a delegator deposits COMP into the contract
    /// @param delegator The address of the delegator depositing COMP
    /// @param amount The amount of COMP being deposited
    event DelegatorDeposit(address indexed delegator, uint256 amount);

    /// @notice Emitted when a delegator withdraws COMP from the contract
    /// @param delegator The address of the delegator withdrawing COMP
    /// @param amount The amount of COMP being withdrawn
    event DelegatorWithdraw(address indexed delegator, uint256 amount);

    /// @notice Emitted when a delegator claims their rewards
    /// @param delegator The address of the delegator claiming rewards
    /// @param amount The amount of COMP rewards being claimed
    event ClaimRewards(address indexed delegator, uint256 amount);

    /// @notice Emitted when a delegator stakes COMP on a proposal
    /// @param staker The address of the delegator staking COMP
    /// @param proposalId The ID of the proposal being staked on
    /// @param support The vote option (0 = Against, 1 = For)
    /// @param amount The amount of COMP being staked
    event ProposalStaked(address indexed staker, uint256 proposalId, uint8 support, uint256 amount);

    /// @notice Emitted when stakes are distributed after a proposal is resolved
    /// @param proposalId The ID of the resolved proposal
    /// @param winningSupport The winning vote option (0 = Against, 1 = For)
    event ProposalStakeDistributed(uint256 indexed proposalId, uint8 indexed winningSupport);

    /// @notice Emitted when a delegator reclaims their losing stake after a proposal is resolved
    /// @param delegator The address of the delegator reclaiming their stake
    /// @param proposalId The ID of the resolved proposal
    /// @param amount The amount of COMP being reclaimed
    event LosingStakeReclaimed(address indexed delegator, uint256 proposalId, uint256 amount);

    /// @notice Emitted when delegate voting is verified
    event DelegateVotingVerified(uint256 indexed proposalId, bool hasVoted, uint8 voteDirection);

    /// @notice Emitted when a delegate's vote is recorded
    event DelegateVoteRecorded(
        uint256 indexed proposalId,
        uint8 support,
        uint256 timestamp,
        address indexed recordedBy
    );

    /// @notice Emitted when a user's rewards are updated
    /// @param delegator The address of the delegator whose rewards were updated
    /// @param newRewards The amount of new rewards accrued
    /// @param totalUnclaimed The total amount of unclaimed rewards after the update
    event UserRewardsUpdated(address indexed delegator, uint256 newRewards, uint256 totalUnclaimed);

    /// @notice Emitted when the global reward index is updated
    /// @param newRewardIndex The new reward index value
    /// @param rewardsAccrued The amount of rewards accrued in this update
    event RewardIndexUpdated(uint256 newRewardIndex, uint256 rewardsAccrued);

    /// @notice Emitted when a new vote recorder is proposed
    event VoteRecorderUpdateProposed(
        address indexed proposer,
        address indexed newVoteRecorder,
        uint256 effectiveTime
    );

    /// @notice Emitted when the vote recorder is updated
    event VoteRecorderUpdated(
        address indexed oldVoteRecorder,
        address indexed newVoteRecorder,
        address indexed proposer
    );

    /// @notice Emitted when a proposal's state changes
    event ProposalStateChanged(
        uint256 indexed proposalId,
        IGovernor.ProposalState oldState,
        IGovernor.ProposalState newState
    );

    /// @notice Emitted when the delegation cap is updated
    event DelegationCapUpdated(
        uint256 oldCap,
        uint256 newCap,
        uint256 totalSupply
    );

    /// @notice Emitted when rewards are distributed to delegators
    event RewardsDistributed(
        uint256 totalRewards,
        uint256 rewardIndex,
        uint256 timestamp
    );

    /// @notice Emitted when a vote recorder update is initiated
    event VoteRecorderUpdateInitiated(
        address indexed proposer,
        address indexed newVoteRecorder,
        uint256 effectiveTime
    );

    /// @notice Emitted when a vote recorder update is cancelled
    event VoteRecorderUpdateCancelled(
        address indexed proposer,
        address indexed cancelledVoteRecorder
    );

    //////////////////////////
    // Constructor
    //////////////////////////

    /**
     * @notice Constructor that initializes the contract with the delegate's address and name
     * @param _delegate The address of the delegate
     * @param _delegateName The name of the delegate
     * @param _compToken The address of the COMP token contract
     * @param _compoundGovernor The address of the Compound Governor contract
     * @param _voteRecorder The address of the trusted vote recorder service
     * @param _factory The address of the Compensator factory
     */
    constructor(
        address _delegate,
        string memory _delegateName,
        address _compToken,
        address _compoundGovernor,
        address _voteRecorder,
        address _factory
    ) ERC20("Compensator", "COMPENSATOR") Ownable(_delegate) {
        require(_delegate != address(0), "Invalid delegate address");
        require(_compToken != address(0), "Invalid COMP token address");
        require(_compoundGovernor != address(0), "Invalid Compound Governor address");
        require(_voteRecorder != address(0), "Invalid vote recorder address");
        require(_factory != address(0), "Invalid factory address");
        
        delegate = _delegate;
        delegateName = _delegateName;
        COMP_TOKEN = IComp(_compToken);
        COMPOUND_GOVERNOR = IGovernor(_compoundGovernor);
        VOTE_RECORDER = _voteRecorder;
        factory = _factory;
        
        rewardIndex = REWARD_PRECISION; // Initialize reward index at 1 with 18 decimals
        COMP_TOKEN.delegate(delegate); // Delegate voting power to the delegate

        // Set the delegation cap to 5% of the total COMP supply
        uint256 totalSupply = COMP_TOKEN.totalSupply();
        require(totalSupply > 0, "Invalid COMP total supply");
        uint256 oldCap = delegationCap;
        delegationCap = (totalSupply * DELEGATION_CAP_PERCENT) / BASIS_POINTS;
        require(delegationCap > 0, "Delegation cap too small");
        
        emit DelegationCapUpdated(oldCap, delegationCap, totalSupply);
    }

    //////////////////////////
    // External Functions
    //////////////////////////

    // View functions
    /**
     * @notice Calculates the timestamp until which rewards will be distributed
     * @dev Returns lastRewarded timestamp if no rewards are being distributed
     * @dev Uses high precision calculations to avoid rounding errors
     * @return until The timestamp until which rewards will be distributed based on current rate
     */
    function rewardsUntil() external view returns (uint256) {
        if (rewardRate == 0) return lastRewarded;
        
        uint256 remainingRewards = availableRewards > totalPendingRewards 
            ? availableRewards - totalPendingRewards 
            : 0;
        
        // Use higher precision calculation to avoid rounding errors
        uint256 remainingRewardsTime = (remainingRewards * REWARD_PRECISION) / rewardRate;
        return lastRewarded + remainingRewardsTime;
    }

    /**
     * @notice Returns the amount of pending rewards for a delegator
     * @dev Accounts for both claimed and unclaimed rewards
     * @param delegator The address of the delegator
     * @return The total amount of rewards available to be claimed by the delegator
     */
    function getPendingRewards(address delegator) external view returns (uint256) {
        uint256 currentRewards = unclaimedRewards[delegator];
        
        // Add newly accrued rewards since last checkpoint
        if (balanceOf(delegator) > 0) {
            uint256 currIndex = _getCurrentRewardsIndex();
            currentRewards += balanceOf(delegator) * (currIndex - startRewardIndex[delegator]) / REWARD_PRECISION;
        }
        
        return currentRewards;
    }

    /**
     * @notice Returns a delegator's stakes for a specific proposal
     * @param proposalId The ID of the proposal
     * @param delegator The address of the delegator
     * @return forStake Amount staked in support of the proposal
     * @return againstStake Amount staked against the proposal
     */
    function getProposalStake(uint256 proposalId, address delegator) 
        external view returns (uint256 forStake, uint256 againstStake) 
    {
        ProposalStake memory stake = proposalStakes[proposalId][delegator];
        return (stake.forStake, stake.againstStake);
    }

    // Delegate functions
    /**
     * @notice Allows the delegate to deposit COMP to be used for rewards
     * @dev Updates reward index before increasing available rewards
     * @param amount The amount of COMP to deposit
     */
    function delegateDeposit(uint256 amount) external nonReentrant {
        // Checks
        require(msg.sender == delegate, "Only delegate can deposit");
        require(amount > 0, "Amount must be greater than 0");
        
        // Effects
        _updateRewardsIndex();
        availableRewards += amount;
        
        // Interactions
        COMP_TOKEN.transferFrom(delegate, address(this), amount);
        
        emit DelegateDeposit(delegate, amount);
    }

    /**
     * @notice Allows the delegate to withdraw COMP from the contract
     * @dev Ensures sufficient funds remain for pending rewards before withdrawal
     * @param amount The amount of COMP to withdraw
     */
    function delegateWithdraw(uint256 amount) external nonReentrant {
        // Checks
        require(msg.sender == delegate, "Only delegate can withdraw");
        require(amount > 0, "Amount must be greater than 0");
        
        // Cache frequently accessed storage variables
        uint256 currentAvailableRewards = availableRewards;
        uint256 currentTotalPendingRewards = totalPendingRewards;
        address currentDelegate = delegate;
        
        uint256 withdrawableAmount = currentAvailableRewards - currentTotalPendingRewards;
        require(amount <= withdrawableAmount, "Amount exceeds available rewards");
        
        // Effects
        _updateRewardsIndex();
        require(currentAvailableRewards >= amount, "Insufficient available rewards");
        availableRewards = currentAvailableRewards - amount;
        
        // Interactions
        COMP_TOKEN.transfer(currentDelegate, amount);
        
        emit DelegateWithdraw(currentDelegate, amount);
    }

    /**
     * @notice Allows the delegate to update the reward rate
     * @dev Updates reward index before changing rate to ensure proper accounting
     * @param newRate The new reward rate in COMP per second
     */
    function setRewardRate(uint256 newRate) external nonReentrant {
        // Checks
        require(msg.sender == delegate, "Only delegate can set reward rate");
        require(newRate >= 0, "Reward rate must be non-negative");
        require(newRate != rewardRate, "New rate must be different from current rate");
        
        // Effects
        _updateRewardsIndex();
        rewardRate = newRate;
        
        // Interactions
        // No external calls
        
        emit RewardRateUpdate(delegate, newRate);
    }

    // Delegator functions
    /**
     * @notice Allows a delegator to delegate tokens to the delegate to receive rewards
     * @dev A delegator is someone who delegates their COMP to the delegate
     * @dev Relies on Solidity 0.8.x built-in overflow protection for arithmetic operations
     * @param amount The amount of COMP to delegate
     */
    function delegatorDeposit(uint256 amount) external nonReentrant {
        // Checks
        require(amount > 0, "Amount must be greater than 0");
        require(totalDelegatedCOMP + amount <= delegationCap, "Delegation cap exceeded");
        
        // Effects
        _updateRewardsIndex();
        _updateUserRewards(msg.sender);
        
        // Set unlock time based on active proposals
        uint256 newUnlockTime = block.timestamp + MIN_LOCK_PERIOD;
        if (_hasActiveOrPendingProposals()) {
            newUnlockTime = block.timestamp + MIN_LOCK_PERIOD + 3 days;
        }
        
        if (newUnlockTime > unlockTime[msg.sender]) {
            unlockTime[msg.sender] = newUnlockTime;
            emit COMPLocked(msg.sender, newUnlockTime);
        }
        
        _mint(msg.sender, amount);
        totalDelegatedCOMP += amount;
        startRewardIndex[msg.sender] = rewardIndex;
        
        // Interactions
        COMP_TOKEN.transferFrom(msg.sender, address(this), amount);
        
        emit DelegatorDeposit(msg.sender, amount);
    }

    /**
     * @notice Allows a delegator to withdraw tokens from the contract
     * @dev Claims pending rewards before processing withdrawal
     * @dev Relies on Solidity 0.8.x built-in overflow protection for arithmetic operations
     * @param amount The amount of COMP to withdraw
     */
    function delegatorWithdraw(uint256 amount) external nonReentrant {
        // Checks
        require(amount > 0, "Amount must be greater than 0");
        require(block.timestamp >= unlockTime[msg.sender], "COMP is locked");
        require(!_hasActiveOrPendingProposals(), "Cannot withdraw during active or pending proposals");
        require(amount <= balanceOf(msg.sender), "Insufficient balance");
        
        // Effects
        _updateRewardsIndex();
        _updateUserRewards(msg.sender);
        
        _burn(msg.sender, amount);
        totalDelegatedCOMP -= amount;
        startRewardIndex[msg.sender] = rewardIndex;
        
        // Interactions
        COMP_TOKEN.transfer(msg.sender, amount);
        
        emit DelegatorWithdraw(msg.sender, amount);
    }

    /**
     * @notice Allows delegators to claim their accumulated rewards
     * @dev Updates rewards first, then transfers COMP to the delegator
     */
    function claimRewards() external nonReentrant {
        // Effects
        _updateRewardsIndex();
        _updateUserRewards(msg.sender);
        
        uint256 amount = unclaimedRewards[msg.sender];
        require(amount > 0, "No rewards to claim");
        
        // Reset unclaimed rewards before transfer to prevent reentrancy
        unclaimedRewards[msg.sender] = 0;
        totalPendingRewards -= amount;
        
        // Interactions
        COMP_TOKEN.transfer(msg.sender, amount);
        
        emit ClaimRewards(msg.sender, amount);
    }

    // Proposal functions
    /**
     * @notice Allows a delegator to stake COMP on a proposal
     * @dev Only active proposals can be staked on
     * @param proposalId The ID of the proposal
     * @param support The vote option (0 = Against, 1 = For)
     * @param amount The amount of COMP to stake
     */
    function stakeForProposal(uint256 proposalId, uint8 support, uint256 amount) external nonReentrant {
        // Checks
        require(support == 0 || support == 1, "Invalid support value");
        require(amount > 0, "Amount must be greater than 0");
        require(proposalOutcomes[proposalId] == ProposalOutcome.NotResolved, "Proposal already resolved");

        IGovernor.ProposalState state = COMPOUND_GOVERNOR.state(proposalId);
        require(state == IGovernor.ProposalState.Active, "Staking only allowed for active proposals");

        // Effects
        _updateLatestProposalId(proposalId);
        if (proposalCreationTime[proposalId] == 0) {
            proposalCreationTime[proposalId] = block.timestamp;
        }

        if (support == 1) {
            proposalStakes[proposalId][msg.sender].forStake += uint128(amount);
            totalStakesFor[proposalId] += amount;
        } else {
            proposalStakes[proposalId][msg.sender].againstStake += uint128(amount);
            totalStakesAgainst[proposalId] += amount;
        }

        // Interactions
        COMP_TOKEN.transferFrom(msg.sender, address(this), amount);

        emit ProposalStaked(msg.sender, proposalId, support, amount);
    }

    /**
     * @notice Resolves a proposal and distributes stakes based on the actual outcome
     * @dev Can only be called by vote recorder or delegate
     * @param proposalId The ID of the proposal to resolve
     */
    function resolveProposal(uint256 proposalId) external nonReentrant {
        // Access control
        require(
            msg.sender == VOTE_RECORDER || msg.sender == delegate,
            "Only vote recorder or delegate can resolve proposals"
        );

        // Checks
        require(proposalOutcomes[proposalId] == ProposalOutcome.NotResolved, "Proposal already resolved");
        require(proposalCreationTime[proposalId] > 0, "Proposal does not exist");
        
        // Verify proposal exists in Governor
        try COMPOUND_GOVERNOR.state(proposalId) returns (IGovernor.ProposalState state) {
            require(
                state == IGovernor.ProposalState.Succeeded || 
                state == IGovernor.ProposalState.Defeated || 
                state == IGovernor.ProposalState.Expired ||
                state == IGovernor.ProposalState.Canceled ||
                state == IGovernor.ProposalState.Executed, 
                "Proposal not yet resolved"
            );

            // Determine the winning support based on the proposal state
            uint8 winningSupport;
            if (state == IGovernor.ProposalState.Succeeded || 
                state == IGovernor.ProposalState.Executed) {
                winningSupport = 1; // For won
            } else {
                winningSupport = 0; // Against won (includes Defeated, Expired, Canceled)
            }

            proposalOutcomes[proposalId] = winningSupport == 1 ? ProposalOutcome.ForWon : ProposalOutcome.AgainstWon;
            
            // Transfer winning stakes to the delegate if they voted correctly
            if (delegateVoted[proposalId] && delegateVoteDirection[proposalId] == winningSupport) {
                if (winningSupport == 1 && totalStakesFor[proposalId] > 0) {
                    // FOR stakers win, transfer their stakes to delegate
                    COMP_TOKEN.transfer(delegate, totalStakesFor[proposalId]);
                } else if (winningSupport == 0 && totalStakesAgainst[proposalId] > 0) {
                    // AGAINST stakers win, transfer their stakes to delegate
                    COMP_TOKEN.transfer(delegate, totalStakesAgainst[proposalId]);
                }
            } else {
                // If delegate didn't vote or voted wrong, return all stakes to contract for reclaiming
                if (totalStakesFor[proposalId] > 0) {
                    COMP_TOKEN.transfer(address(this), totalStakesFor[proposalId]);
                }
                if (totalStakesAgainst[proposalId] > 0) {
                    COMP_TOKEN.transfer(address(this), totalStakesAgainst[proposalId]);
                }
            }
            
            emit ProposalStakeDistributed(proposalId, winningSupport);
        } catch {
            revert("Invalid proposal ID");
        }
    }

    /**
     * @notice Allows delegators to reclaim their stake after a proposal is resolved
     * @dev Can only be called after proposal is resolved with recorded outcome
     * @param proposalId The ID of the proposal to reclaim stake from
     */
    function reclaimStake(uint256 proposalId) external nonReentrant {
        // Checks
        // Check if proposal needs to be auto-resolved due to timeout
        if (proposalOutcomes[proposalId] == ProposalOutcome.NotResolved && 
            block.timestamp > proposalCreationTime[proposalId] + MAX_PROPOSAL_RESOLUTION_TIME) {
            _autoResolveProposal(proposalId);
        }

        ProposalOutcome outcome = proposalOutcomes[proposalId];
        require(outcome != ProposalOutcome.NotResolved, "Proposal not resolved yet");
        
        ProposalStake storage stake = proposalStakes[proposalId][msg.sender];
        bool isForWon = outcome == ProposalOutcome.ForWon;
        
        // Effects
        uint256 amountToReturn;
        if (isForWon) {
            // If FOR won, return AGAINST stakes
            amountToReturn = stake.againstStake;
            stake.againstStake = 0;
            totalStakesAgainst[proposalId] -= amountToReturn;
        } else {
            // If AGAINST won, return FOR stakes
            amountToReturn = stake.forStake;
            stake.forStake = 0;
            totalStakesFor[proposalId] -= amountToReturn;
        }
        
        require(amountToReturn > 0, "No stake to reclaim");
        
        // Interactions
        COMP_TOKEN.transfer(msg.sender, amountToReturn);
        
        emit LosingStakeReclaimed(msg.sender, proposalId, amountToReturn);
    }

    /**
     * @notice Automatically resolves a proposal that has exceeded the maximum resolution time
     * @dev Internal function called by reclaimStake when timeout is reached
     * @param proposalId The ID of the proposal to auto-resolve
     */
    function _autoResolveProposal(uint256 proposalId) internal {
        IGovernor.ProposalState state = COMPOUND_GOVERNOR.state(proposalId);
        
        // If proposal is still active/pending after timeout, consider it defeated
        if (state == IGovernor.ProposalState.Active || 
            state == IGovernor.ProposalState.Pending) {
            proposalOutcomes[proposalId] = ProposalOutcome.AgainstWon;
            
            // Transfer winning stakes to the delegate if they voted correctly
            if (delegateVoted[proposalId] && delegateVoteDirection[proposalId] == 0) {
                if (totalStakesAgainst[proposalId] > 0) {
                    // AGAINST stakers win, transfer their stakes to delegate
                    COMP_TOKEN.transfer(delegate, totalStakesAgainst[proposalId]);
                }
            }
            
            emit ProposalAutoResolved(proposalId, 0);
        } else {
            // Otherwise, resolve based on actual state
            uint8 winningSupport = (state == IGovernor.ProposalState.Succeeded || 
                                  state == IGovernor.ProposalState.Executed) ? 1 : 0;
            proposalOutcomes[proposalId] = winningSupport == 1 ? ProposalOutcome.ForWon : ProposalOutcome.AgainstWon;
            
            // Transfer winning stakes to the delegate if they voted correctly
            if (delegateVoted[proposalId] && delegateVoteDirection[proposalId] == winningSupport) {
                if (winningSupport == 1 && totalStakesFor[proposalId] > 0) {
                    // FOR stakers win, transfer their stakes to delegate
                    COMP_TOKEN.transfer(delegate, totalStakesFor[proposalId]);
                } else if (winningSupport == 0 && totalStakesAgainst[proposalId] > 0) {
                    // AGAINST stakers win, transfer their stakes to delegate
                    COMP_TOKEN.transfer(delegate, totalStakesAgainst[proposalId]);
                }
            }
            
            emit ProposalAutoResolved(proposalId, winningSupport);
        }
    }

    /**
     * @notice Updates the latest proposal ID and tracks its state
     * @param proposalId The proposal ID to check
     */
    function _updateLatestProposalId(uint256 proposalId) internal {
        if (proposalId > latestProposalId) {
            latestProposalId = proposalId;
            emit NewProposalDetected(proposalId);
        }

        // Check and update proposal state
        try COMPOUND_GOVERNOR.state(proposalId) returns (IGovernor.ProposalState state) {
            bool isActive = state == IGovernor.ProposalState.Active || 
                           state == IGovernor.ProposalState.Pending;
            
            if (isActive && !activeProposals[proposalId]) {
                activeProposals[proposalId] = true;
                emit ProposalActivated(proposalId);
                emit ProposalStateChanged(proposalId, IGovernor.ProposalState.Pending, state);
            } else if (!isActive && activeProposals[proposalId]) {
                activeProposals[proposalId] = false;
                emit ProposalDeactivated(proposalId);
                emit ProposalStateChanged(proposalId, IGovernor.ProposalState.Active, state);
            }

            // Check if proposal is about to start (within 1 day)
            try COMPOUND_GOVERNOR.proposalSnapshot(proposalId) returns (uint256 startBlock) {
                uint256 currentBlock = block.number;
                if (startBlock > currentBlock && startBlock - currentBlock < blocksPerDay) {
                    pendingProposals[proposalId] = true;
                } else {
                    pendingProposals[proposalId] = false;
                }
            } catch {
                pendingProposals[proposalId] = false;
            }
        } catch {
            // If proposal doesn't exist, mark it as inactive
            if (activeProposals[proposalId]) {
                activeProposals[proposalId] = false;
                emit ProposalDeactivated(proposalId);
            }
            pendingProposals[proposalId] = false;
        }
    }

    /**
     * @notice Checks if there are any active or pending proposals
     * @dev Includes gas limit protection to prevent excessive gas usage
     * @return bool True if there are any active or pending proposals
     */
    function _hasActiveOrPendingProposals() internal view returns (bool) {
        // Check the last 10 proposals for active status
        uint256 startId = latestProposalId;
        uint256 endId = startId > 10 ? startId - 10 : 0;
        uint256 gasUsed = gasleft();
        
        for (uint256 i = startId; i > endId; i--) {
            // Prevent excessive gas usage
            if (gasUsed - gasleft() > 50000) {
                break;
            }
            
            if (activeProposals[i] || pendingProposals[i]) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Proposes a new vote recorder address
     * @dev Can be called by the owner (delegate) to suggest a new vote recorder
     * @param newVoteRecorder The address of the new vote recorder
     */
    function proposeVoteRecorderUpdate(address newVoteRecorder) external onlyOwner {
        require(newVoteRecorder != address(0), "Invalid vote recorder address");
        require(newVoteRecorder != VOTE_RECORDER, "New vote recorder must be different");
        require(block.timestamp >= voteRecorderLastUpdate + VOTE_RECORDER_UPDATE_DELAY, "Too soon to update");
        
        pendingVoteRecorder = newVoteRecorder;
        voteRecorderUpdateTime = block.timestamp + VOTE_RECORDER_UPDATE_DELAY;
        voteRecorderUpdateProposer = msg.sender;
        
        emit VoteRecorderUpdateInitiated(msg.sender, newVoteRecorder, voteRecorderUpdateTime);
    }

    function confirmVoteRecorderUpdate() external onlyOwner {
        require(pendingVoteRecorder != address(0), "No pending update");
        require(block.timestamp >= voteRecorderUpdateTime, "Update not ready");
        
        address oldRecorder = VOTE_RECORDER;
        VOTE_RECORDER = pendingVoteRecorder;
        voteRecorderLastUpdate = block.timestamp;
        pendingVoteRecorder = address(0);
        voteRecorderUpdateTime = 0;
        voteRecorderUpdateProposer = address(0);
        
        emit VoteRecorderUpdated(oldRecorder, VOTE_RECORDER, msg.sender);
    }

    function cancelVoteRecorderUpdate() external onlyOwner {
        require(pendingVoteRecorder != address(0), "No pending update");
        
        address cancelledRecorder = pendingVoteRecorder;
        pendingVoteRecorder = address(0);
        voteRecorderUpdateTime = 0;
        voteRecorderUpdateProposer = address(0);
        
        emit VoteRecorderUpdateCancelled(msg.sender, cancelledRecorder);
    }

    /**
     * @notice Records the delegate's vote direction for a proposal
     * @dev Called by off-chain service that monitors VoteCast events
     * @param proposalId The ID of the proposal
     * @param support The vote direction (0 = Against, 1 = For, 2 = Abstain)
     * @param voteBlock The block number when the vote was cast
     * @param voteTransactionHash The transaction hash of the vote
     */
    function recordDelegateVote(
        uint256 proposalId,
        uint8 support,
        uint256 voteBlock,
        bytes32 voteTransactionHash
    ) external {
        // Access control
        require(msg.sender == VOTE_RECORDER, "Only vote recorder can record votes");

        // Basic checks
        require(support <= 2, "Invalid support value");
        require(!delegateVoted[proposalId], "Vote already recorded");
        require(voteBlock > 0, "Invalid vote block");
        require(voteBlock <= block.number, "Vote block cannot be in future");
        require(block.number - voteBlock <= 100, "Vote too old");
        require(voteTransactionHash != bytes32(0), "Invalid transaction hash");
        
        // Verify proposal exists and is in a valid state
        IGovernor.ProposalState state = COMPOUND_GOVERNOR.state(proposalId);
        require(
            state == IGovernor.ProposalState.Active || 
            state == IGovernor.ProposalState.Succeeded || 
            state == IGovernor.ProposalState.Defeated || 
            state == IGovernor.ProposalState.Expired ||
            state == IGovernor.ProposalState.Canceled ||
            state == IGovernor.ProposalState.Executed,
            "Invalid proposal state"
        );

        // Verify delegate has voted
        bool hasVoted = COMPOUND_GOVERNOR.hasVoted(proposalId, delegate);
        require(hasVoted, "Delegate has not voted");

        // Record the vote
        delegateVoted[proposalId] = true;
        delegateVoteDirection[proposalId] = support;
        
        // Emit events
        emit DelegateVotingVerified(proposalId, true, support);
        emit DelegateVoteRecorded(proposalId, support, block.timestamp, msg.sender);
    }

    /**
     * @notice Updates the number of blocks per day for proposal timing calculations
     * @dev Can be called by owner to adjust for different networks
     * @param _blocksPerDay The new number of blocks per day
     */
    function setBlocksPerDay(uint256 _blocksPerDay) external onlyOwner {
        require(_blocksPerDay > 0 && _blocksPerDay < 50000, "Invalid blocks per day");
        blocksPerDay = _blocksPerDay;
    }

    //////////////////////////
    // Internal Functions
    //////////////////////////

    // Reward-related functions
    /**
     * @notice Internal function to update a user's rewards without claiming
     * @dev Updates the user's unclaimed rewards and sets a new checkpoint
     * @param delegator The address of the delegator to update rewards for
     */
    function _updateUserRewards(address delegator) private {
        // Cache state variables to prevent reentrancy
        uint256 userBalance = balanceOf(delegator);
        uint256 currentRewardIndex = rewardIndex;
        uint256 userStartIndex = startRewardIndex[delegator];
        
        if (userBalance > 0) {
            // Calculate new rewards using cached values
            uint256 newRewards = userBalance * (currentRewardIndex - userStartIndex) / REWARD_PRECISION;
            
            if (newRewards > 0) {
                // Update state before any potential external calls
                unclaimedRewards[delegator] += newRewards;
                startRewardIndex[delegator] = currentRewardIndex;
                
                emit UserRewardsUpdated(delegator, newRewards, unclaimedRewards[delegator]);
            }
        }
    }

    /**
     * @notice Updates the reward index based on elapsed time and reward rate
     * @dev Caps rewards to available funds to prevent overdistribution
     * @dev Relies on Solidity 0.8.x built-in overflow protection for arithmetic operations
     */
    function _updateRewardsIndex() private {
        // Cache state variables to prevent reentrancy
        uint256 supply = totalSupply();
        uint256 currentRewardRate = rewardRate;
        uint256 currentAvailableRewards = availableRewards;
        uint256 currentTotalPendingRewards = totalPendingRewards;
        uint256 currentRewardIndex = rewardIndex;
        uint256 currentLastRewarded = lastRewarded;
        
        // Early return if no delegators exist
        if (supply == 0) {
            lastRewarded = block.timestamp;
            return;
        }

        // Calculate new rewards using cached values
        uint256 timeDelta = block.timestamp - currentLastRewarded;
        uint256 rewards = timeDelta * currentRewardRate;
        
        // Cap rewards to available funds
        if (currentAvailableRewards <= currentTotalPendingRewards) {
            // No new rewards can be distributed
            lastRewarded = block.timestamp;
            emit RewardIndexUpdated(currentRewardIndex, 0);
            return;
        }
        
        uint256 availableForNewRewards = currentAvailableRewards - currentTotalPendingRewards;
        
        // Cap rewards to available funds
        if (rewards > availableForNewRewards) {
            rewards = availableForNewRewards;
        }
        
        // Update accounting using cached values
        uint256 rewardDelta = (rewards * REWARD_PRECISION) / supply;
        uint256 newRewardIndex = currentRewardIndex + rewardDelta;
        uint256 newTotalPendingRewards = currentTotalPendingRewards + rewards;
        
        // Update state before any potential external calls
        rewardIndex = newRewardIndex;
        totalPendingRewards = newTotalPendingRewards;
        lastRewarded = block.timestamp;
        
        emit RewardIndexUpdated(newRewardIndex, rewards);
        emit RewardsDistributed(rewards, newRewardIndex, block.timestamp);
    }

    /**
     * @notice Returns the current rewards index, adjusted for time since last rewarded
     * @dev Used for view functions to calculate pending rewards
     */
    function _getCurrentRewardsIndex() private view returns (uint256) {
        // Cache frequently accessed storage variables
        uint256 currentAvailableRewards = availableRewards;
        uint256 currentTotalPendingRewards = totalPendingRewards;
        uint256 currentRewardIndex = rewardIndex;
        uint256 currentRewardRate = rewardRate;
        
        if (currentAvailableRewards <= currentTotalPendingRewards) {
            return currentRewardIndex;
        }
        
        uint256 timeDelta = block.timestamp - lastRewarded;
        uint256 potentialRewards = timeDelta * currentRewardRate;
        uint256 supply = totalSupply();
        
        // Cap rewards to remaining available funds
        uint256 remainingRewards = currentAvailableRewards - currentTotalPendingRewards;
        uint256 actualRewards = potentialRewards > remainingRewards 
            ? remainingRewards 
            : potentialRewards;

        if (supply > 0) {
            return currentRewardIndex + (actualRewards * REWARD_PRECISION) / supply;
        }
        return currentRewardIndex;
    }
}
