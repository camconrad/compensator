# Compensator Specs

## Architecture

### Core Contracts

1. **CompensatorFactory** - Factory contract for deploying and managing Compensator instances
2. **Compensator** - Individual delegate contracts with delegation and reward distribution capabilities
3. **Interfaces** - IComp and ICompensator for type safety and integration

### Key Features

- **Factory-Based Deployment**: Each delegate gets their own isolated Compensator instance
- **Advanced Reward System**: Index-based reward distribution with time-based accrual
- **Delegation Management**: Efficient COMP token delegation with proportional reward distribution
- **Governance Participation**: Full voting capabilities with accumulated voting power
- **Enhanced Security**: ReentrancyGuard, custom errors, and comprehensive access control
- **Ownership Management**: Sophisticated ownership transfer system with factory synchronization

## CompensatorFactory Contract

### State Variables

```solidity
address[] public compensators                    // All deployed Compensator contracts
mapping(address => address) public ownerToCompensator  // Owner to Compensator mapping
mapping(address => address) public compensatorToOriginalOwner  // Reverse mapping for ownership tracking
address public immutable COMP_TOKEN              // COMP governance token
address public immutable GOVERNOR                // Compound Governor contract
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

#### Delegation Management
```solidity
mapping(address => uint256) public unclaimedRewards          // Individual unclaimed rewards
mapping(address => uint256) public startRewardIndex          // Starting reward index per delegator
```

#### Governance Integration
```solidity
IGovernor public immutable GOVERNOR                          // Compound Governor contract
mapping(uint256 => bool) public contractVoted                // Tracks votes cast by contract
mapping(uint256 => uint8) public contractVoteDirection       // Vote direction for each proposal
```

### Core Functions

#### Delegation Management

##### `userDeposit(uint256 amount)`
- Allows COMP holders to delegate COMP tokens
- Calculates and distributes pending rewards
- Updates delegation tracking
- Emits delegation events

##### `userWithdraw(uint256 amount)`
- Allows delegators to withdraw COMP
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

#### Ownership Management

##### `transferOwnership(address newOwner)`
- Overrides OpenZeppelin's transferOwnership
- Notifies factory of ownership changes
- Maintains factory mapping consistency
- Includes comprehensive validation

#### Governance Functions

##### `castVote(uint256 proposalId, uint8 support)`
- Allows owner to cast votes using contract's voting power
- Validates support value (0=Against, 1=For, 2=Abstain)
- Prevents duplicate voting on same proposal
- Verifies proposal state before voting

##### `castVote(uint256 proposalId, uint8 support, string memory reason)`
- Same as above but includes voting reason
- Provides transparency for governance decisions

##### `hasVoted(uint256 proposalId)`
- Checks if contract has voted on specific proposal
- Returns boolean indicating vote status

##### `getVotingPowerAt(uint256 blockNumber)`
- Returns contract's voting power at specific block
- Useful for historical voting power queries

### Security Features

#### Access Control
- **Ownable Pattern**: Only contract owner can perform administrative functions
- **Factory Validation**: Ensures only factory-created contracts can call factory functions
- **Delegation Validation**: Comprehensive checks for delegation operations

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
- **Reward Limits**: Prevents reward rate manipulation

### Custom Errors

```solidity
error InvalidCompTokenAddress()
error InvalidOwnerAddress()
error InvalidCompTotalSupply()
error DelegationCapTooSmall()
error AmountMustBeGreaterThanZero()
error AmountExceedsAvailableRewards()
error RewardRateMustBeNonNegative()
error NewRateMustBeDifferent()
error RewardRateTooHigh()
error NewOwnerCannotBeZeroAddress()
error InsufficientBalance()
error NoRewardsToClaim()
error DelegationCapExceeded()
error CompensatorTokensNotTransferable()
error InvalidSupportValue()
error AlreadyVotedOnProposal()
error InvalidProposalState()
```

## Integration Points

### Compound Protocol
- **COMP Token**: Standard ERC20 integration for delegation and rewards
- **Compound Governor**: Full integration for governance participation and voting

### External Systems
- **Factory Contract**: Contract deployment and ownership management
- **Event System**: Comprehensive event emission for off-chain tracking
- **Index-Based Rewards**: Efficient reward calculation and distribution

## Gas Optimization

### Storage Optimization
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
- Factory deployment with proper constructor parameters (COMP token + Governor)

### Post-Deployment
- Factory address update in frontend configuration
- Contract verification on Etherscan
- Test delegate creation and basic functionality
- Test governance voting functionality
- Monitor gas usage and performance metrics

## Governance Integration

### Voting Mechanism
The Compensator contract integrates with Compound's governance system to allow delegates to vote using the accumulated voting power from all delegators.

### Key Features
- **Full Vote Support**: Against (0), For (1), and Abstain (2) votes
- **Vote Validation**: Ensures votes are only cast on valid, active proposals
- **Duplicate Prevention**: Prevents voting multiple times on the same proposal
- **Transparency**: All votes are tracked and events are emitted
- **Owner Control**: Only the contract owner (delegate) can cast votes

### Voting Flow
1. Delegators deposit COMP → Voting power accumulates in the contract
2. Compound proposal goes live → Delegate decides how to vote
3. Delegate calls `castVote()` → Contract votes with full accumulated power
4. Vote is recorded and transparent to all participants

### Security Considerations
- **Access Control**: Only contract owner can vote
- **Proposal Validation**: Votes only accepted on valid proposals
- **State Verification**: Proposal must be in Active or Pending state
- **Vote Tracking**: Prevents duplicate voting and provides transparency

## Security Contact

For security concerns or vulnerabilities, please contact the development team through the Compound Discord community.
