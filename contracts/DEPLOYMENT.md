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
   ```

## Production Deployment

### Step 1: Deploy CompensatorFactory

```bash
# Deploy to mainnet
yarn hardhat run scripts/deploy.ts --network mainnet
```

This will deploy the `CompensatorFactory` with the correct production addresses:
- **COMP Token**: `0xc00e94cb662c3520282e6f5717214004a7f26888`
- **Compound Governor**: `0x309a862bbC1A00e45506cB8A802D1ff10004c8C0`

### Step 2: Update Frontend Configuration

After deployment, update the factory address in `constants/index.ts`:

```typescript
export const compensatorFactoryContractInfo: IContractInfo = {
  abi: compensatorFactoryAbi,
  address: "YOUR_DEPLOYED_FACTORY_ADDRESS", // Update this
};
```

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
| Compound Governor | `0x309a862bbC1A00e45506cB8A802D1ff10004c8C0` | Compound governance contract |
| CompensatorFactory | `[DEPLOYED]` | Factory for creating Compensator instances |

## Verification

The deployment script automatically verifies the contract on Etherscan with the correct constructor arguments. If verification fails, you can manually verify:

```bash
yarn hardhat verify --network mainnet FACTORY_ADDRESS COMP_TOKEN_ADDRESS COMPOUND_GOVERNOR_ADDRESS
```

**Note**: The constructor arguments (COMP_TOKEN_ADDRESS and COMPOUND_GOVERNOR_ADDRESS) are required for verification because they're used in the factory's constructor.

## Post-Deployment Checklist

- [ ] Factory deployed successfully
- [ ] Contract verified on Etherscan
- [ ] Frontend configuration updated
- [ ] Test delegate creation
- [ ] Test COMP delegation
- [ ] Test voting mechanism

## Security Notes

- The factory uses immutable addresses for COMP token and Compound Governor
- Each delegate gets their own isolated Compensator instance
- All critical functions use ReentrancyGuard
- Delegation is capped at 5% of total COMP supply per instance 