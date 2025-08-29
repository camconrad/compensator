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
- **Enhanced Security**: ReentrancyGuard, custom errors, and comprehensive access control
- **Ownership Management**: Sophisticated ownership transfer system with factory synchronization

## CompensatorFactory Contract

### State Variables

```solidity
address[] public compensators                    // All deployed Compensator contracts
mapping(address => address) public ownerToCompensator  // Owner to Compensator mapping
mapping(address => address) public compensatorToOriginalOwner  // Reverse mapping for ownership tracking
address public immutable COMP_TOKEN              // COMP governance token
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
```

## Integration Points

### Compound Protocol
- **COMP Token**: Standard ERC20 integration for delegation and rewards

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
- Factory deployment with proper constructor parameters

### Post-Deployment
- Factory address update in frontend configuration
- Contract verification on Etherscan
- Test delegate creation and basic functionality
- Monitor gas usage and performance metrics

## Security Contact

For security concerns or vulnerabilities, please contact the development team through the Compound Discord community.
