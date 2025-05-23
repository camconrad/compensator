// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {IComp} from "./IComp.sol";
import {IGovernor} from "./IGovernor.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

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
contract Compensator is ERC20 {
    using SafeERC20 for IComp;

    //////////////////////////
    // Type Declarations
    //////////////////////////

    /// @notice Structure to track individual delegator stakes on proposals
    struct ProposalStake {
        /// @notice Amount staked in support of a proposal
        uint256 forStake;
        /// @notice Amount staked against a proposal
        uint256 againstStake;
    }

    //////////////////////////
    // State Variables
    //////////////////////////

    /// @notice The COMP governance token contract
    IComp public immutable COMP_TOKEN;

    /// @notice The Compound Governor contract
    IGovernor public immutable COMPOUND_GOVERNOR;

    /// @notice The address of the delegate receiving voting power
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
    uint256 public constant DELEGATION_CAP_PERCENT = 5; // 5%
    
    /// @notice Absolute value of the delegation cap in COMP tokens
    uint256 public delegationCap;

    /// @notice Total pending rewards for all delegators that have been accrued but not yet claimed
    uint256 public totalPendingRewards;

    /// @notice Tracks the starting reward index for each delegator to calculate pending rewards
    mapping(address delegator => uint256 index) public startRewardIndex;

    /// @notice Tracks previously accrued but unclaimed rewards for each delegator
    mapping(address delegator => uint256 amount) public unclaimedRewards;

    /// @notice Tracks the outcome of each proposal (0 = not resolved, 1 = For won, 2 = Against won)
    mapping(uint256 proposalId => uint8 outcome) public proposalOutcomes;

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

    /// @notice Tracks the total rewards deficit when availableRewards was insufficient
    uint256 public rewardsDeficit;

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
    uint256 public constant BASIS_POINTS = 100;

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

    /// @notice Emitted when a user's rewards are updated
    /// @param delegator The address of the delegator whose rewards were updated
    /// @param newRewards The amount of new rewards accrued
    /// @param totalUnclaimed The total amount of unclaimed rewards after the update
    event UserRewardsUpdated(address indexed delegator, uint256 newRewards, uint256 totalUnclaimed);

    /// @notice Emitted when the global reward index is updated
    /// @param newRewardIndex The new reward index value
    /// @param rewardsAccrued The amount of rewards accrued in this update
    /// @param rewardsDeficit The current rewards deficit after the update
    event RewardIndexUpdated(uint256 newRewardIndex, uint256 rewardsAccrued, uint256 rewardsDeficit);

    //////////////////////////
    // Constructor
    //////////////////////////

    /**
     * @notice Constructor that initializes the contract with the delegate's address and name
     * @param _delegate The address of the delegate
     * @param _delegateName The name of the delegate
     * @param _compToken The address of the COMP token contract
     * @param _compoundGovernor The address of the Compound Governor contract
     */
    constructor(
        address _delegate,
        string memory _delegateName,
        address _compToken,
        address _compoundGovernor
    ) ERC20("Compensator", "COMPENSATOR") {
        require(_delegate != address(0), "Invalid delegate address");
        require(_compToken != address(0), "Invalid COMP token address");
        require(_compoundGovernor != address(0), "Invalid Compound Governor address");
        
        delegate = _delegate;
        delegateName = _delegateName;
        COMP_TOKEN = IComp(_compToken);
        COMPOUND_GOVERNOR = IGovernor(_compoundGovernor);
        
        rewardIndex = REWARD_PRECISION; // Initialize reward index at 1 with 18 decimals
        COMP_TOKEN.delegate(delegate); // Delegate voting power to the delegate

        // Set the delegation cap to 5% of the total COMP supply
        delegationCap = (COMP_TOKEN.totalSupply() * DELEGATION_CAP_PERCENT) / BASIS_POINTS;
    }

    //////////////////////////
    // External Functions
    //////////////////////////

    // View functions
    /**
     * @notice Calculates the timestamp until which rewards will be distributed
     * @dev Returns lastRewarded timestamp if no rewards are being distributed
     * @return until The timestamp until which rewards will be distributed based on current rate
     */
    function rewardsUntil() external view returns (uint256) {
        if (rewardRate == 0) return lastRewarded;
        
        // Calculate time for current available rewards
        uint256 remainingRewardsTime = 0;
        if (availableRewards > totalPendingRewards) {
            remainingRewardsTime = (availableRewards - totalPendingRewards) / rewardRate;
        }
        
        // Calculate time needed to cover the deficit
        uint256 deficitTime = 0;
        if (rewardsDeficit > 0) {
            deficitTime = rewardsDeficit / rewardRate;
        }
        
        return lastRewarded + remainingRewardsTime + deficitTime;
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

    // Delegate functions
    /**
     * @notice Allows the delegate to deposit COMP to be used for rewards
     * @dev Updates reward index before increasing available rewards
     * @param amount The amount of COMP to deposit
     */
    function delegateDeposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        COMP_TOKEN.transferFrom(delegate, address(this), amount);
        availableRewards += amount;
        _updateRewardsIndex();
        emit DelegateDeposit(delegate, amount);
    }

    /**
     * @notice Allows the delegate to withdraw COMP from the contract
     * @dev Ensures sufficient funds remain for pending rewards before withdrawal
     * @param amount The amount of COMP to withdraw
     */
    function delegateWithdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        _updateRewardsIndex();
        
        // Cache frequently accessed storage variables
        uint256 currentAvailableRewards = availableRewards;
        uint256 currentTotalPendingRewards = totalPendingRewards;
        address currentDelegate = delegate;
        
        uint256 withdrawableAmount = currentAvailableRewards - currentTotalPendingRewards;
        require(amount <= withdrawableAmount, "Amount exceeds available rewards");
        
        availableRewards = currentAvailableRewards - amount;
        COMP_TOKEN.transfer(currentDelegate, amount);
        emit DelegateWithdraw(currentDelegate, amount);
    }

    /**
     * @notice Allows the delegate to update the reward rate
     * @dev Updates reward index before changing rate to ensure proper accounting
     * @param newRate The new reward rate in COMP per second
     */
    function setRewardRate(uint256 newRate) external {
        require(newRate >= 0, "Reward rate must be non-negative");
        require(newRate != rewardRate, "New rate must be different from current rate");
        _updateRewardsIndex();
        rewardRate = newRate;
        emit RewardRateUpdate(delegate, newRate);
    }

    // Delegator functions
    /**
     * @notice Allows a delegator to delegate tokens to the delegate to receive rewards
     * @param amount The amount of COMP to delegate
     */
    function delegatorDeposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(totalDelegatedCOMP + amount <= delegationCap, "Delegation cap exceeded");
        
        // Update rewards before changing the user's balance
        _updateRewardsIndex();
        _updateUserRewards(msg.sender);
        
        // Process the deposit
        COMP_TOKEN.transferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
        totalDelegatedCOMP += amount;
        
        // Set unlock time based on active proposals
        uint256 newUnlockTime = block.timestamp + MIN_LOCK_PERIOD;
        if (_hasActiveOrPendingProposals()) {
            newUnlockTime = block.timestamp + MIN_LOCK_PERIOD + 3 days;
        }
        
        if (newUnlockTime > unlockTime[msg.sender]) {
            unlockTime[msg.sender] = newUnlockTime;
            emit COMPLocked(msg.sender, newUnlockTime);
        }
        
        // Reset the reward index for the user
        startRewardIndex[msg.sender] = rewardIndex;
        
        emit DelegatorDeposit(msg.sender, amount);
    }

    /**
     * @notice Allows a delegator to withdraw tokens from the contract
     * @dev Claims pending rewards before processing withdrawal
     * @param amount The amount of COMP to withdraw
     */
    function delegatorWithdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(block.timestamp >= unlockTime[msg.sender], "COMP is locked");
        require(!_hasActiveOrPendingProposals(), "Cannot withdraw during active or pending proposals");
        
        _updateRewardsIndex();
        _updateUserRewards(msg.sender);
        
        _burn(msg.sender, amount);
        COMP_TOKEN.transfer(msg.sender, amount);
        totalDelegatedCOMP -= amount;
        
        startRewardIndex[msg.sender] = rewardIndex;
        
        emit DelegatorWithdraw(msg.sender, amount);
    }

    // Proposal functions
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

        IGovernor.ProposalState state = COMPOUND_GOVERNOR.state(proposalId);
        require(state == IGovernor.ProposalState.Active, "Staking only allowed for active proposals");

        // Update latest proposal ID and track creation time
        _updateLatestProposalId(proposalId);
        if (proposalCreationTime[proposalId] == 0) {
            proposalCreationTime[proposalId] = block.timestamp;
        }

        COMP_TOKEN.transferFrom(msg.sender, address(this), amount);

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
     * @notice Resolves a proposal and distributes stakes based on the actual outcome
     * @dev Can be called by anyone once the proposal is resolved in Compound Governor
     * @param proposalId The ID of the proposal to resolve
     */
    function resolveProposal(uint256 proposalId) external {
        require(proposalOutcomes[proposalId] == 0, "Proposal already resolved");
        
        IGovernor.ProposalState state = COMPOUND_GOVERNOR.state(proposalId);
        require(
            state == IGovernor.ProposalState.Succeeded || 
            state == IGovernor.ProposalState.Defeated || 
            state == IGovernor.ProposalState.Expired ||
            state == IGovernor.ProposalState.Canceled ||
            state == IGovernor.ProposalState.Executed, 
            "Proposal not yet resolved"
        );

        // Verify delegate voting and direction
        if (!delegateVoted[proposalId]) {
            try COMPOUND_GOVERNOR.hasVoted(proposalId, delegate) returns (bool hasVoted) {
                delegateVoted[proposalId] = hasVoted;
                
                // If delegate voted, get their vote direction
                if (hasVoted) {
                    (uint256 againstVotes, uint256 forVotes,) = COMPOUND_GOVERNOR.proposalVotes(proposalId);
                    // If delegate has more for votes than against, they voted For
                    delegateVoteDirection[proposalId] = forVotes > againstVotes ? 1 : 0;
                }
                
                emit DelegateVotingVerified(proposalId, hasVoted, delegateVoteDirection[proposalId]);
            } catch {
                // If hasVoted fails, assume delegate hasn't voted
                delegateVoted[proposalId] = false;
                emit DelegateVotingVerified(proposalId, false, 0);
            }
        }

        // Determine the winning support based on the proposal state
        uint8 winningSupport;
        if (state == IGovernor.ProposalState.Succeeded || 
            state == IGovernor.ProposalState.Executed) {
            winningSupport = 1; // For won
        } else {
            winningSupport = 0; // Against won (includes Defeated, Expired, Canceled)
        }

        proposalOutcomes[proposalId] = winningSupport + 1;
        
        // Only transfer winning stakes if delegate has voted and voted in the winning direction
        if (delegateVoted[proposalId] && delegateVoteDirection[proposalId] == winningSupport) {
            if (winningSupport == 1 && totalStakesFor[proposalId] > 0) {
                COMP_TOKEN.transfer(delegate, totalStakesFor[proposalId]);
            } else if (winningSupport == 0 && totalStakesAgainst[proposalId] > 0) {
                COMP_TOKEN.transfer(delegate, totalStakesAgainst[proposalId]);
            }
        }
        
        emit ProposalStakeDistributed(proposalId, winningSupport);
    }

    /**
     * @notice Allows delegators to reclaim their losing stake after a proposal is resolved
     * @dev Can only be called after proposal is resolved with recorded outcome
     * @param proposalId The ID of the proposal to reclaim stake from
     */
    function reclaimLosingStake(uint256 proposalId) external {
        // Check if proposal needs to be auto-resolved due to timeout
        if (proposalOutcomes[proposalId] == 0 && 
            block.timestamp > proposalCreationTime[proposalId] + MAX_PROPOSAL_RESOLUTION_TIME) {
            _autoResolveProposal(proposalId);
        }

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
        COMP_TOKEN.transfer(msg.sender, amountToReturn);
        emit LosingStakeReclaimed(msg.sender, proposalId, amountToReturn);
    }

    //////////////////////////
    // Public Functions
    //////////////////////////

    // ERC20 overrides
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
        if (balanceOf(delegator) > 0) {
            uint256 newRewards = balanceOf(delegator) * (rewardIndex - startRewardIndex[delegator]) / REWARD_PRECISION;
            if (newRewards > 0) {
                unclaimedRewards[delegator] += newRewards;
                emit UserRewardsUpdated(delegator, newRewards, unclaimedRewards[delegator]);
            }
        }
    }

    /**
     * @notice Updates the reward index based on elapsed time and reward rate
     * @dev Tracks rewards
     */
    function _updateRewardsIndex() private {
        uint256 supply = totalSupply();
        
        // Early return if no delegators exist
        if (supply == 0) {
            lastRewarded = block.timestamp;
            return;
        }

        // Cache frequently accessed storage variables
        uint256 currentRewardRate = rewardRate;
        uint256 currentAvailableRewards = availableRewards;
        uint256 currentTotalPendingRewards = totalPendingRewards;
        uint256 currentRewardIndex = rewardIndex;

        // Calculate new rewards
        uint256 timeDelta = block.timestamp - lastRewarded;
        uint256 rewards = timeDelta * currentRewardRate;
        
        if (currentAvailableRewards <= currentTotalPendingRewards) {
            // Track the deficit in rewards
            rewardsDeficit += rewards;
            lastRewarded = block.timestamp;
            emit RewardIndexUpdated(currentRewardIndex, 0, rewardsDeficit);
            return;
        }
        
        uint256 availableForNewRewards = currentAvailableRewards - currentTotalPendingRewards;
        
        // If we have a deficit, try to make it up first
        if (rewardsDeficit > 0) {
            if (availableForNewRewards >= rewardsDeficit) {
                // We can make up the entire deficit
                availableForNewRewards -= rewardsDeficit;
                rewardsDeficit = 0;
            } else {
                // We can only make up part of the deficit
                rewardsDeficit -= availableForNewRewards;
                availableForNewRewards = 0;
            }
        }
        
        // Handle potential overflow for new rewards
        if (rewards > availableForNewRewards) {
            rewards = availableForNewRewards;
        }
        
        // Update accounting
        currentRewardIndex += rewards * REWARD_PRECISION / supply;
        currentTotalPendingRewards += rewards;
        lastRewarded = block.timestamp;
        
        // Update storage variables
        rewardIndex = currentRewardIndex;
        totalPendingRewards = currentTotalPendingRewards;
        
        emit RewardIndexUpdated(currentRewardIndex, rewards, rewardsDeficit);
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

    // Proposal-related functions
    /**
     * @notice Automatically resolves a proposal that has exceeded the maximum resolution time
     * @dev Internal function called by reclaimLosingStake when timeout is reached
     * @param proposalId The ID of the proposal to auto-resolve
     */
    function _autoResolveProposal(uint256 proposalId) internal {
        IGovernor.ProposalState state = COMPOUND_GOVERNOR.state(proposalId);
        
        // If proposal is still active/pending after timeout, consider it defeated
        if (state == IGovernor.ProposalState.Active || 
            state == IGovernor.ProposalState.Pending) {
            proposalOutcomes[proposalId] = 2; // Against won
            
            // Verify delegate voting and direction
            if (!delegateVoted[proposalId]) {
                try COMPOUND_GOVERNOR.hasVoted(proposalId, delegate) returns (bool hasVoted) {
                    delegateVoted[proposalId] = hasVoted;
                    
                    // If delegate voted, get their vote direction
                    if (hasVoted) {
                        (uint256 againstVotes, uint256 forVotes,) = COMPOUND_GOVERNOR.proposalVotes(proposalId);
                        delegateVoteDirection[proposalId] = forVotes > againstVotes ? 1 : 0;
                    }
                    
                    emit DelegateVotingVerified(proposalId, hasVoted, delegateVoteDirection[proposalId]);
                } catch {
                    delegateVoted[proposalId] = false;
                    emit DelegateVotingVerified(proposalId, false, 0);
                }
            }

            if (delegateVoted[proposalId] && delegateVoteDirection[proposalId] == 0 && totalStakesAgainst[proposalId] > 0) {
                COMP_TOKEN.transfer(delegate, totalStakesAgainst[proposalId]);
            }
            emit ProposalAutoResolved(proposalId, 0);
        } else {
            // Otherwise, resolve based on actual state
            uint8 winningSupport = (state == IGovernor.ProposalState.Succeeded || 
                                  state == IGovernor.ProposalState.Executed) ? 1 : 0;
            proposalOutcomes[proposalId] = winningSupport + 1;
            
            // Verify delegate voting and direction
            if (!delegateVoted[proposalId]) {
                try COMPOUND_GOVERNOR.hasVoted(proposalId, delegate) returns (bool hasVoted) {
                    delegateVoted[proposalId] = hasVoted;
                    
                    // If delegate voted, get their vote direction
                    if (hasVoted) {
                        (uint256 againstVotes, uint256 forVotes,) = COMPOUND_GOVERNOR.proposalVotes(proposalId);
                        delegateVoteDirection[proposalId] = forVotes > againstVotes ? 1 : 0;
                    }
                    
                    emit DelegateVotingVerified(proposalId, hasVoted, delegateVoteDirection[proposalId]);
                } catch {
                    delegateVoted[proposalId] = false;
                    emit DelegateVotingVerified(proposalId, false, 0);
                }
            }
            
            if (delegateVoted[proposalId] && delegateVoteDirection[proposalId] == winningSupport) {
                if (winningSupport == 1 && totalStakesFor[proposalId] > 0) {
                    COMP_TOKEN.transfer(delegate, totalStakesFor[proposalId]);
                } else if (winningSupport == 0 && totalStakesAgainst[proposalId] > 0) {
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
            } else if (!isActive && activeProposals[proposalId]) {
                activeProposals[proposalId] = false;
                emit ProposalDeactivated(proposalId);
            }

            // Check if proposal is about to start (within 1 day)
            try COMPOUND_GOVERNOR.proposalSnapshot(proposalId) returns (uint256 startBlock) {
                uint256 currentBlock = block.number;
                if (startBlock > currentBlock && startBlock - currentBlock < 6500) { // ~1 day in blocks
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
     * @return bool True if there are any active or pending proposals
     */
    function _hasActiveOrPendingProposals() internal view returns (bool) {
        // Check the last 10 proposals for active status
        uint256 startId = latestProposalId;
        uint256 endId = startId > 10 ? startId - 10 : 0;
        
        for (uint256 i = startId; i > endId; i--) {
            if (activeProposals[i] || pendingProposals[i]) {
                return true;
            }
        }
        return false;
    }
}
