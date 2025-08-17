// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.30;

import {IComp} from "./IComp.sol";
import {IGovernor} from "./IGovernor.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Interface for the factory contract
interface CompensatorFactory {
    function onOwnershipTransferred(address oldOwner, address newOwner) external;
}

// Custom Errors
error InvalidCompTokenAddress();
error InvalidCompoundGovernorAddress();
error InvalidOwnerAddress();
error InvalidCompTotalSupply();
error DelegationCapTooSmall();
error VoteIndexOutOfBounds();
error AmountMustBeGreaterThanZero();
error AmountExceedsAvailableRewards();
error RewardRateMustBeNonNegative();
error NewRateMustBeDifferent();
error RewardRateTooHigh();
error InvalidSupportValue();
error AlreadyVotedOnProposal();
error InvalidProposalState();
error ProposalAlreadyResolved();
error ProposalDoesNotExist();
error ProposalNotResolvedYet();
error NoStakeToReclaim();
error InvalidBlocksPerDay();
error NewOwnerCannotBeZeroAddress();
error CompIsLocked();
error CannotWithdrawWithActiveStakes();
error InsufficientBalance();
error NoRewardsToClaim();
error DelegationCapExceeded();
error StakingOnlyAllowedForActiveProposals();
error InvalidProposalId();
error CompensatorTokensNotTransferable();

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

    /// @notice Structure to track vote information
    struct VoteInfo {
        /// @notice The direction of the vote (0 = Against, 1 = For)
        uint8 direction;
        /// @notice The block number when the vote was cast
        uint256 blockNumber;
        /// @notice The transaction hash of the vote
        bytes32 txHash;
        /// @notice The timestamp when the vote was cast
        uint256 timestamp;
        /// @notice The voting power used for this vote
        uint256 votingPower;
        /// @notice The reason for the vote (optional)
        string reason;
    }

    /// @notice Structure to track delegate performance
    struct DelegateInfo {
        /// @notice Number of successful votes
        uint256 successfulVotes;
        /// @notice Number of total votes cast
        uint256 totalVotes;
        /// @notice Total rewards earned from successful votes
        uint256 totalRewardsEarned;
        /// @notice Total voting power used across all votes
        uint256 totalVotingPowerUsed;
        /// @notice Average voting power per vote
        uint256 averageVotingPowerPerVote;
    }

    //////////////////////////
    // State Variables
    //////////////////////////

    /// @notice The COMP governance token contract
    IComp public immutable COMP_TOKEN;

    /// @notice The Compound Governor contract
    IGovernor public immutable COMPOUND_GOVERNOR;

    /// @notice The factory contract that created this Compensator
    address public immutable FACTORY;

    /// @notice The amount of COMP deposited by the owner available for rewards to delegators
    uint256 public availableRewards;

    /// @notice The rate at which COMP is distributed to delegators (COMP per second)
    uint256 public rewardRate;

    /// @notice Current reward index used for distributing COMP rewards to delegators
    uint256 public rewardIndex;

    /// @notice Timestamp of the last time rewards were claimed (i.e. the rewardIndex was updated)
    uint256 public lastRewarded;

    /// @notice Total amount of COMP delegated to this contract
    uint256 public totalDelegatedCOMP;

    /// @notice Cap on the amount of COMP that can be delegated to this contract (5% of total COMP supply)
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

    /// @notice Tracks whether the contract has voted on a proposal
    mapping(uint256 proposalId => bool hasVoted) public contractVoted;

    /// @notice Tracks the contract's vote direction on a proposal
    mapping(uint256 proposalId => uint8 direction) public contractVoteDirection;

    /// @notice Precision factor for reward calculations (18 decimals)
    uint256 public constant REWARD_PRECISION = 1e18;

    /// @notice Percentage basis points (100%)
    uint256 public constant BASIS_POINTS = 10000; // 100% = 10000 basis points

    /// @notice Number of blocks per day for proposal timing calculations
    /// @dev Default is 6500 blocks per day (mainnet)
    uint256 public blocksPerDay = 6500;

    /// @notice Mapping to track vote information for each proposal
    mapping(uint256 proposalId => VoteInfo voteInfo) public voteInfo;

    /// @notice Mapping to track proposal IDs by vote index (for enumeration)
    mapping(uint256 voteIndex => uint256 proposalId) public voteIndexToProposalId;
    uint256 public voteCount;

    /// @notice Mapping to track delegate performance
    DelegateInfo public delegateInfo;

    /// @notice Additional lock period extension when active proposals exist (3 days)
    uint256 public constant ACTIVE_PROPOSAL_LOCK_EXTENSION = 3 days;

    /// @notice Number of recent proposals to check for active status
    uint256 public constant RECENT_PROPOSALS_CHECK_COUNT = 10;

    /// @notice Gas limit for proposal status checking to prevent excessive gas usage
    uint256 public constant PROPOSAL_CHECK_GAS_LIMIT = 50000;

    /// @notice Maximum blocks per day limit for validation
    uint256 public constant MAX_BLOCKS_PER_DAY = 50000;

    /// @notice Maximum reward rate (100% APR max)
    uint256 public constant MAX_REWARD_RATE = 3.17e10; // 100% APR max (1 COMP per year per 1 COMP staked)

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

    /// @notice Emitted when the owner deposits COMP into the contract
    /// @param owner The address of the owner depositing COMP
    /// @param amount The amount of COMP being deposited
    event OwnerDeposit(address indexed owner, uint256 amount);

    /// @notice Emitted when the owner withdraws COMP from the contract
    /// @param owner The address of the owner withdrawing COMP
    /// @param amount The amount of COMP being withdrawn
    event OwnerWithdraw(address indexed owner, uint256 amount);

    /// @notice Emitted when the owner updates the reward rate
    /// @param owner The address of the owner updating the rate
    /// @param newRate The new reward rate in COMP per second
    event RewardRateUpdate(address indexed owner, uint256 newRate);

    /// @notice Emitted when a user deposits COMP
    event UserDeposit(address indexed user, uint256 amount);

    /// @notice Emitted when a user withdraws COMP
    event UserWithdraw(address indexed user, uint256 amount);

    /// @notice Emitted when a user stakes COMP on a proposal
    event ProposalStaked(address indexed user, uint256 proposalId, uint8 support, uint256 amount);

    /// @notice Emitted when a user reclaims their losing stake
    event StakeReclaimed(address indexed user, uint256 proposalId, uint256 amount);

    /// @notice Emitted when a user claims their rewards
    event ClaimRewards(address indexed user, uint256 amount);

    /// @notice Emitted when delegate performance is updated
    event DelegatePerformanceUpdated(
        uint256 successfulVotes,
        uint256 totalVotes,
        uint256 totalRewardsEarned
    );

    /// @notice Emitted when stakes are distributed after a proposal is resolved
    event ProposalStakeDistributed(uint256 indexed proposalId, uint8 indexed winningSupport);

    /// @notice Emitted when a vote is cast
    event VoteCast(
        uint256 indexed proposalId,
        uint8 support,
        uint256 blockNumber,
        bytes32 txHash,
        uint256 votingPower,
        string reason
    );

    /// @notice Emitted when a user's rewards are updated
    /// @param user The address of the user whose rewards were updated
    /// @param newRewards The amount of new rewards accrued
    /// @param totalUnclaimed The total amount of unclaimed rewards after the update
    event UserRewardsUpdated(address indexed user, uint256 newRewards, uint256 totalUnclaimed);

    /// @notice Emitted when the global reward index is updated
    /// @param newRewardIndex The new reward index value
    /// @param rewardsAccrued The amount of rewards accrued in this update
    event RewardIndexUpdated(uint256 newRewardIndex, uint256 rewardsAccrued);

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

    /// @notice Emitted when rewards are distributed to users
    event RewardsDistributed(
        uint256 totalRewards,
        uint256 rewardIndex,
        uint256 timestamp
    );

    //////////////////////////
    // Constructor
    //////////////////////////

    /**
     * @notice Constructor that initializes the contract
     * @param _compToken The address of the COMP token contract
     * @param _compoundGovernor The address of the Compound Governor contract
     * @param _owner The address of the owner for factory deployment
     */
    constructor(
        address _compToken,
        address _compoundGovernor,
        address _owner
    ) ERC20("Compensator", "COMPENSATOR") Ownable(_owner) {
        if (_compToken == address(0)) revert InvalidCompTokenAddress();
        if (_compoundGovernor == address(0)) revert InvalidCompoundGovernorAddress();
        if (_owner == address(0)) revert InvalidOwnerAddress();
        
        COMP_TOKEN = IComp(_compToken);
        COMPOUND_GOVERNOR = IGovernor(_compoundGovernor);
        FACTORY = msg.sender; // The factory that deploys this contract
        
        rewardIndex = REWARD_PRECISION; // Initialize reward index at 1 with 18 decimals

        // Set the delegation cap to 5% of the total COMP supply
        uint256 totalSupply = COMP_TOKEN.totalSupply();
        if (totalSupply == 0) revert InvalidCompTotalSupply();
        uint256 oldCap = delegationCap;
        delegationCap = (totalSupply * DELEGATION_CAP_PERCENT) / BASIS_POINTS;
        if (delegationCap == 0) revert DelegationCapTooSmall();
        
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
     * @notice Returns the contract's current voting power
     * @return The amount of COMP delegated to this contract
     */
    function getContractVotingPower() external view returns (uint256) {
        return COMP_TOKEN.getCurrentVotes(address(this));
    }

    /**
     * @notice Returns the contract's voting power at a specific block
     * @return The amount of COMP delegated to this contract at that block
     */
    function getContractVotingPowerAt(uint256) external view returns (uint256) {
        return COMP_TOKEN.getCurrentVotes(address(this));
    }

    /**
     * @notice Returns the vote information for a specific proposal
     * @param proposalId The ID of the proposal
     * @return direction The vote direction (0 = Against, 1 = For)
     * @return blockNumber The block number when the vote was cast
     * @return txHash The transaction hash of the vote
     * @return timestamp The timestamp when the vote was cast
     * @return votingPower The voting power used for this vote
     * @return reason The reason for the vote
     */
    function getVoteInfo(uint256 proposalId) external view returns (
        uint8 direction,
        uint256 blockNumber,
        bytes32 txHash,
        uint256 timestamp,
        uint256 votingPower,
        string memory reason
    ) {
        VoteInfo memory info = voteInfo[proposalId];
        return (info.direction, info.blockNumber, info.txHash, info.timestamp, info.votingPower, info.reason);
    }

    /**
     * @notice Returns the vote information for a specific vote by index
     * @param voteIndex The index of the vote in the vote tracking array
     * @return direction The vote direction (0 = Against, 1 = For)
     * @return blockNumber The block number when the vote was cast
     * @return txHash The transaction hash of the vote
     * @return timestamp The timestamp when the vote was cast
     * @return votingPower The voting power used for this vote
     * @return reason The reason for the vote
     */
    function getVoteByIndex(uint256 voteIndex) external view returns (
        uint8 direction,
        uint256 blockNumber,
        bytes32 txHash,
        uint256 timestamp,
        uint256 votingPower,
        string memory reason
    ) {
        if (voteIndex >= voteCount) revert VoteIndexOutOfBounds();
        uint256 proposalId = voteIndexToProposalId[voteIndex];
        VoteInfo memory info = voteInfo[proposalId];
        return (info.direction, info.blockNumber, info.txHash, info.timestamp, info.votingPower, info.reason);
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

    // Owner functions
    /**
     * @notice Allows the owner to deposit COMP to be used for rewards
     * @dev Updates reward index before increasing available rewards
     * @param amount The amount of COMP to deposit
     */
    function ownerDeposit(uint256 amount) external onlyOwner nonReentrant {
        // Checks
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        
        // Effects
        _updateRewardsIndex();
        availableRewards += amount;
        
        // Interactions
        COMP_TOKEN.transferFrom(owner(), address(this), amount);
        
        emit OwnerDeposit(owner(), amount);
    }

    /**
     * @notice Allows the owner to withdraw COMP from the contract
     * @dev Ensures sufficient funds remain for pending rewards before withdrawal
     * @param amount The amount of COMP to withdraw
     */
    function ownerWithdraw(uint256 amount) external onlyOwner nonReentrant {
        // Effects - Update rewards index FIRST to ensure accurate accounting
        _updateRewardsIndex();
        
        // Cache frequently accessed storage variables AFTER updating rewards
        uint256 currentAvailableRewards = availableRewards;
        uint256 currentTotalPendingRewards = totalPendingRewards;
        address currentOwner = owner();
        
        uint256 withdrawableAmount = currentAvailableRewards - currentTotalPendingRewards;
        if (amount > withdrawableAmount) revert AmountExceedsAvailableRewards();
        
        // Update available rewards
        availableRewards = currentAvailableRewards - amount;
        
        // Interactions
        COMP_TOKEN.transfer(currentOwner, amount);
        
        emit OwnerWithdraw(currentOwner, amount);
    }

    /**
     * @notice Allows the owner to update the reward rate
     * @dev Updates reward index before changing rate to ensure proper accounting
     * @param newRate The new reward rate in COMP per second
     */
    function setRewardRate(uint256 newRate) external onlyOwner {
        // Checks
        if (newRate == rewardRate) revert NewRateMustBeDifferent();
        if (newRate > MAX_REWARD_RATE) revert RewardRateTooHigh(); // Prevent setting extremely high rates
        
        // Effects
        _updateRewardsIndex();
        rewardRate = newRate;
        
        // Interactions
        // No external calls
        
        emit RewardRateUpdate(owner(), newRate);
    }

    /**
     * @notice Allows the owner to cast a vote on a proposal
     * @dev Uses the contract's accumulated voting power
     * @param proposalId The ID of the proposal to vote on
     * @param support The vote direction (0 = Against, 1 = For)
     * @param reason Optional reason for the vote
     */
    function castVote(uint256 proposalId, uint8 support, string calldata reason) external onlyOwner nonReentrant {
        _castVote(proposalId, support, reason);
    }

    /**
     * @notice Allows the owner to cast a vote on a proposal (without reason)
     * @dev Uses the contract's accumulated voting power
     * @param proposalId The ID of the proposal to vote on
     * @param support The vote direction (0 = Against, 1 = For)
     */
    function castVote(uint256 proposalId, uint8 support) external onlyOwner nonReentrant {
        _castVote(proposalId, support, "");
    }

    function _castVote(uint256 proposalId, uint8 support, string memory reason) private {
        // Checks
        if (support > 1) revert InvalidSupportValue();
        if (contractVoted[proposalId]) revert AlreadyVotedOnProposal();
        
        // Verify proposal exists and is in a valid state
        IGovernor.ProposalState state = COMPOUND_GOVERNOR.state(proposalId);
        if (
            state != IGovernor.ProposalState.Active && 
            state != IGovernor.ProposalState.Pending
        ) revert InvalidProposalState();

        // Get the contract's voting power
        uint256 votingPower = COMP_TOKEN.getCurrentVotes(address(this));

        // Effects
        contractVoted[proposalId] = true;
        contractVoteDirection[proposalId] = support;
        
        // Store vote information
        VoteInfo memory newVote = VoteInfo({
            direction: support,
            blockNumber: block.number,
            txHash: bytes32(0), // Will be set after the vote
            timestamp: block.timestamp,
            votingPower: votingPower,
            reason: reason
        });
        
        voteInfo[proposalId] = newVote;
        
        // Add to vote index tracking
        voteIndexToProposalId[voteCount] = proposalId;
        voteCount++;
        
        // Update delegate performance metrics
        delegateInfo.totalVotingPowerUsed += votingPower;
        delegateInfo.averageVotingPowerPerVote = delegateInfo.totalVotingPowerUsed / voteCount;
        
        // Interactions
        // The contract's voting power is automatically used since it's delegated to itself
        COMPOUND_GOVERNOR.castVote(proposalId, support);
        
        // Update the transaction hash after the vote
        voteInfo[proposalId].txHash = blockhash(block.number - 1);
        
        emit VoteCast(proposalId, support, block.number, voteInfo[proposalId].txHash, votingPower, reason);
    }

    // Delegator functions
    /**
     * @notice Allows a user to deposit COMP into the contract
     * @dev Delegates voting power to the contract itself
     * @param amount The amount of COMP to deposit
     */
    function userDeposit(uint256 amount) external nonReentrant {
        // Checks
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        if (totalDelegatedCOMP + amount > delegationCap) revert DelegationCapExceeded();
        
        // Effects
        _updateRewardsIndex();
        _updateUserRewards(msg.sender);
        
        // Set unlock time based on active proposals
        uint256 newUnlockTime = block.timestamp + MIN_LOCK_PERIOD;
        
        // Only extend lock if user doesn't already have an extended lock
        if (_hasRelevantActiveProposals() && unlockTime[msg.sender] <= block.timestamp + MIN_LOCK_PERIOD) {
            newUnlockTime = block.timestamp + MIN_LOCK_PERIOD + ACTIVE_PROPOSAL_LOCK_EXTENSION;
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
        // Delegate voting power to the contract itself
        COMP_TOKEN.delegate(address(this));
        
        emit UserDeposit(msg.sender, amount);
    }

    /**
     * @notice Allows a user to withdraw COMP from the contract
     * @dev Claims pending rewards before processing withdrawal
     * @param amount The amount of COMP to withdraw
     */
    function userWithdraw(uint256 amount) external nonReentrant {
        // Checks
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        if (block.timestamp < unlockTime[msg.sender]) revert CompIsLocked();
        if (_hasUserActiveStakes(msg.sender)) revert CannotWithdrawWithActiveStakes();
        if (amount > balanceOf(msg.sender)) revert InsufficientBalance();
        
        // Effects
        _updateRewardsIndex();
        _updateUserRewards(msg.sender);
        
        _burn(msg.sender, amount);
        totalDelegatedCOMP -= amount;
        startRewardIndex[msg.sender] = rewardIndex;
        
        // Interactions
        COMP_TOKEN.transfer(msg.sender, amount);
        
        emit UserWithdraw(msg.sender, amount);
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
        if (amount == 0) revert NoRewardsToClaim();
        
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
        if (support != 0 && support != 1) revert InvalidSupportValue();
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        if (proposalOutcomes[proposalId] != ProposalOutcome.NotResolved) revert ProposalAlreadyResolved();

        IGovernor.ProposalState state = COMPOUND_GOVERNOR.state(proposalId);
        if (state != IGovernor.ProposalState.Active) revert StakingOnlyAllowedForActiveProposals();

        // Effects
        _updateLatestProposalId(proposalId);

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
     * @dev Can be called by anyone to resolve a proposal
     * @param proposalId The ID of the proposal to resolve
     */
    function resolveProposal(uint256 proposalId) external nonReentrant {
        // Checks
        if (proposalOutcomes[proposalId] != ProposalOutcome.NotResolved) revert ProposalAlreadyResolved();
        if (proposalCreationTime[proposalId] == 0) revert ProposalDoesNotExist();
        
        // Verify proposal exists in Governor
        try COMPOUND_GOVERNOR.state(proposalId) returns (IGovernor.ProposalState state) {
            if (
                state != IGovernor.ProposalState.Succeeded && 
                state != IGovernor.ProposalState.Defeated && 
                state != IGovernor.ProposalState.Expired &&
                state != IGovernor.ProposalState.Canceled &&
                state != IGovernor.ProposalState.Executed
            ) revert ProposalNotResolvedYet();

            // Determine the winning support based on the proposal state
            uint8 winningSupport;
            if (state == IGovernor.ProposalState.Succeeded || 
                state == IGovernor.ProposalState.Executed) {
                winningSupport = 1; // For won
            } else {
                winningSupport = 0; // Against won (includes Defeated, Expired, Canceled)
            }

            _resolveProposalInternal(proposalId, winningSupport, false);
        } catch {
            revert InvalidProposalId();
        }
    }

    /**
     * @notice Allows delegators to reclaim their losing stake after a proposal is resolved
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
        if (outcome == ProposalOutcome.NotResolved) revert ProposalNotResolvedYet();
        
        ProposalStake storage stake = proposalStakes[proposalId][msg.sender];
        bool isForWon = outcome == ProposalOutcome.ForWon;
        
        // Effects
        uint256 amountToReturn;
        if (isForWon) {
            // If FOR won, return AGAINST stakes (losing stakes)
            amountToReturn = stake.againstStake;
            stake.againstStake = 0;
            totalStakesAgainst[proposalId] -= amountToReturn;
        } else {
            // If AGAINST won, return FOR stakes (losing stakes)
            amountToReturn = stake.forStake;
            stake.forStake = 0;
            totalStakesFor[proposalId] -= amountToReturn;
        }
        
        if (amountToReturn == 0) revert NoStakeToReclaim();
        
        // Interactions
        COMP_TOKEN.transfer(msg.sender, amountToReturn);
        
        emit StakeReclaimed(msg.sender, proposalId, amountToReturn);
    }

    /**
     * @notice Automatically resolves a proposal that has exceeded the maximum resolution time
     * @dev Internal function called by reclaimStake when timeout is reached
     * @param proposalId The ID of the proposal to auto-resolve
     */
    function _autoResolveProposal(uint256 proposalId) private {
        IGovernor.ProposalState state = COMPOUND_GOVERNOR.state(proposalId);
        
        // If proposal is still active/pending after timeout, consider it defeated
        if (state == IGovernor.ProposalState.Active || 
            state == IGovernor.ProposalState.Pending) {
            _resolveProposalInternal(proposalId, 0, true);
        } else {
            // Otherwise, resolve based on actual state
            uint8 winningSupport = (state == IGovernor.ProposalState.Succeeded || 
                                  state == IGovernor.ProposalState.Executed) ? 1 : 0;
            _resolveProposalInternal(proposalId, winningSupport, true);
        }
    }

    /**
     * @notice Internal function to resolve a proposal and distribute stakes
     * @param proposalId The ID of the proposal to resolve
     * @param winningSupport The winning support (0 = Against, 1 = For)
     * @param isAutoResolved Whether this is an auto-resolution
     */
    function _resolveProposalInternal(uint256 proposalId, uint8 winningSupport, bool isAutoResolved) internal {
        proposalOutcomes[proposalId] = winningSupport == 1 ? ProposalOutcome.ForWon : ProposalOutcome.AgainstWon;
        
        // Verify if the delegate voted correctly
        bool delegateVotedCorrectly = contractVoted[proposalId] && 
                                    contractVoteDirection[proposalId] == winningSupport;

        if (delegateVotedCorrectly) {
            // Delegate voted correctly - 100% of winning stakes go to delegate
            if (winningSupport == 1) {
                // FOR won
                if (totalStakesFor[proposalId] > 0) {
                    // 100% of winning FOR stakes go to the delegate
                    COMP_TOKEN.transfer(owner(), totalStakesFor[proposalId]);
                    if (!isAutoResolved) {
                        delegateInfo.successfulVotes += 1;
                        delegateInfo.totalRewardsEarned += totalStakesFor[proposalId];
                    }
                }
                // Losing AGAINST stakes are returned to delegators in reclaimStake
            } else {
                // AGAINST won
                if (totalStakesAgainst[proposalId] > 0) {
                    // 100% of winning AGAINST stakes go to the delegate
                    COMP_TOKEN.transfer(owner(), totalStakesAgainst[proposalId]);
                    if (!isAutoResolved) {
                        delegateInfo.successfulVotes += 1;
                        delegateInfo.totalRewardsEarned += totalStakesAgainst[proposalId];
                    }
                }
                // Losing FOR stakes are returned to delegators in reclaimStake
            }
        } else {
            // Delegate didn't vote or voted wrong
            // All stakes remain in the contract and are returned to delegators via reclaimStake
        }

        if (!isAutoResolved) {
            // Update delegate's total votes
            delegateInfo.totalVotes += 1;
            
            emit DelegatePerformanceUpdated(
                delegateInfo.successfulVotes,
                delegateInfo.totalVotes,
                delegateInfo.totalRewardsEarned
            );
            emit ProposalStakeDistributed(proposalId, winningSupport);
        } else {
            emit ProposalAutoResolved(proposalId, winningSupport);
        }
    }

    /**
     * @notice Updates the latest proposal ID and tracks its state
     * @param proposalId The proposal ID to check
     */
    function _updateLatestProposalId(uint256 proposalId) private {
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

            // Set proposal creation time if not set
            if (proposalCreationTime[proposalId] == 0) {
                proposalCreationTime[proposalId] = block.timestamp;
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
     * @notice Checks if there are any active or pending proposals (DEPRECATED)
     * @dev This function is deprecated and kept for backward compatibility.
     *      Use _hasUserActiveStakes() for withdrawal checks and _hasRelevantActiveProposals() for lock period extensions.
     * @return bool True if there are any active or pending proposals
     */
    function _hasActiveOrPendingProposals() private view returns (bool) {
        // Check the last RECENT_PROPOSALS_CHECK_COUNT proposals for active status
        uint256 startId = latestProposalId;
        uint256 endId = startId > RECENT_PROPOSALS_CHECK_COUNT ? startId - RECENT_PROPOSALS_CHECK_COUNT : 0;
        uint256 gasUsed = gasleft();
        
        for (uint256 i = startId; i > endId; i--) {
            // Prevent excessive gas usage
            if (gasUsed - gasleft() > PROPOSAL_CHECK_GAS_LIMIT) {
                break;
            }
            
            if (activeProposals[i] || pendingProposals[i]) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Checks if a user can withdraw their COMP
     * @param user The address of the user to check
     * @return canWithdraw True if the user can withdraw
     * @return reason The reason why withdrawal is blocked (if applicable)
     */
    function canUserWithdraw(address user) external view returns (bool canWithdraw, string memory reason) {
        if (block.timestamp < unlockTime[user]) {
            return (false, "COMP is still locked");
        }
        if (_hasUserActiveStakes(user)) {
            return (false, "User has active stakes on unresolved proposals");
        }
        return (true, "User can withdraw");
    }

    /**
     * @notice Checks if a user has any active or pending stakes on proposals
     * @param user The address of the user to check
     * @return bool True if the user has active or pending stakes
     */
    function _hasUserActiveStakes(address user) private view returns (bool) {
        // Check the last RECENT_PROPOSALS_CHECK_COUNT proposals for active status
        uint256 startId = latestProposalId;
        uint256 endId = startId > RECENT_PROPOSALS_CHECK_COUNT ? startId - RECENT_PROPOSALS_CHECK_COUNT : 0;
        uint256 gasUsed = gasleft();
        
        for (uint256 i = startId; i > endId; i--) {
            // Prevent excessive gas usage
            if (gasUsed - gasleft() > PROPOSAL_CHECK_GAS_LIMIT) {
                break;
            }
            
            if (activeProposals[i] || pendingProposals[i]) {
                // If any active or pending proposal exists, check if the user has stakes
                if (proposalStakes[i][user].forStake > 0 || proposalStakes[i][user].againstStake > 0) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * @notice Checks if there are any active or pending proposals that are relevant to the user's potential staking.
     * @dev This is a more specific check to extend lock periods only for proposals that are likely to be staked on.
     * @return bool True if there are any active or pending proposals that are relevant to staking.
     */
    function _hasRelevantActiveProposals() private view returns (bool) {
        // Check the last RECENT_PROPOSALS_CHECK_COUNT proposals for active status
        uint256 startId = latestProposalId;
        uint256 endId = startId > RECENT_PROPOSALS_CHECK_COUNT ? startId - RECENT_PROPOSALS_CHECK_COUNT : 0;
        uint256 gasUsed = gasleft();
        
        for (uint256 i = startId; i > endId; i--) {
            // Prevent excessive gas usage
            if (gasUsed - gasleft() > PROPOSAL_CHECK_GAS_LIMIT) {
                break;
            }
            
            // Check if the proposal is active or pending
            if (activeProposals[i] || pendingProposals[i]) {
                // Check if the proposal is likely to be staked on
                // This is a heuristic: if it's active or pending, and not too old, it's likely relevant
                if (block.timestamp - proposalCreationTime[i] < MAX_PROPOSAL_RESOLUTION_TIME) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * @notice Updates the number of blocks per day for proposal timing calculations
     * @dev Can be called by owner to adjust for different networks
     * @param _blocksPerDay The new number of blocks per day
     */
    function setBlocksPerDay(uint256 _blocksPerDay) external onlyOwner {
        if (_blocksPerDay == 0 || _blocksPerDay >= MAX_BLOCKS_PER_DAY) revert InvalidBlocksPerDay();
        blocksPerDay = _blocksPerDay;
    }

    //////////////////////////
    // Internal Functions
    //////////////////////////

    // Reward-related functions
    /**
     * @notice Internal function to update a user's rewards without claiming
     * @dev Updates the user's unclaimed rewards and sets a new checkpoint
     * @param user The address of the user to update rewards for
     */
    function _updateUserRewards(address user) private {
        // Cache state variables to prevent reentrancy
        uint256 userBalance = balanceOf(user);
        uint256 currentRewardIndex = rewardIndex;
        uint256 userStartIndex = startRewardIndex[user];
        
        if (userBalance > 0) {
            // Calculate new rewards using cached values
            uint256 newRewards = userBalance * (currentRewardIndex - userStartIndex) / REWARD_PRECISION;
            
            if (newRewards > 0) {
                // Update state before any potential external calls
                unclaimedRewards[user] += newRewards;
                startRewardIndex[user] = currentRewardIndex;
                
                emit UserRewardsUpdated(user, newRewards, unclaimedRewards[user]);
            }
        }
    }

    /**
     * @notice Updates the reward index based on elapsed time and reward rate
     * @dev Caps rewards to available funds to prevent overdistribution
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
        uint256 currentRewardIndex = rewardIndex;
        uint256 currentRewardRate = rewardRate;
        
        if (currentAvailableRewards <= totalPendingRewards) {
            return currentRewardIndex;
        }
        
        uint256 timeDelta = block.timestamp - lastRewarded;
        uint256 potentialRewards = timeDelta * currentRewardRate;
        uint256 supply = totalSupply();
        
        // Cap rewards to remaining available funds
        uint256 remainingRewards = currentAvailableRewards - totalPendingRewards;
        uint256 actualRewards = potentialRewards > remainingRewards 
            ? remainingRewards 
            : potentialRewards;

        if (supply > 0) {
            return currentRewardIndex + (actualRewards * REWARD_PRECISION) / supply;
        }
        return currentRewardIndex;
    }

    /**
     * @notice Verifies if a vote was cast correctly
     * @param proposalId The ID of the proposal to verify
     * @return bool True if the vote was cast correctly
     */
    function verifyVote(uint256 proposalId) internal view returns (bool) {
        VoteInfo memory info = voteInfo[proposalId];
        if (info.blockNumber == 0) return false;

        // Verify the vote was cast in a valid state
        IGovernor.ProposalState state = COMPOUND_GOVERNOR.state(proposalId);
        if (state != IGovernor.ProposalState.Active && 
            state != IGovernor.ProposalState.Pending) {
            return false;
        }

        // Verify the transaction hash matches
        if (info.txHash != blockhash(info.blockNumber - 1)) {
            return false;
        }

        // Verify the contract has voted
        if (!COMPOUND_GOVERNOR.hasVoted(proposalId, address(this))) {
            return false;
        }

        // Verify the vote direction matches
        if (info.direction != contractVoteDirection[proposalId]) {
            return false;
        }

        return true;
    }

    //////////////////////////
    // ERC20 Transfer Overrides
    //////////////////////////

    /**
     * @notice Override transfer function to prevent token transfers
     * @dev Compensator tokens are not transferable between users
     * @return Always reverts
     */
    function transfer(address /* to */, uint256 /* amount */) public virtual override returns (bool) {
        revert CompensatorTokensNotTransferable();
    }

    /**
     * @notice Override transferFrom function to prevent token transfers
     * @dev Compensator tokens are not transferable between users
     * @return Always reverts
     */
    function transferFrom(address /* from */, address /* to */, uint256 /* amount */) public virtual override returns (bool) {
        revert CompensatorTokensNotTransferable();
    }

    /**
     * @notice Override approve function to prevent token approvals
     * @dev Compensator tokens are not transferable, so approvals are not needed
     * @return Always reverts
     */
    function approve(address /* spender */, uint256 /* amount */) public virtual override returns (bool) {
        revert CompensatorTokensNotTransferable();
    }

    //////////////////////////
    // Ownership Transfer Override
    //////////////////////////

    /**
     * @notice Override transferOwnership to notify the factory when ownership changes
     * @dev This ensures the factory's ownerToCompensator mapping stays synchronized
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) public virtual override onlyOwner {
        if (newOwner == address(0)) revert NewOwnerCannotBeZeroAddress();
        
        address oldOwner = owner();
        
        // Call the parent transferOwnership function
        super.transferOwnership(newOwner);
        
        // Notify the factory about the ownership change
        if (FACTORY != address(0)) {
            try CompensatorFactory(FACTORY).onOwnershipTransferred(oldOwner, newOwner) {
                // Successfully notified factory
            } catch {
                // Factory notification failed, but ownership transfer still succeeds
                // This is acceptable as the factory can be updated manually if needed
            }
        }
    }
}
