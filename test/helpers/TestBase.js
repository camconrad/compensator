const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

class TestBase {
  constructor() {
    this.accounts = [];
    this.compToken = null;
    this.compoundGovernor = null;
    this.compensator = null;
    this.compensatorFactory = null;
    this.delegate = null;
    this.delegator1 = null;
    this.delegator2 = null;
    this.delegator3 = null;
    this.voteRecorder = null;
    this.owner = null;
  }

  async setup() {
    [this.owner, this.delegate, this.delegator1, this.delegator2, this.delegator3, this.voteRecorder] = 
      await ethers.getSigners();
    
    this.accounts = [this.owner, this.delegate, this.delegator1, this.delegator2, this.delegator3, this.voteRecorder];
    
    // Deploy mock contracts for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    this.compToken = await MockToken.deploy("COMP", "COMP");
    await this.compToken.waitForDeployment();
    
    // Mint initial supply to ensure totalSupply > 0 for Compensator constructor
    await this.compToken.mint(this.delegate.address, ethers.parseEther("1000000")); // 1M COMP initial supply
    
    const MockGovernor = await ethers.getContractFactory("MockGovernor");
    this.compoundGovernor = await MockGovernor.deploy();
    await this.compoundGovernor.waitForDeployment();
    
    // Deploy CompensatorFactory
    const CompensatorFactory = await ethers.getContractFactory("contracts/CompensatorFactory.sol:CompensatorFactory");
    this.compensatorFactory = await CompensatorFactory.deploy(
      await this.compToken.getAddress(),
      await this.compoundGovernor.getAddress()
    );
    await this.compensatorFactory.waitForDeployment();
    
    // Create a compensator for the delegate
    await this.compensatorFactory.createCompensator(this.delegate.address);
    const compensatorAddress = await this.compensatorFactory.ownerToCompensator(this.delegate.address);
    
    // Deploy Compensator contract
    const Compensator = await ethers.getContractFactory("Compensator");
    this.compensator = await Compensator.attach(compensatorAddress);
    
    // Fund additional accounts for testing
    await this.compToken.mint(this.delegator1.address, ethers.parseEther("10000"));
    await this.compToken.mint(this.delegator2.address, ethers.parseEther("10000"));
    await this.compToken.mint(this.delegator3.address, ethers.parseEther("10000"));
    
    return {
      compensator: this.compensator,
      compToken: this.compToken,
      compoundGovernor: this.compoundGovernor,
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      voteRecorder: this.voteRecorder,
      owner: this.owner
    };
  }

  async setupWithRewards() {
    await this.setup();
    
    // Setup: Delegate deposits rewards and sets reward rate
    const compensatorAddress = await this.compensator.getAddress();
    await this.compToken.connect(this.delegate).approve(compensatorAddress, ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).ownerDeposit(ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).setRewardRate(ethers.parseEther("1"));
    
    return {
      compensator: this.compensator,
      compToken: this.compToken,
      compoundGovernor: this.compoundGovernor,
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      voteRecorder: this.voteRecorder,
      owner: this.owner
    };
  }

  async setupWithStakes() {
    await this.setupWithRewards();
    
    // Setup: Delegators stake tokens
    const compensatorAddress = await this.compensator.getAddress();
    await this.compToken.connect(this.delegator1).approve(compensatorAddress, ethers.parseEther("100"));
    await this.compensator.connect(this.delegator1).userDeposit(ethers.parseEther("100"));
    
    await this.compToken.connect(this.delegator2).approve(compensatorAddress, ethers.parseEther("50"));
    await this.compensator.connect(this.delegator2).userDeposit(ethers.parseEther("50"));
    
    return {
      compensator: this.compensator,
      compToken: this.compToken,
      compoundGovernor: this.compoundGovernor,
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      voteRecorder: this.voteRecorder,
      owner: this.owner
    };
  }

  // Helper methods
  async timeTravel(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  }

  async setNextBlockTimestamp(timestamp) {
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
  }

  async mineBlock() {
    await ethers.provider.send("evm_mine");
  }

  // Utility functions for assertions
  expectApproxEqual(actual, expected, tolerance = 1000) {
    const diff = Math.abs(Number(actual) - Number(expected));
    return diff <= tolerance;
  }

  // Helper for creating multiple compensators
  async createMultipleCompensators(count) {
    const signers = await ethers.getSigners();
    const compensators = [];
    
    for (let i = 0; i < count; i++) {
      const signer = signers[i + 6]; // Start from index 6 to avoid conflicts
      await this.compensatorFactory.createCompensator(signer.address);
      const address = await this.compensatorFactory.ownerToCompensator(signer.address);
      compensators.push(address);
    }
    
    return compensators;
  }

  // Helper for testing with different amounts
  getTestAmounts() {
    return {
      small: ethers.parseEther("0.1"),
      medium: ethers.parseEther("100"),
      large: ethers.parseEther("10000"),
      veryLarge: ethers.parseEther("1000000")
    };
  }

  // Helper for testing with different time periods
  getTestTimePeriods() {
    return {
      short: 60, // 1 minute
      medium: 3600, // 1 hour
      long: 86400, // 1 day
      veryLong: 2592000 // 30 days
    };
  }
}

module.exports = TestBase;
