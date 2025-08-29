# Fork Testing Guide

This directory contains fork-based integration tests that test your Compensator contracts against **real mainnet contracts**.

## 🚀 What is Fork Testing?

Fork testing allows you to:
- **Test against real mainnet contracts** (COMP token, etc.)
- **Simulate real network conditions** (gas prices, block times, etc.)
- **Catch integration issues early** before deployment
- **Test with real token mechanics** and governance systems

## 📋 Prerequisites

### 1. Environment Variables
Create a `.env` file in your project root:

```bash
# Required: Mainnet RPC URL
MAINNET_RPC_URL=https://eth.llamarpc.com

# Optional: Specific block number to fork from
FORK_BLOCK_NUMBER=19000000

# Optional: Private key for mainnet testing
PRIVATE_KEY=your_private_key_here
```

### 2. RPC Provider
You need a reliable mainnet RPC provider. Recommended options:
- **Alchemy**: `https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY`
- **Infura**: `https://mainnet.infura.io/v3/YOUR_API_KEY`
- **LlamaRPC**: `https://eth.llamarpc.com` (free tier available)

## 🧪 Running Fork Tests

### Run All Fork Tests
```bash
npm run test:fork
```

### Run Fork Tests Manually
```bash
# With environment variables
MAINNET_RPC_URL=https://eth.llamarpc.com npx hardhat test test/fork/

# With specific block number
MAINNET_RPC_URL=https://eth.llamarpc.com FORK_BLOCK_NUMBER=19000000 npx hardhat test test/fork/
```

### Run Specific Fork Test Categories
```bash
# Only fork tests
npx hardhat test test/fork/CompensatorForkTests.js

# Fork tests with verbose output
npx hardhat test test/fork/ --verbose
```

## 🔧 Configuration

### Hardhat Configuration
The fork configuration is in `hardhat.config.js`:

```javascript
networks: {
  hardhat: {
    chainId: 31337,
    // Uncomment to enable forking for all tests
    // forking: {
    //   url: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com",
    //   blockNumber: process.env.FORK_BLOCK_NUMBER ? parseInt(process.env.FORK_BLOCK_NUMBER) : undefined,
    // }
  },
  // Dedicated forked network
  hardhatFork: {
    url: "http://127.0.0.1:8545",
    forking: {
      url: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com",
      blockNumber: process.env.FORK_BLOCK_NUMBER ? parseInt(process.env.FORK_BLOCK_NUMBER) : undefined,
    }
  }
}
```

### Test Configuration
Fork tests have extended timeouts and special handling:

```javascript
const FORK_TIMEOUT = 60000; // 60 seconds for fork tests

beforeEach(async function () {
  this.timeout(FORK_TIMEOUT);
  // ... test setup
});
```

## 🏗️ Test Structure

### ForkTestBase Class
Located in `test/helpers/ForkTestBase.js`, provides:

- **Network detection** - Automatically detects forked vs local networks
- **Mainnet contract setup** - Pre-configured real contract addresses
- **Account impersonation** - Test with mainnet accounts
- **Balance manipulation** - Set balances for testing
- **Time manipulation** - Advance blocks and time

### Mainnet Contracts
Pre-configured real mainnet addresses:

```javascript
mainnetContracts: {
  COMP_TOKEN: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
  
  USDC: "0xA0b86a33E6441b8c4C8C0b4b4C8C0b4b4C8C0b4b",
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  UNISWAP_V2_ROUTER: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
}
```

## 📊 Test Categories

### 1. Fork Network Detection
- Verifies fork network is working correctly
- Checks mainnet contract availability

### 2. Real Contract Integration
- Tests against real COMP token

- Verifies real contract functionality

### 3. Compensator on Fork
- Deploys Compensator on forked network
- Tests deposits with real token mechanics
- Tests reward distribution on fork

### 4. Fork-Specific Edge Cases
- Mainnet gas price fluctuations
- Block time variations
- Network-specific conditions

### 5. Performance on Fork
- Performance testing with real contracts
- Gas usage on forked network

## ⚠️ Important Notes

### Fallback Behavior
If fork setup fails, tests automatically fall back to mock contracts:

```javascript
if (forkTestBase.isNetworkForked()) {
  // Use real mainnet contracts
  console.log("🔄 Using forked mainnet contracts");
} else {
  // Fallback to mock contracts
  console.log("🧪 Using local mock contracts");
}
```

### Test Skipping
Some tests automatically skip on local networks:

```javascript
it("should interact with real COMP token on fork", async function () {
  if (!forkTestBase.isNetworkForked()) {
    console.log("⏭️  Skipping real contract test on local network");
    this.skip();
  }
  // ... test logic
});
```

### Timeouts
Fork tests have extended timeouts due to network calls:

```javascript
const FORK_TIMEOUT = 60000; // 60 seconds
this.timeout(FORK_TIMEOUT);
```

## 🚨 Troubleshooting

### Common Issues

1. **RPC Rate Limiting**
   - Use a paid RPC provider for heavy testing
   - Implement delays between tests if needed

2. **Fork Sync Issues**
   - Try different block numbers
   - Use a more recent block number

3. **Environment Variables**
   - Ensure `.env` file exists
   - Check RPC URL is accessible

4. **Network Configuration**
   - Verify hardhat config is correct
   - Check network connectivity

### Debug Commands

```bash
# Check network status
npx hardhat node --fork https://eth.llamarpc.com

# Test RPC connection
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://eth.llamarpc.com

# Run with verbose logging
DEBUG=hardhat:* npx hardhat test test/fork/
```

## 🔮 Future Enhancements

- **Multi-network forking** (Polygon, Arbitrum, etc.)
- **Automated fork management** (auto-sync, block selection)
- **Fork state persistence** (save/restore fork state)
- **Performance benchmarking** (fork vs local comparison)
- **Integration with CI/CD** (automated fork testing)

## 📚 Related Documentation

- [Hardhat Forking Guide](https://hardhat.org/hardhat-network/docs/guides/forking-other-networks)
- [Compound Finance Contracts](https://docs.compound.finance/)
- [Ethereum Mainnet](https://ethereum.org/en/developers/docs/networks/)
- [RPC Provider Comparison](https://ethereum.org/en/developers/docs/apis/json-rpc/)
