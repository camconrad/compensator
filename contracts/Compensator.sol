// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.30;

import {IComp} from "./IComp.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IGovernor} from "./IGovernor.sol";

// Interface for the factory contract
interface CompensatorFactory {
    function onOwnershipTransferred(address oldOwner, address newOwner) external;
}

// Custom Errors
error InvalidCompTokenAddress();
error InvalidOwnerAddress();
error InvalidCompTotalSupply();
error DelegationCapTooSmall();
error AmountMustBeGreaterThanZero();
error AmountExceedsAvailableRewards();
error NewRateMustBeDifferent();
error RewardRateTooHigh();
error NewOwnerCannotBeZeroAddress();
error InsufficientBalance();
error NoRewardsToClaim();
error DelegationCapExceeded();
error CompensatorTokensNotTransferable();
error InvalidSupportValue();
error AlreadyVotedOnProposal();
error InvalidProposalState();

//  ________  ________  _____ ______   ________  ________  ___  ___  ________   ________     
// |\   ____\|\   __  \|\   _ \  _   \|\   __  \|\   __  \|\  \|\  \|\   ___  \|\   ___ \    
// \ \  \___|\ \  \|\  \ \  \\\__\ \  \ \  \|\  \ \  \|\  \ \  \\\  \ \  \\ \  \ \  \_|\ \   
//  \ \  \    \ \  \\\  \ \  \\|__| \  \ \   ____\ \  \\\  \ \  \\\  \ \  \\ \  \ \  \\ \  
//   \ \  \____\ \  \\\  \ \  \    \ \  \ \  \___|\ \  \\\  \ \  \\\  \ \  \\ \  \ \  \_\\ \ 
//    \ \_______\ \_______\ \__\    \ \__\ \__\    \ \_______\ \_______\ \__\\ \__\ \_______\
//     \|_______|\|_______|\|__|     \|__|\|__|     \|_______|\|_______|\|__| \|__|\|_______|

/**
 * @title Compensator
 * @notice A contract that allows COMP holders to delegate their voting power
 * and earn rewards. The delegate can deposit COMP to distribute rewards to delegators.
 * @custom:security-contact support@compensator.io
 */
contract Compensator is ERC20, ReentrancyGuard, Ownable {

    //////////////////////////
    // Type Declarations
    //////////////////////////

    //////////////////////////
    // State Variables
    //////////////////////////

    /// @notice The COMP governance token contract
IComp public immutable COMP_TOKEN;

/// @notice The Compound Governor contract
IGovernor public immutable GOVERNOR;

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

/// @notice Tracks votes cast by this contract
mapping(uint256 => bool) public contractVoted;

/// @notice Tracks the vote direction for each proposal
mapping(uint256 => uint8) public contractVoteDirection;

    /// @notice Precision factor for reward calculations (18 decimals)
    uint256 public constant REWARD_PRECISION = 1e18;

    /// @notice Percentage basis points (100%)
    uint256 public constant BASIS_POINTS = 10000; // 100% = 10000 basis points

    /// @notice Maximum reward rate (100% APR max)
    uint256 public constant MAX_REWARD_RATE = 3.17e10; // 1 COMP per year per 1 COMP delegated

    //////////////////////////
    // Events
    //////////////////////////

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

    /// @notice Emitted when a user claims their rewards
    event ClaimRewards(address indexed user, uint256 amount);

    /// @notice Emitted when a user's rewards are updated
    /// @param user The address of the user whose rewards were updated
    /// @param newRewards The amount of new rewards accrued
    /// @param totalUnclaimed The total amount of unclaimed rewards after the update
    event UserRewardsUpdated(address indexed user, uint256 newRewards, uint256 totalUnclaimed);

    /// @notice Emitted when the global reward index is updated
    /// @param newRewardIndex The new reward index value
    /// @param rewardsAccrued The amount of rewards accrued in this update
    event RewardIndexUpdated(uint256 newRewardIndex, uint256 rewardsAccrued);

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

/// @notice Emitted when the contract casts a vote
event VoteCast(uint256 indexed proposalId, uint8 support, string reason);

    //////////////////////////
    // Constructor
    //////////////////////////

    /**
     * @notice Constructor that initializes the contract
     * @param _compToken The address of the COMP token contract
     * @param _governor The address of the Compound Governor contract
     * @param _owner The address of the owner for factory deployment
     */
    constructor(
        address _compToken,
        address _governor,
        address _owner
    ) ERC20("Compensator", "COMPENSATOR") Ownable(_owner) {
        if (_compToken == address(0)) revert InvalidCompTokenAddress();
        if (_governor == address(0)) revert InvalidOwnerAddress();
        if (_owner == address(0)) revert InvalidOwnerAddress();
        
        COMP_TOKEN = IComp(_compToken);
        GOVERNOR = IGovernor(_governor);
        FACTORY = msg.sender; // The factory that deploys this contract
        
        rewardIndex = REWARD_PRECISION; // Initialize reward index at 1 with 18 decimals

        // Set the delegation cap to 5% of the total COMP supply
        uint256 totalSupply = COMP_TOKEN.totalSupply();
        if (totalSupply == 0) revert InvalidCompTotalSupply();
        delegationCap = (totalSupply * DELEGATION_CAP_PERCENT) / BASIS_POINTS;
        if (delegationCap == 0) revert DelegationCapTooSmall();
        
        emit DelegationCapUpdated(0, delegationCap, totalSupply);
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
     * @notice Check if this contract has voted on a proposal
     * @param proposalId The proposal ID to check
     * @return Whether this contract has voted
     */
    function hasVoted(uint256 proposalId) external view returns (bool) {
        return GOVERNOR.hasVoted(proposalId, address(this));
    }

    /**
     * @notice Get the voting power of this contract at a specific block
     * @param blockNumber The block number to check
     * @return The voting power at that block
     */
    function getVotingPowerAt(uint256 blockNumber) external view returns (uint256) {
        return GOVERNOR.getVotes(address(this), blockNumber);
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
        // Checks
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        
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
     * @notice Allows the owner to cast votes using the contract's voting power
     * @dev Only the contract owner can call this function
     * @param proposalId The ID of the proposal to vote on
     * @param support The vote direction (0 = Against, 1 = For, 2 = Abstain)
     * @param reason The reason for the vote
     */
    function castVote(
        uint256 proposalId,
        uint8 support,
        string memory reason
    ) external onlyOwner {
        // Validate support value (0 = Against, 1 = For, 2 = Abstain)
        if (support > 2) revert InvalidSupportValue();
        
        // Check if contract has already voted on this proposal
        if (contractVoted[proposalId]) revert AlreadyVotedOnProposal();
        
        // Verify proposal exists and is in a valid state
        IGovernor.ProposalState state = GOVERNOR.state(proposalId);
        if (
            state != IGovernor.ProposalState.Active && 
            state != IGovernor.ProposalState.Pending
        ) revert InvalidProposalState();
        
        // Cast vote on the governor
        GOVERNOR.castVoteWithReason(proposalId, support, reason);
        
        // Track the vote
        contractVoted[proposalId] = true;
        contractVoteDirection[proposalId] = support;
        
        emit VoteCast(proposalId, support, reason);
    }

    /**
     * @notice Allows the owner to cast votes using the contract's voting power (without reason)
     * @dev Only the contract owner can call this function
     * @param proposalId The ID of the proposal to vote on
     * @param support The vote direction (0 = Against, 1 = For, 2 = Abstain)
     */
    function castVote(
        uint256 proposalId,
        uint8 support
    ) external onlyOwner {
        // Validate support value (0 = Against, 1 = For, 2 = Abstain)
        if (support > 2) revert InvalidSupportValue();
        
        // Check if contract has already voted on this proposal
        if (contractVoted[proposalId]) revert AlreadyVotedOnProposal();
        
        // Verify proposal exists and is in a valid state
        IGovernor.ProposalState state = GOVERNOR.state(proposalId);
        if (
            state != IGovernor.ProposalState.Active && 
            state != IGovernor.ProposalState.Pending
        ) revert InvalidProposalState();
        
        // Cast vote on the governor
        GOVERNOR.castVote(proposalId, support);
        
        // Track the vote
        contractVoted[proposalId] = true;
        contractVoteDirection[proposalId] = support;
        
        emit VoteCast(proposalId, support, "");
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
        
        // Decrement availableRewards
        availableRewards -= amount;
        
        // Interactions
        COMP_TOKEN.transfer(msg.sender, amount);
        
        emit ClaimRewards(msg.sender, amount);
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
     * @dev Reverts if factory notification fails to maintain data consistency
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) public virtual override onlyOwner {
        if (newOwner == address(0)) revert NewOwnerCannotBeZeroAddress();
        
        address oldOwner = owner();
        
        // Call the parent transferOwnership function
        super.transferOwnership(newOwner);
        
        // Notify the factory about the ownership change
        if (FACTORY != address(0)) {
            CompensatorFactory(FACTORY).onOwnershipTransferred(oldOwner, newOwner);
        }
    }
}
