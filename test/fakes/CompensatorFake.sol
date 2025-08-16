// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @dev A sophisticated fake Compensator contract for advanced testing scenarios.
/// This fake provides realistic behavior and can be configured to trigger specific edge cases.
contract CompensatorFake is Ownable, ReentrancyGuard {
    /// @dev Emitted when rewards are deposited
    event RewardsDeposited(address indexed from, uint256 amount);
    
    /// @dev Emitted when rewards are withdrawn
    event RewardsWithdrawn(address indexed to, uint256 amount);
    
    /// @dev Emitted when user deposits
    event UserDeposit(address indexed user, uint256 amount);
    
    /// @dev Emitted when user withdraws
    event UserWithdraw(address indexed user, uint256 amount);
    
    /// @dev Emitted when reward rate is set
    event RewardRateSet(uint256 oldRate, uint256 newRate);
    
    /// @dev Emitted when delegation cap is updated
    event DelegationCapUpdated(uint256 oldCap, uint256 newCap, uint256 totalSupply);
    
    /// @dev Emitted when a proposal is staked
    event ProposalStaked(uint256 indexed proposalId, address indexed user, uint256 amount);
    
    /// @dev Emitted when a proposal stake is withdrawn
    event ProposalStakeWithdrawn(uint256 indexed proposalId, address indexed user, uint256 amount);
    
    /// @dev Emitted when voting power is delegated
    event VotingPowerDelegated(address indexed from, address indexed to, uint256 amount);
    
    /// @dev Emitted when voting power delegation is revoked
    event VotingPowerDelegationRevoked(address indexed from, address indexed to, uint256 amount);

    /// @dev COMP token contract
    IERC20 public immutable COMP_TOKEN;
    
    /// @dev Compound Governor contract
    address public immutable COMPOUND_GOVERNOR;
    
    /// @dev Current reward rate (tokens per second)
    uint256 public rewardRate;
    
    /// @dev Last time rewards were distributed
    uint256 public lastRewarded;
    
    /// @dev Total rewards available for distribution
    uint256 public availableRewards;
    
    /// @dev Total pending rewards across all users
    uint256 public totalPendingRewards;
    
    /// @dev Delegation cap (5% of total COMP supply)
    uint256 public delegationCap;
    
    /// @dev Reward precision (18 decimals)
    uint256 public constant REWARD_PRECISION = 1e18;
    
    /// @dev Delegation cap percentage (5%)
    uint256 public constant DELEGATION_CAP_PERCENT = 500;
    
    /// @dev Basis points (10000)
    uint256 public constant BASIS_POINTS = 10000;
    
    /// @dev Lock period for proposals (7 days)
    uint256 public constant LOCK_PERIOD = 7 days;
    
    /// @dev User balance mapping
    mapping(address => uint256) public balanceOf;
    
    /// @dev User unclaimed rewards mapping
    mapping(address => uint256) public unclaimedRewards;
    
    /// @dev User start reward index mapping
    mapping(address => uint256) public startRewardIndex;
    
    /// @dev Current reward index
    uint256 public rewardIndex;
    
    /// @dev Proposal stakes mapping
    mapping(uint256 => mapping(address => uint256)) public proposalStakes;
    
    /// @dev User total proposal stakes mapping
    mapping(address => uint256) public userTotalProposalStakes;
    
    /// @dev Active proposals mapping
    mapping(uint256 => bool) public activeProposals;
    
    /// @dev Proposal creation times mapping
    mapping(uint256 => uint256) public proposalCreationTimes;
    
    /// @dev User delegation mapping
    mapping(address => address) public userDelegations;
    
    /// @dev User delegated voting power mapping
    mapping(address => uint256) public delegatedVotingPower;
    
    /// @dev Whether the contract is paused
    bool public paused;
    
    /// @dev Whether specific functions are paused
    mapping(bytes4 => bool) public functionPaused;
    
    /// @dev Whether the contract is in emergency mode
    bool public emergencyMode;
    
    /// @dev Emergency withdrawal address
    address public emergencyWithdrawalAddress;
    
    /// @dev Maximum gas limit for operations
    uint256 public maxGasLimit;
    
    /// @dev Minimum gas limit for operations
    uint256 public minGasLimit;

    /// @dev Constructor
    /// @param _compToken COMP token contract address
    /// @param _compoundGovernor Compound Governor contract address
    /// @param _owner Owner address
    constructor(
        address _compToken,
        address _compoundGovernor,
        address _owner
    ) Ownable(_owner) {
        COMP_TOKEN = IERC20(_compToken);
        COMPOUND_GOVERNOR = _compoundGovernor;
        lastRewarded = block.timestamp;
        rewardIndex = REWARD_PRECISION;
        emergencyWithdrawalAddress = _owner;
        maxGasLimit = 30_000_000;
        minGasLimit = 21_000;
        
        // Set initial delegation cap
        uint256 totalSupply = IERC20(_compToken).totalSupply();
        require(totalSupply > 0, "Invalid COMP total supply");
        delegationCap = (totalSupply * DELEGATION_CAP_PERCENT) / BASIS_POINTS;
        require(delegationCap > 0, "Delegation cap too small");
        
        emit DelegationCapUpdated(0, delegationCap, totalSupply);
    }

    /// @dev Deposit rewards (owner only)
    /// @param amount Amount of rewards to deposit
    function ownerDeposit(uint256 amount) external onlyOwner {
        require(!paused, "Contract is paused");
        require(!functionPaused[this.ownerDeposit.selector], "Function is paused");
        require(amount > 0, "Amount must be greater than 0");
        require(COMP_TOKEN.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        availableRewards += amount;
        emit RewardsDeposited(msg.sender, amount);
    }

    /// @dev Withdraw rewards (owner only)
    /// @param amount Amount of rewards to withdraw
    function ownerWithdraw(uint256 amount) external onlyOwner {
        require(!paused, "Contract is paused");
        require(!functionPaused[this.ownerWithdraw.selector], "Function is paused");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= availableRewards, "Insufficient available rewards");
        
        availableRewards -= amount;
        require(COMP_TOKEN.transfer(msg.sender, amount), "Transfer failed");
        
        emit RewardsWithdrawn(msg.sender, amount);
    }

    /// @dev Set reward rate (owner only)
    /// @param newRate New reward rate
    function setRewardRate(uint256 newRate) external onlyOwner {
        require(!paused, "Contract is paused");
        require(!functionPaused[this.setRewardRate.selector], "Function is paused");
        require(newRate != rewardRate, "New rate must be different");
        
        uint256 oldRate = rewardRate;
        rewardRate = newRate;
        
        emit RewardRateSet(oldRate, newRate);
    }

    /// @dev User deposit
    /// @param amount Amount to deposit
    function userDeposit(uint256 amount) external nonReentrant {
        require(!paused, "Contract is paused");
        require(!functionPaused[this.userDeposit.selector], "Function is paused");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf[msg.sender] + amount <= delegationCap, "Delegation cap exceeded");
        require(COMP_TOKEN.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Update user state
        _updateUserRewards(msg.sender);
        balanceOf[msg.sender] += amount;
        startRewardIndex[msg.sender] = rewardIndex;
        
        emit UserDeposit(msg.sender, amount);
    }

    /// @dev User withdraw
    /// @param amount Amount to withdraw
    function userWithdraw(uint256 amount) external nonReentrant {
        require(!paused, "Contract is paused");
        require(!functionPaused[this.userWithdraw.selector], "Function is paused");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        require(!_isUserLocked(msg.sender), "User is locked");
        
        // Update user state
        _updateUserRewards(msg.sender);
        balanceOf[msg.sender] -= amount;
        
        require(COMP_TOKEN.transfer(msg.sender, amount), "Transfer failed");
        
        emit UserWithdraw(msg.sender, amount);
    }

    /// @dev Stake on a proposal
    /// @param proposalId Proposal ID to stake on
    /// @param amount Amount to stake
    function stakeOnProposal(uint256 proposalId, uint256 amount) external {
        require(!paused, "Contract is paused");
        require(!functionPaused[this.stakeOnProposal.selector], "Function is paused");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        require(activeProposals[proposalId], "Proposal not active");
        
        // Update user state
        _updateUserRewards(msg.sender);
        
        // Transfer stake to proposal
        balanceOf[msg.sender] -= amount;
        proposalStakes[proposalId][msg.sender] += amount;
        userTotalProposalStakes[msg.sender] += amount;
        
        emit ProposalStaked(proposalId, msg.sender, amount);
    }

    /// @dev Withdraw stake from a proposal
    /// @param proposalId Proposal ID to withdraw stake from
    /// @param amount Amount to withdraw
    function withdrawProposalStake(uint256 proposalId, uint256 amount) external {
        require(!paused, "Contract is paused");
        require(!functionPaused[this.withdrawProposalStake.selector], "Function is paused");
        require(amount > 0, "Amount must be greater than 0");
        require(proposalStakes[proposalId][msg.sender] >= amount, "Insufficient proposal stake");
        
        // Check if proposal is still active and lock period has passed
        if (activeProposals[proposalId]) {
            require(block.timestamp >= proposalCreationTimes[proposalId] + LOCK_PERIOD, "Lock period not passed");
        }
        
        // Transfer stake back to user
        proposalStakes[proposalId][msg.sender] -= amount;
        userTotalProposalStakes[msg.sender] -= amount;
        balanceOf[msg.sender] += amount;
        
        emit ProposalStakeWithdrawn(proposalId, msg.sender, amount);
    }

    /// @dev Delegate voting power
    /// @param delegatee Address to delegate voting power to
    /// @param amount Amount of voting power to delegate
    function delegateVotingPower(address delegatee, uint256 amount) external {
        require(!paused, "Contract is paused");
        require(!functionPaused[this.delegateVotingPower.selector], "Function is paused");
        require(delegatee != address(0), "Invalid delegatee");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        // Update delegation
        userDelegations[msg.sender] = delegatee;
        delegatedVotingPower[delegatee] += amount;
        
        emit VotingPowerDelegated(msg.sender, delegatee, amount);
    }

    /// @dev Revoke voting power delegation
    /// @param delegatee Address to revoke delegation from
    /// @param amount Amount of voting power to revoke
    function revokeVotingPowerDelegation(address delegatee, uint256 amount) external {
        require(!paused, "Contract is paused");
        require(!functionPaused[this.revokeVotingPowerDelegation.selector], "Function is paused");
        require(amount > 0, "Amount must be greater than 0");
        require(delegatedVotingPower[delegatee] >= amount, "Insufficient delegated voting power");
        
        // Update delegation
        delegatedVotingPower[delegatee] -= amount;
        
        emit VotingPowerDelegationRevoked(msg.sender, delegatee, amount);
    }

    /// @dev Claim rewards
    /// @param user User address to claim rewards for
    function claimRewards(address user) external {
        require(!paused, "Contract is paused");
        require(!functionPaused[this.claimRewards.selector], "Function is paused");
        require(user != address(0), "Invalid user address");
        
        _updateUserRewards(user);
        
        uint256 rewards = unclaimedRewards[user];
        require(rewards > 0, "No rewards to claim");
        
        unclaimedRewards[user] = 0;
        require(COMP_TOKEN.transfer(user, rewards), "Transfer failed");
    }

    /// @dev Get pending rewards for a user
    /// @param user User address
    /// @return Pending rewards amount
    function getPendingRewards(address user) external view returns (uint256) {
        uint256 currentRewards = unclaimedRewards[user];
        
        if (balanceOf[user] > 0) {
            uint256 currIndex = _getCurrentRewardsIndex();
            currentRewards += balanceOf[user] * (currIndex - startRewardIndex[user]) / REWARD_PRECISION;
        }
        
        return currentRewards;
    }

    /// @dev Calculate rewards until timestamp
    /// @return Timestamp until which rewards will be distributed
    function rewardsUntil() external view returns (uint256) {
        if (rewardRate == 0) return lastRewarded;
        
        uint256 remainingRewards = availableRewards > totalPendingRewards 
            ? availableRewards - totalPendingRewards 
            : 0;
        
        uint256 remainingRewardsTime = (remainingRewards * REWARD_PRECISION) / rewardRate;
        return lastRewarded + remainingRewardsTime;
    }

    /// @dev Pause/unpause the contract (owner only)
    /// @param _paused Whether to pause the contract
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    /// @dev Pause/unpause specific functions (owner only)
    /// @param functionSelector Function selector to pause/unpause
    /// @param _paused Whether to pause the function
    function setFunctionPaused(bytes4 functionSelector, bool _paused) external onlyOwner {
        functionPaused[functionSelector] = _paused;
    }

    /// @dev Set emergency mode (owner only)
    /// @param _emergencyMode Whether to enable emergency mode
    function setEmergencyMode(bool _emergencyMode) external onlyOwner {
        emergencyMode = _emergencyMode;
    }

    /// @dev Emergency withdrawal (owner only)
    /// @param token Token to withdraw
    /// @param amount Amount to withdraw
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(emergencyMode, "Emergency mode not enabled");
        require(IERC20(token).transfer(emergencyWithdrawalAddress, amount), "Transfer failed");
    }

    /// @dev Set gas limits (owner only)
    /// @param _minGasLimit Minimum gas limit
    /// @param _maxGasLimit Maximum gas limit
    function setGasLimits(uint256 _minGasLimit, uint256 _maxGasLimit) external onlyOwner {
        require(_minGasLimit <= _maxGasLimit, "Invalid gas limits");
        minGasLimit = _minGasLimit;
        maxGasLimit = _maxGasLimit;
    }

    /// @dev Function to simulate failures for testing
    /// @param shouldFail Whether the operation should fail
    /// @param reason Reason for failure
    function simulateFailure(bool shouldFail, string memory reason) public pure {
        require(!shouldFail, reason);
    }

    /// @dev Function to simulate gas consumption for testing
    /// @param gasToConsume Amount of gas to consume
    function simulateGasConsumption(uint256 gasToConsume) public pure {
        uint256 startGas = gasleft();
        while (gasleft() > startGas - gasToConsume) {
            // Consume gas
        }
    }

    /// @dev Internal function to update user rewards
    /// @param user User address
    function _updateUserRewards(address user) internal {
        if (balanceOf[user] > 0) {
            uint256 currIndex = _getCurrentRewardsIndex();
            uint256 userRewards = balanceOf[user] * (currIndex - startRewardIndex[user]) / REWARD_PRECISION;
            unclaimedRewards[user] += userRewards;
            totalPendingRewards += userRewards;
            startRewardIndex[user] = currIndex;
        }
    }

    /// @dev Internal function to get current rewards index
    /// @return Current rewards index
    function _getCurrentRewardsIndex() internal view returns (uint256) {
        if (rewardRate == 0) return rewardIndex;
        
        uint256 timeElapsed = block.timestamp - lastRewarded;
        uint256 rewardsAccrued = timeElapsed * rewardRate;
        
        if (rewardsAccrued > availableRewards) {
            rewardsAccrued = availableRewards;
        }
        
        return rewardIndex + (rewardsAccrued * REWARD_PRECISION) / availableRewards;
    }

    /// @dev Internal function to check if user is locked
    /// @param user User address
    /// @return Whether user is locked
    function _isUserLocked(address user) internal view returns (bool) {
        return userTotalProposalStakes[user] > 0;
    }

    /// @dev Set proposal as active/inactive (owner only)
    /// @param proposalId Proposal ID
    /// @param active Whether proposal is active
    function setProposalActive(uint256 proposalId, bool active) external onlyOwner {
        activeProposals[proposalId] = active;
        if (active) {
            proposalCreationTimes[proposalId] = block.timestamp;
        }
    }

    /// @dev Set proposal creation time (owner only)
    /// @param proposalId Proposal ID
    /// @param creationTime Creation timestamp
    function setProposalCreationTime(uint256 proposalId, uint256 creationTime) external onlyOwner {
        proposalCreationTimes[proposalId] = creationTime;
    }

    /// @dev Check if user is locked (external view function)
    /// @param user User address
    /// @return Whether user is locked
    function isUserLocked(address user) external view returns (bool) {
        return _isUserLocked(user);
    }
}
