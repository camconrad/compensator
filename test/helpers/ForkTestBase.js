const { ethers } = require("hardhat");

/**
 * ForkTestBase - Base class for testing against forked mainnet
 * Provides utilities for interacting with real mainnet contracts
 */
class ForkTestBase {
  constructor() {
    this.isForked = false;
    this.forkBlockNumber = null;
    this.mainnetContracts = {};
  }

  /**
   * Setup for fork testing
   * @param {Object} options - Fork options
   * @param {string} options.rpcUrl - Mainnet RPC URL
   * @param {number} options.blockNumber - Block number to fork from
   */
  async setupFork(options = {}) {
    const { rpcUrl, blockNumber } = options;
    
    // Check if we're running on a forked network
    const network = await ethers.provider.getNetwork();
    this.isForked = network.chainId === 1n || network.chainId === 31337n;
    
    if (this.isForked) {
      console.log(`🔄 Running on forked network (Chain ID: ${network.chainId})`);
      
      if (blockNumber) {
        this.forkBlockNumber = blockNumber;
        console.log(`📦 Forked from block: ${blockNumber}`);
      }
      
      // Setup mainnet contract addresses
      await this.setupMainnetContracts();
    } else {
      console.log(`🧪 Running on local network (Chain ID: ${network.chainId})`);
    }
  }

  /**
   * Setup mainnet contract addresses and instances
   */
  async setupMainnetContracts() {
    // Real mainnet addresses
    this.mainnetContracts = {
      // Compound Finance contracts
      COMP_TOKEN: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
      COMPOUND_GOVERNOR: "0x309a862bbC1A00e45506cB8A802D1ff10004c8C0",
      
      // USDC for testing
      USDC: "0xA0b86a33E6441b8c4C8C0b4b4C8C0b4b4C8C0b4b",
      
      // WETH for testing
      WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      
      // Uniswap V2 Router for testing
      UNISWAP_V2_ROUTER: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    };

    console.log("🏗️  Mainnet contracts configured");
  }

  /**
   * Get mainnet contract instance
   * @param {string} contractName - Name of the contract
   * @param {string} abi - Contract ABI
   * @returns {Contract} Contract instance
   */
  async getMainnetContract(contractName, abi) {
    if (!this.isForked) {
      throw new Error("Not running on forked network");
    }
    
    const address = this.mainnetContracts[contractName];
    if (!address) {
      throw new Error(`Contract ${contractName} not found in mainnet contracts`);
    }
    
    return new ethers.Contract(address, abi, ethers.provider);
  }

  /**
   * Impersonate an account (useful for testing with mainnet accounts)
   * @param {string} address - Address to impersonate
   * @returns {Signer} Impersonated signer
   */
  async impersonateAccount(address) {
    if (!this.isForked) {
      throw new Error("Account impersonation only available on forked networks");
    }
    
    await ethers.provider.send("hardhat_impersonateAccount", [address]);
    return await ethers.getImpersonatedSigner(address);
  }

  /**
   * Set balance for an account (useful for testing)
   * @param {string} address - Address to set balance for
   * @param {string} balance - Balance in wei
   */
  async setBalance(address, balance) {
    if (!this.isForked) {
      throw new Error("Balance manipulation only available on forked networks");
    }
    
    await ethers.provider.send("hardhat_setBalance", [address, balance]);
  }

  /**
   * Get current block number
   * @returns {number} Current block number
   */
  async getCurrentBlock() {
    const block = await ethers.provider.getBlock("latest");
    return block.number;
  }

  /**
   * Mine a new block
   */
  async mineBlock() {
    await ethers.provider.send("evm_mine");
  }

  /**
   * Advance time and mine blocks
   * @param {number} seconds - Seconds to advance
   */
  async timeTravel(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await this.mineBlock();
  }

  /**
   * Check if we're running on a forked network
   * @returns {boolean} True if forked
   */
  isNetworkForked() {
    return this.isForked;
  }

  /**
   * Get fork information
   * @returns {Object} Fork details
   */
  getForkInfo() {
    return {
      isForked: this.isForked,
      forkBlockNumber: this.forkBlockNumber,
      mainnetContracts: Object.keys(this.mainnetContracts)
    };
  }
}

module.exports = ForkTestBase;
