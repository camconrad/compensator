require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("@nomicfoundation/hardhat-chai-matchers");
require("@typechain/hardhat");
require("solidity-coverage");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      // Uncomment to enable forking for specific tests
      // forking: {
      //   url: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com",
      //   blockNumber: process.env.FORK_BLOCK_NUMBER ? parseInt(process.env.FORK_BLOCK_NUMBER) : undefined,
      // }
    },
    // Forked mainnet for integration testing
    hardhatFork: {
      url: "http://127.0.0.1:8545",
      forking: {
        url: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com",
        blockNumber: process.env.FORK_BLOCK_NUMBER ? parseInt(process.env.FORK_BLOCK_NUMBER) : undefined,
      }
    },
    mainnet: {
      url: "https://eth.llamarpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
  mocha: {
    timeout: 120000,
  },
};
