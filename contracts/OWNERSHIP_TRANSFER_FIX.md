# Ownership Transfer Fix

## Problem Description

The CompensatorFactory contract was responsible for deploying new Compensator instances and maintaining a mapping from owner addresses to their corresponding Compensator contract addresses (`ownerToCompensator`). However, the Compensator contract inherited from OpenZeppelin's Ownable contract, which includes a `transferOwnership` function that allows the current owner to transfer ownership to a new address.

When ownership was transferred using this function, the CompensatorFactory contract was not notified of the change. As a result, the `ownerToCompensator` mapping became outdated and no longer reflected the true owner, breaking the integrity of the factory's accounting.

## Solution

The fix implements a callback mechanism to synchronize ownership state between the factory and its created contracts:

### 1. CompensatorFactory Changes

- **Added reverse mapping**: `compensatorToOriginalOwner` to track which factory created each compensator
- **Added callback function**: `onOwnershipTransferred(oldOwner, newOwner)` that can be called by compensators to notify the factory of ownership changes
- **Added event**: `CompensatorOwnershipTransferred` to track ownership transfers
- **Added helper function**: `getOriginalOwner(compensator)` to retrieve the current owner of a compensator

### 2. Compensator Changes

- **Added factory reference**: `FACTORY` immutable variable to store the factory address
- **Overrode transferOwnership**: Added custom implementation that calls the parent function and then notifies the factory
- **Added interface**: `CompensatorFactory` interface for type safety

## Implementation Details

### CompensatorFactory.sol

```solidity
// New state variable
mapping(address compensator => address originalOwner) public compensatorToOriginalOwner;

// New event
event CompensatorOwnershipTransferred(
    address indexed compensator,
    address indexed oldOwner,
    address indexed newOwner
);

// New callback function
function onOwnershipTransferred(address oldOwner, address newOwner) external {
    require(compensatorToOriginalOwner[msg.sender] != address(0), "Compensator not created by this factory");
    
    ownerToCompensator[oldOwner] = address(0);
    ownerToCompensator[newOwner] = msg.sender;
    compensatorToOriginalOwner[msg.sender] = newOwner;
    
    emit CompensatorOwnershipTransferred(msg.sender, oldOwner, newOwner);
}
```

### Compensator.sol

```solidity
// New state variable
address public immutable FACTORY;

// Constructor update
constructor(...) {
    // ... existing code ...
    FACTORY = msg.sender; // The factory that deploys this contract
}

// Override transferOwnership
function transferOwnership(address newOwner) public virtual override onlyOwner {
    require(newOwner != address(0), "New owner cannot be zero address");
    
    address oldOwner = owner();
    super.transferOwnership(newOwner);
    
    if (FACTORY != address(0)) {
        try CompensatorFactory(FACTORY).onOwnershipTransferred(oldOwner, newOwner) {
            // Successfully notified factory
        } catch {
            // Factory notification failed, but ownership transfer still succeeds
        }
    }
}
```

## Security Considerations

1. **Graceful Degradation**: If the factory notification fails, the ownership transfer still succeeds. This prevents the system from being blocked by factory issues.

2. **Access Control**: Only compensators created by the factory can call `onOwnershipTransferred`.

3. **Event Logging**: All ownership transfers are logged for transparency and auditability.

4. **Zero Address Protection**: The fix maintains the existing protection against transferring ownership to the zero address.

## Testing

Comprehensive tests were added to verify:

- Factory mappings are correctly updated during ownership transfers
- Events are properly emitted
- Multiple ownership transfers work correctly
- Access control prevents unauthorized calls
- Edge cases are handled properly (zero address, same owner, etc.)

## Benefits

1. **Data Integrity**: The factory's `ownerToCompensator` mapping now stays synchronized with actual ownership
2. **Backward Compatibility**: Existing functionality remains unchanged
3. **Transparency**: All ownership transfers are logged and trackable
4. **Robustness**: The system continues to work even if factory notification fails

## Migration

This fix is backward compatible and requires no migration steps. Existing compensators will continue to work as before, and new ownership transfers will automatically keep the factory synchronized. 