// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import "./IComp.sol";
import "./IGovernor.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

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
    // Variables
    //////////////////////////

    /// @notice The COMP governance token contract
    IComp public constant compToken = IComp(0xc00e94Cb662C3520282E6f5717214004A7f26888);

    /// @notice The Compound Governor contract
    IGovernor public constant compoundGovernor = IGovernor(0x309a862bbC1A00e45506cB8A802D1ff10004c8C0);

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
    mapping(address => uint256) public startRewardIndex;

    /// @notice Tracks previously accrued but unclaimed rewards for each delegator
    mapping(address => uint256) public unclaimedRewards;

    /// @notice Tracks the outcome of each proposal (0 = not resolved, 1 = For won, 2 = Against won)
    mapping(uint256 => uint8) public proposalOutcomes;

    /// @notice Tracks when each proposal was created
    mapping(uint256 => uint256) public proposalCreationTime;

    /// @notice Maximum time a proposal can remain unresolved (30 days)
    uint256 public constant MAX_PROPOSAL_RESOLUTION_TIME = 30 days;

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

    /// @notice Tracks the total rewards deficit when availableRewards was insufficient
    uint256 public rewardsDeficit;

    /// @notice Minimum lock period for delegated COMP (7 days)
    uint256 public constant MIN_LOCK_PERIOD = 7 days;

    /// @notice Tracks when each delegator's COMP will be unlocked
    mapping(address => uint256) public unlockTime;

    /// @notice Latest proposal ID that has been seen
    uint256 public latestProposalId;

    /// @notice Tracks active proposals
    mapping(uint256 => bool) public activeProposals;

    /// @notice Tracks proposals that are about to start (within 1 day)
    mapping(uint256 => bool) public pendingProposals;

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

    //////////////////////////
    // Events
    //////////////////////////

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
    event ProposalStakeDistributed(uint256 proposalId, uint8 winningSupport);

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
    // Constructor & Initialization
    //////////////////////////

    /**
     * @notice Constructor that initializes the contract with the delegate's address and name
     * @param _delegate The address of the delegate
     * @param _delegateName The name of the delegate
     */
    constructor(address _delegate, string memory _delegateName) ERC20("Compensator", "COMPENSATOR") {
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
            currentRewards += balanceOf(delegator) * (currIndex - startRewardIndex[delegator]) / 1e18;
        }
        
        return currentRewards;
    }

    //////////////////////////
    // Delegate Methods
    //////////////////////////

    /**
     * @notice Allows the delegate to deposit COMP to be used for rewards
     * @dev Updates reward index before increasing available rewards
     * @param amount The amount of COMP to deposit
     */
    function delegateDeposit(uint256 amount) external {
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
    function delegateWithdraw(uint256 amount) external {
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
    function setRewardRate(uint256 newRate) external {
        require(newRate >= 0, "Reward rate must be non-negative");
        require(newRate != rewardRate, "New rate must be different from current rate");
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
        
        // Update rewards before changing the user's balance
        _updateRewardsIndex();
        _updateUserRewards(msg.sender);
        
        // Process the deposit
        compToken.transferFrom(msg.sender, address(this), amount);
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
        compToken.transfer(msg.sender, amount);
        totalDelegatedCOMP -= amount;
        
        startRewardIndex[msg.sender] = rewardIndex;
        
        emit DelegatorWithdraw(msg.sender, amount);
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

        IGovernor.ProposalState state = compoundGovernor.state(proposalId);
        require(state == IGovernor.ProposalState.Active, "Staking only allowed for active proposals");

        // Update latest proposal ID and track creation time
        _updateLatestProposalId(proposalId);
        if (proposalCreationTime[proposalId] == 0) {
            proposalCreationTime[proposalId] = block.timestamp;
        }

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
     * @notice Resolves a proposal and distributes stakes based on the actual outcome
     * @dev Can be called by anyone once the proposal is resolved in Compound Governor
     * @param proposalId The ID of the proposal to resolve
     */
    function resolveProposal(uint256 proposalId) external {
        require(proposalOutcomes[proposalId] == 0, "Proposal already resolved");
        
        IGovernor.ProposalState state = compoundGovernor.state(proposalId);
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
            try compoundGovernor.hasVoted(proposalId, delegate) returns (bool hasVoted) {
                delegateVoted[proposalId] = hasVoted;
                
                // If delegate voted, get their vote direction
                if (hasVoted) {
                    (uint256 againstVotes, uint256 forVotes,) = compoundGovernor.proposalVotes(proposalId);
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
                compToken.transfer(delegate, totalStakesFor[proposalId]);
            } else if (winningSupport == 0 && totalStakesAgainst[proposalId] > 0) {
                compToken.transfer(delegate, totalStakesAgainst[proposalId]);
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
        compToken.transfer(msg.sender, amountToReturn);
        emit LosingStakeReclaimed(msg.sender, proposalId, amountToReturn);
    }

    /**
     * @notice Automatically resolves a proposal that has exceeded the maximum resolution time
     * @dev Internal function called by reclaimLosingStake when timeout is reached
     * @param proposalId The ID of the proposal to auto-resolve
     */
    function _autoResolveProposal(uint256 proposalId) internal {
        IGovernor.ProposalState state = compoundGovernor.state(proposalId);
        
        // If proposal is still active/pending after timeout, consider it defeated
        if (state == IGovernor.ProposalState.Active || 
            state == IGovernor.ProposalState.Pending) {
            proposalOutcomes[proposalId] = 2; // Against won
            
            // Verify delegate voting and direction
            if (!delegateVoted[proposalId]) {
                try compoundGovernor.hasVoted(proposalId, delegate) returns (bool hasVoted) {
                    delegateVoted[proposalId] = hasVoted;
                    
                    // If delegate voted, get their vote direction
                    if (hasVoted) {
                        (uint256 againstVotes, uint256 forVotes,) = compoundGovernor.proposalVotes(proposalId);
                        delegateVoteDirection[proposalId] = forVotes > againstVotes ? 1 : 0;
                    }
                    
                    emit DelegateVotingVerified(proposalId, hasVoted, delegateVoteDirection[proposalId]);
                } catch {
                    delegateVoted[proposalId] = false;
                    emit DelegateVotingVerified(proposalId, false, 0);
                }
            }

            if (delegateVoted[proposalId] && delegateVoteDirection[proposalId] == 0 && totalStakesAgainst[proposalId] > 0) {
                compToken.transfer(delegate, totalStakesAgainst[proposalId]);
            }
            emit ProposalAutoResolved(proposalId, 0);
        } else {
            // Otherwise, resolve based on actual state
            uint8 winningSupport = (state == IGovernor.ProposalState.Succeeded || 
                                  state == IGovernor.ProposalState.Executed) ? 1 : 0;
            proposalOutcomes[proposalId] = winningSupport + 1;
            
            // Verify delegate voting and direction
            if (!delegateVoted[proposalId]) {
                try compoundGovernor.hasVoted(proposalId, delegate) returns (bool hasVoted) {
                    delegateVoted[proposalId] = hasVoted;
                    
                    // If delegate voted, get their vote direction
                    if (hasVoted) {
                        (uint256 againstVotes, uint256 forVotes,) = compoundGovernor.proposalVotes(proposalId);
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
                    compToken.transfer(delegate, totalStakesFor[proposalId]);
                } else if (winningSupport == 0 && totalStakesAgainst[proposalId] > 0) {
                    compToken.transfer(delegate, totalStakesAgainst[proposalId]);
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
        try compoundGovernor.state(proposalId) returns (IGovernor.ProposalState state) {
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
            try compoundGovernor.proposalSnapshot(proposalId) returns (uint256 startBlock) {
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

    //////////////////////////
    // Internal Functions
    //////////////////////////

    /**
     * @notice Internal function to update a user's rewards without claiming
     * @dev Updates the user's unclaimed rewards and sets a new checkpoint
     * @param delegator The address of the delegator to update rewards for
     */
    function _updateUserRewards(address delegator) internal {
        if (balanceOf(delegator) > 0) {
            uint256 newRewards = balanceOf(delegator) * (rewardIndex - startRewardIndex[delegator]) / 1e18;
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
    function _updateRewardsIndex() internal {
        uint256 supply = totalSupply();
        
        // Early return if no delegators exist
        if (supply == 0) {
            lastRewarded = block.timestamp;
            return;
        }

        // Calculate new rewards
        uint256 timeDelta = block.timestamp - lastRewarded;
        uint256 rewards = timeDelta * rewardRate;
        
        if (availableRewards <= totalPendingRewards) {
            // Track the deficit in rewards
            rewardsDeficit += rewards;
            lastRewarded = block.timestamp;
            emit RewardIndexUpdated(rewardIndex, 0, rewardsDeficit);
            return;
        }
        
        uint256 availableForNewRewards = availableRewards - totalPendingRewards;
        
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
        rewardIndex += rewards * 1e18 / supply;
        totalPendingRewards += rewards;
        lastRewarded = block.timestamp;
        
        emit RewardIndexUpdated(rewardIndex, rewards, rewardsDeficit);
    }

    /**
    * @notice Returns the current rewards index, adjusted for time since last rewarded
    * @dev Used for view functions to calculate pending rewards
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
