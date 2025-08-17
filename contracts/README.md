# Compensator Specs

## Architecture

### Core Contracts

1. **CompensatorFactory** - Factory contract for deploying and managing Compensator instances
2. **Compensator** - Individual delegate contracts with advanced delegation, staking, and voting capabilities
3. **Interfaces** - IComp, IGovernor, and ICompensator for type safety and integration

### Key Features

- **Factory-Based Deployment**: Each delegate gets their own isolated Compensator instance
- **Advanced Reward System**: Index-based reward distribution with time-based accrual
- **Proposal Staking**: Delegators can stake COMP on proposal outcomes (For/Against)
- **Enhanced Security**: ReentrancyGuard, custom errors, and comprehensive access control
- **Ownership Management**: Sophisticated ownership transfer system with factory synchronization

## CompensatorFactory Contract

### State Variables

```solidity
address[] public compensators                    // All deployed Compensator contracts
mapping(address => address) public ownerToCompensator  // Owner to Compensator mapping
mapping(address => address) public compensatorToOriginalOwner  // Reverse mapping for ownership tracking
address public immutable COMP_TOKEN              // COMP governance token
address public immutable COMPOUND_GOVERNOR       // Compound Governor contract
```

### Core Functions

#### `createCompensator(address owner)`
- Creates a new Compensator contract for the specified owner
- Validates owner address and prevents duplicate deployments
- Tracks the contract in factory mappings
- Returns the deployed contract address

#### `createCompensatorForSelf()`
- Convenience function for callers to create their own Compensator
- Calls `createCompensator(msg.sender)`

#### `onOwnershipTransferred(address oldOwner, address newOwner)`
- Callback function for Compensator contracts to notify factory of ownership changes
- Updates factory mappings to maintain consistency
- Emits ownership transfer events

### Events

```solidity
event CompensatorCreated(address indexed owner, address indexed compensator)
event CompensatorOwnershipTransferred(address indexed compensator, address indexed oldOwner, address indexed newOwner)
```

## Compensator Contract

### State Variables

#### Core Configuration
```solidity
address public owner                              // Contract owner/delegate
uint256 public availableRewards                   // COMP available for rewards
uint256 public rewardRate                         // Reward rate in COMP/second
uint256 public rewardIndex                        // Global reward distribution index
uint256 public lastRewarded                       // Last reward distribution timestamp
uint256 public totalDelegatedCOMP                 // Total COMP delegated to contract
uint256 public delegationCap                      // Maximum delegation (5% of total COMP supply)
uint256 public totalPendingRewards                // Total accrued but unclaimed rewards
```

#### Time Constants
```solidity
uint256 constant MIN_LOCK_PERIOD = 7 days                    // Minimum delegation lock
uint256 constant ACTIVE_PROPOSAL_LOCK_EXTENSION = 3 days     // Lock extension for active proposals
uint256 constant MAX_PROPOSAL_RESOLUTION_TIME = 30 days      // Maximum proposal resolution time
```

#### Delegation Management
```solidity
mapping(address => uint256) public unlockTime                 // Delegator unlock timestamps
mapping(address => uint256) public unclaimedRewards          // Individual unclaimed rewards
mapping(address => uint256) public startRewardIndex          // Starting reward index per delegator
```

#### Proposal Management
```solidity
uint256 public latestProposalId                              // Latest seen proposal ID
mapping(uint256 => bool) public activeProposals              // Active proposal tracking
mapping(uint256 => bool) public pendingProposals             // Pending proposal tracking
mapping(uint256 => uint256) public proposalCreationTime      // Proposal creation timestamps
mapping(uint256 => bool) public contractVoted                // Contract voting status
mapping(uint256 => uint8) public contractVoteDirection       // Contract vote direction
```

#### Staking System
```solidity
mapping(uint256 => mapping(address => ProposalStake)) public proposalStakes  // Individual stakes per proposal
mapping(uint256 => uint256) public totalStakesFor            // Total stakes for each proposal
mapping(uint256 => uint256) public totalStakesAgainst        // Total stakes against each proposal
```

### Structs

#### ProposalStake
```solidity
struct ProposalStake {
    uint128 forStake;        // Amount staked in support
    uint128 againstStake;     // Amount staked against
}
```

#### VoteInfo
```solidity
struct VoteInfo {
    uint8 direction;          // Vote direction (0 = Against, 1 = For)
    uint256 blockNumber;      // Block when vote was cast
    bytes32 txHash;           // Transaction hash
    uint256 timestamp;        // Vote timestamp
    uint256 votingPower;      // Voting power used
    string reason;            // Optional vote reason
}
```

#### DelegateInfo
```solidity
struct DelegateInfo {
    uint256 successfulVotes;      // Number of successful votes
    uint256 totalVotes;           // Total votes cast
    uint256 totalRewardsEarned;   // Total rewards earned
}
```

### Core Functions

#### Delegation Management

##### `delegate(address delegator, uint256 amount)`
- Allows COMP holders to delegate voting power
- Calculates and distributes pending rewards
- Updates delegation tracking and lock periods
- Emits delegation events

##### `undelegate(uint256 amount)`
- Allows delegators to withdraw COMP (after lock period)
- Calculates final rewards before withdrawal
- Updates delegation state and tracking

#### Reward System

##### `setRewardRate(uint256 newRate)`
- Allows owner to set reward distribution rate
- Validates rate changes and updates state
- Recalculates reward indices

##### `claimRewards()`
- Allows delegators to claim accrued rewards
- Calculates rewards based on time and delegation amount
- Updates reward tracking and distributes COMP

#### Proposal Staking

##### `stakeOnProposal(uint256 proposalId, bool isFor, uint256 amount)`
- Allows delegators to stake COMP on proposal outcomes
- Validates proposal state and delegation status
- Updates staking tracking and locks COMP

##### `reclaimStakes(uint256 proposalId)`
- Allows delegators to reclaim stakes after proposal resolution
- Calculates winnings/losses based on delegate voting
- Distributes rewards and returns stakes

#### Voting

##### `castVote(uint256 proposalId, uint8 support, string reason)`
- Allows contract owner to cast votes on Compound governance
- Validates proposal state and voting eligibility
- Records vote information and updates state
- Integrates with Compound Governor contract

#### Ownership Management

##### `transferOwnership(address newOwner)`
- Overrides OpenZeppelin's transferOwnership
- Notifies factory of ownership changes
- Maintains factory mapping consistency
- Includes comprehensive validation

### Security Features

#### Access Control
- **Ownable Pattern**: Only contract owner can perform administrative functions
- **Factory Validation**: Ensures only factory-created contracts can call factory functions
- **Delegation Validation**: Comprehensive checks for delegation and staking operations

#### Reentrancy Protection
- **ReentrancyGuard**: All external calls are protected against reentrancy attacks
- **State Updates**: State changes occur before external calls
- **Checks-Effects-Interactions Pattern**: Strict adherence to security best practices

#### Input Validation
- **Custom Errors**: Gas-efficient error handling with descriptive messages
- **Boundary Checks**: Comprehensive validation of all input parameters
- **State Validation**: Ensures operations only occur in valid contract states

#### Economic Safeguards
- **Delegation Caps**: Prevents single delegate from accumulating excessive power (5% max)
- **Lock Periods**: Prevents rapid delegation/undelegation attacks
- **Reward Limits**: Prevents reward rate manipulation

### Custom Errors

```solidity
error InvalidCompTokenAddress()
error InvalidCompoundGovernorAddress()
error InvalidOwnerAddress()
error InvalidCompTotalSupply()
error DelegationCapTooSmall()
error VoteIndexOutOfBounds()
error AmountMustBeGreaterThanZero()
error AmountExceedsAvailableRewards()
error RewardRateMustBeNonNegative()
error NewRateMustBeDifferent()
error RewardRateTooHigh()
error InvalidSupportValue()
error AlreadyVotedOnProposal()
error InvalidProposalState()
error ProposalAlreadyResolved()
error ProposalDoesNotExist()
error ProposalNotResolvedYet()
error NoStakeToReclaim()
error InvalidBlocksPerDay()
error NewOwnerCannotBeZeroAddress()
error CompIsLocked()
error CannotWithdrawWithActiveStakes()
error InsufficientBalance()
error NoRewardsToClaim()
error DelegationCapExceeded()
error StakingOnlyAllowedForActiveProposals()
error InvalidProposalId()
error CompensatorTokensNotTransferable()
```

## Integration Points

### Compound Protocol
- **COMP Token**: Standard ERC20 integration for delegation and rewards
- **Compound Governor**: Governance proposal integration and voting
- **Proposal States**: Real-time proposal status tracking

### External Systems
- **Factory Contract**: Contract deployment and ownership management
- **Event System**: Comprehensive event emission for off-chain tracking
- **Index-Based Rewards**: Efficient reward calculation and distribution

## Gas Optimization

### Storage Optimization
- **Packed Structs**: Efficient storage layout for ProposalStake
- **Immutable Variables**: Gas savings for constant values
- **Mapping Efficiency**: Optimized data structure usage

### Function Optimization
- **Batch Operations**: Efficient handling of multiple operations
- **Early Returns**: Gas savings through early exit conditions
- **Custom Errors**: Reduced gas costs compared to require statements

## Testing & Verification

### Test Coverage
- **224+ Tests**: Comprehensive test suite covering all functionality
- **Security Tests**: Access control and vulnerability testing
- **Integration Tests**: End-to-end workflow validation
- **Gas Tests**: Performance and optimization verification

### Audit Considerations
- **Access Control**: Comprehensive ownership and permission validation
- **Economic Security**: Delegation caps and reward rate limits
- **State Consistency**: Factory synchronization and mapping integrity
- **Integration Security**: Safe external contract interactions

## Deployment

### Prerequisites
- COMP token address: `0xc00e94cb662c3520282e6f5717214004a7f26888`
- Compound Governor address: `0x309a862bbC1A00e45506cB8A802D1ff10004c8C0`
- Factory deployment with proper constructor parameters

### Post-Deployment
- Factory address update in frontend configuration
- Contract verification on Etherscan
- Test delegate creation and basic functionality
- Monitor gas usage and performance metrics

## Security Contact

For security concerns or vulnerabilities, please contact the development team through the Compound Discord community.
