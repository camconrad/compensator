# Deployment Guide

## Prerequisites

1. **Environment Setup**
   ```bash
   # Install dependencies
   yarn install
   
   # Set up environment variables
   cp .env.example .env
   ```

2. **Required Environment Variables**
   ```bash
   # .env file
   PRIVATE_KEY=your_deployment_private_key
   ETHERSCAN_API_KEY=your_etherscan_api_key
   MAINNET_RPC_URL=your_mainnet_rpc_url
   ```

## Production Deployment

### Step 1: Deploy CompensatorFactory

```bash
# Deploy to mainnet
yarn hardhat run scripts/deploy.ts --network mainnet
```

This will deploy the `CompensatorFactory` with the correct production addresses:
- **COMP Token**: `0xc00e94cb662c3520282e6f5717214004a7f26888`


### Step 2: Update Environment Configuration

After deployment, add the factory address to your `.env` file:

```bash
# .env file
FACTORY_ADDRESS=your_deployed_factory_address
```

The frontend will automatically use this address from the environment variable.

### Step 3: Create Compensator Instances

Once the factory is deployed, delegates can create their Compensator instances:

```solidity
// Call on the factory contract
function createCompensatorForSelf() external returns (address)
```

## Contract Addresses

| Contract | Address | Description |
|----------|---------|-------------|
| COMP Token | `0xc00e94cb662c3520282e6f5717214004a7f26888` | Compound governance token |

| CompensatorFactory | `[DEPLOYED]` | Factory for creating Compensator instances |

## Verification

### Factory Verification
The deployment script verifies the factory contract on Etherscan with the correct constructor arguments. If verification fails, you can manually verify:

```bash
yarn hardhat verify --network mainnet FACTORY_ADDRESS COMP_TOKEN_ADDRESS
```

**Note**: The constructor arguments (COMP_TOKEN_ADDRESS) are required for verification because they're used in the factory's constructor.

### Compensator Instance Verification
To verify individual Compensator instances created by the factory:

```bash
npx hardhat run scripts/verify-compensators.ts --network mainnet FACTORY_ADDRESS
```

**Note**: The verification script automatically reads the constructor arguments (COMP_TOKEN_ADDRESS and owner address) from each deployed Compensator instance.

## Post-Deployment Checklist

- [ ] Factory deployed successfully
- [ ] Contract verified on Etherscan
- [ ] Frontend configuration updated
- [ ] Test delegate creation
- [ ] Test COMP delegation


## Security Notes

- The factory uses immutable addresses for COMP token
- Each delegate gets their own isolated Compensator instance
- All critical functions use ReentrancyGuard
- Delegation is capped at 5% of total COMP supply per instance 