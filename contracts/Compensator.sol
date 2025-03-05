// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IComp.sol";
import "./interfaces/IGovernorBravo.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

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
    IGovernorBravo public constant governorBravo = IGovernorBravo(0xc0Da02939E1441F497fd74F78cE7Decb17B66529);

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

    /// @notice Maps delegator to their claimed rewards
    mapping(address => uint) public claimedRewards;

    /// @notice Delegator starting reward index, used for calculating rewards
    mapping(address => uint) public startRewardIndex;

    /// @notice Total amount of COMP delegated to this delegate through this system
    uint256 public totalDelegatedCOMP;

    /// @notice Cap on the amount of COMP that can be delegated to this delegate (5% of total COMP supply)
    uint256 public constant DELEGATION_CAP_PERCENT = 5; // 5%
    uint256 public delegationCap;

    //////////////////////////
    // Events
    //////////////////////////

    /// @notice Emitted when the delegate deposits COMP into the contract
    event DelegateDeposit(address indexed delegate, uint256 amount);

    /// @notice Emitted when the delegate withdraws COMP from the contract
    event DelegateWithdraw(address indexed delegate, uint256 amount);

    /// @notice Emitted when the delegate updates the reward rate
    event RewardRateUpdate(address indexed delegate, uint256 newRate);

    /// @notice Emitted when a proposal is registered
    event ProposalRegister(address indexed delegate, uint256 proposalId);

    /// @notice Emitted when a proposal is voted on
    event ProposalVote(address indexed delegate, uint256 proposalId, uint256 outcome);

    /// @notice Emitted when a proposal claim is made
    event ProposalClaim(address indexed delegate, uint256 proposalId, uint256 outcome);

    /// @notice Emitted when a delegator deposits COMP into the contract
    event DelegatorDeposit(address indexed delegator, uint256 amount);

    /// @notice Emitted when a delegator withdraws COMP from the contract
    event DelegatorWithdraw(address indexed delegator, uint256 amount);

    /// @notice Emitted when a delegator is incentivized for voting
    event Incentivize(address indexed delegator, uint256 proposalId, uint256 amount, uint256 outcome);

    /// @notice Emitted when an incentive is recovered
    event RecoverIncentive(address indexed delegator, uint256 proposalId, uint256 amount);

    /// @notice Emitted when a delegator claims their rewards
    event ClaimRewards(address indexed delegator, uint256 amount);

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
     * @notice Initializes the Compensator contract with the token name and symbol
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
        delegate = _delegate;
        delegateName = _delegateName;
        rewardIndex = 1e18;
        compToken.delegate(delegate);

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
        if (rewardRate == 0) {
            return block.timestamp;
        }
        uint256 remainingRewardsTime = availableRewards / rewardRate;
        return lastRewarded + remainingRewardsTime;
    }

    /**
     * @notice Returns the amount of pending rewards for a delegator
     * @param delegator The address of the delegator
     * @return The total amount of rewards available to be claimed by the delegator
     */
    function getPendingRewards(address delegator) external view returns (uint256) {
        uint currIndex = _getCurrentRewardsIndex();
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

        // Calculate the total pending rewards for all delegators
        uint256 totalPendingRewards = 0;
        uint256 currentRewardIndex = _getCurrentRewardsIndex();
        uint256 totalSupply = totalSupply();

        if (totalSupply > 0) {
            for (uint256 i = 0; i < totalSupply; i++) {
                address delegator = _getDelegatorAtIndex(i);
                uint256 pendingRewards = balanceOf(delegator) * (currentRewardIndex - startRewardIndex[delegator]) / 1e18;
                totalPendingRewards += pendingRewards;
            }
        }

        // Ensure that the amount is less than the available rewards minus pending rewards
        require(amount <= availableRewards - totalPendingRewards, "Amount must be less than available rewards minus pending rewards");

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

        // Check if the new delegation amount exceeds the cap
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

        _claimRewards(msg.sender); // updates the index and transfers rewards
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
     * @notice Internal function to claim rewards for a delegator
     * @param delegator The address of the delegator
     */
    function _claimRewards(address delegator) internal {
        _updateRewardsIndex();
        uint pendingRewards = balanceOf(delegator) * (rewardIndex - startRewardIndex[delegator]) / 1e18;
        startRewardIndex[msg.sender] = rewardIndex;
        compToken.transfer(msg.sender, pendingRewards);
        emit ClaimRewards(msg.sender, pendingRewards);
    }

    /**
     * @notice Updates the reward index based on how much time has passed and the rewards rate
     */
    function _updateRewardsIndex() internal {
        // How much time has passed since the last update?
        uint256 timeDelta = block.timestamp - lastRewarded;

        // How much COMP is to be allocated to rewards?
        uint256 rewards = timeDelta * rewardRate;

        // Adjust the available rewards by the amount allocated
        if (rewards > availableRewards) {
            availableRewards = 0;
            rewards = availableRewards;
        } else {
            availableRewards -= rewards;
        }

        // Update the reward index
        uint supply = totalSupply();
        if (supply > 0) {
            rewardIndex += rewards * 1e18 / supply;
        }

        // Update the last rewarded timestamp
        lastRewarded = block.timestamp;
    }

    /**
     * @notice Returns the current rewards index, adjusted for time since last rewarded
     * @return The current reward index
     */
    function _getCurrentRewardsIndex() internal view returns (uint256) {
        uint256 timeDelta = block.timestamp - lastRewarded;
        uint256 rewards = timeDelta * rewardRate;
        uint supply = totalSupply();
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
     * @notice Overrides the _transfer function to block transfers
     * @param from The address sending tokens
     * @param to The address receiving tokens
     * @param amount The amount of tokens to transfer
     */
    function _transfer(address from, address to, uint256 amount) internal override {
        require(from == address(0) || to == address(0), "Transfers are disabled");
        super._transfer(from, to, amount);
    }
}
