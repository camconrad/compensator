const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

class TestBase {
  constructor() {
    this.accounts = [];
    this.compToken = null;
    this.compensator = null;
    this.compensatorFactory = null;
    this.delegate = null;
    this.delegator1 = null;
    this.delegator2 = null;
    this.delegator3 = null;
    this.owner = null;
  }

  async setup() {
    [this.owner, this.delegate, this.delegator1, this.delegator2, this.delegator3] = 
      await ethers.getSigners();
    
    this.accounts = [this.owner, this.delegate, this.delegator1, this.delegator2, this.delegator3];
    
    // Deploy mock contracts for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    this.compToken = await MockToken.deploy("COMP", "COMP");
    await this.compToken.waitForDeployment();
    
    // Mint initial supply to ensure totalSupply > 0 for Compensator constructor
    await this.compToken.mint(this.delegate.address, ethers.parseEther("1000000")); // 1M COMP initial supply
    
    // Deploy MockGovernor
    const MockGovernor = await ethers.getContractFactory("contracts/mocks/MockGovernor.sol:MockGovernor");
    this.mockGovernor = await MockGovernor.deploy();
    await this.mockGovernor.waitForDeployment();
    
    // Deploy CompensatorFactory
    const CompensatorFactory = await ethers.getContractFactory("contracts/CompensatorFactory.sol:CompensatorFactory");
    this.compensatorFactory = await CompensatorFactory.deploy(
      await this.compToken.getAddress(),
      await this.mockGovernor.getAddress()
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
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      owner: this.owner
    };
  }

  async setupWithRewards() {
    await this.setup();
    
    // Setup: Owner deposits rewards and sets reward rate
    const compensatorAddress = await this.compensator.getAddress();
    await this.compToken.connect(this.delegate).approve(compensatorAddress, ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).ownerDeposit(ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).setRewardRate(ethers.parseEther("0.00000001"));
    
    return {
      compensator: this.compensator,
      compToken: this.compToken,
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      owner: this.owner
    };
  }

  async setupWithDelegations() {
    await this.setupWithRewards();
    
    // Setup: Users delegate COMP tokens
    const compensatorAddress = await this.compensator.getAddress();
    await this.compToken.connect(this.delegator1).approve(compensatorAddress, ethers.parseEther("100"));
    await this.compensator.connect(this.delegator1).userDeposit(ethers.parseEther("100"));
    
    await this.compToken.connect(this.delegator2).approve(compensatorAddress, ethers.parseEther("200"));
    await this.compensator.connect(this.delegator2).userDeposit(ethers.parseEther("200"));
    
    return {
      compensator: this.compensator,
      compToken: this.compToken,
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      owner: this.owner
    };
  }

  async setupWithRewardsAndTime() {
    await this.setupWithDelegations();
    
    // Advance time to generate rewards
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine");
    
    return {
      compensator: this.compensator,
      compToken: this.compToken,
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      owner: this.owner
    };
  }

  async setupForFactoryTests() {
    [this.owner, this.delegate] = await ethers.getSigners();
    
    // Deploy mock contracts for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    this.compToken = await MockToken.deploy("COMP", "COMP");
    await this.compToken.waitForDeployment();
    
    // Mint initial supply
    await this.compToken.mint(this.delegate.address, ethers.parseEther("1000000"));
    
    // Deploy CompensatorFactory
    const CompensatorFactory = await ethers.getContractFactory("contracts/CompensatorFactory.sol:CompensatorFactory");
    this.compensatorFactory = await CompensatorFactory.deploy(
      await this.compToken.getAddress()
    );
    await this.compensatorFactory.waitForDeployment();
    
    return {
      compToken: this.compToken,
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      owner: this.owner
    };
  }

  async setupForBasicTests() {
    [this.owner, this.delegate, this.delegator1, this.delegator2, this.delegator3] = 
      await ethers.getSigners();
    
    // Deploy mock contracts for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    this.compToken = await MockToken.deploy("COMP", "COMP");
    await this.compToken.waitForDeployment();
    
    // Mint initial supply
    await this.compToken.mint(this.delegate.address, ethers.parseEther("1000000"));
    
    // Deploy Compensator directly for basic testing
    const Compensator = await ethers.getContractFactory("Compensator");
    this.compensator = await Compensator.deploy(
      await this.compToken.getAddress(),
      this.delegate.address
    );
    await this.compensator.waitForDeployment();
    
    // Fund additional accounts for testing
    await this.compToken.mint(this.delegator1.address, ethers.parseEther("10000"));
    await this.compToken.mint(this.delegator2.address, ethers.parseEther("10000"));
    await this.compToken.mint(this.delegator3.address, ethers.parseEther("10000"));
    
    return {
      compensator: this.compensator,
      compToken: this.compToken,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      owner: this.owner
    };
  }

  async setupForSecurityTests() {
    await this.setup();
    
    // Setup: Owner deposits rewards and sets reward rate
    const compensatorAddress = await this.compensator.getAddress();
    await this.compToken.connect(this.delegate).approve(compensatorAddress, ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).ownerDeposit(ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).setRewardRate(ethers.parseEther("0.00000001"));
    
    return {
      compensator: this.compensator,
      compToken: this.compToken,
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      owner: this.owner
    };
  }

  async setupForPerformanceTests() {
    await this.setup();
    
    // Setup: Owner deposits rewards and sets reward rate
    const compensatorAddress = await this.compensator.getAddress();
    await this.compToken.connect(this.delegate).approve(compensatorAddress, ethers.parseEther("1000"));
    await this.compensator.connect(this.delegate).ownerDeposit(ethers.parseEther("1000"));
    await this.compensator.connect(this.delegate).setRewardRate(ethers.parseEther("0.00000001"));
    
    return {
      compensator: this.compensator,
      compToken: this.compToken,
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      owner: this.owner
    };
  }

  async setupForGasTests() {
    await this.setup();
    
    // Setup: Owner deposits rewards and sets reward rate
    const compensatorAddress = await this.compensator.getAddress();
    await this.compToken.connect(this.delegate).approve(compensatorAddress, ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).ownerDeposit(ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).setRewardRate(ethers.parseEther("0.00000001"));
    
    return {
      compensator: this.compensator,
      compToken: this.compToken,
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      owner: this.owner
    };
  }

  async setupForViewTests() {
    await this.setup();
    
    // Setup: Owner deposits rewards and sets reward rate
    const compensatorAddress = await this.compensator.getAddress();
    await this.compToken.connect(this.delegate).approve(compensatorAddress, ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).ownerDeposit(ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).setRewardRate(ethers.parseEther("0.00000001"));
    
    return {
      compensator: this.compensator,
      compToken: this.compToken,
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      owner: this.owner
    };
  }

  async setupForEdgeCaseTests() {
    await this.setup();
    
    // Setup: Owner deposits rewards and sets reward rate
    const compensatorAddress = await this.compensator.getAddress();
    await this.compToken.connect(this.delegate).approve(compensatorAddress, ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).ownerDeposit(ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).setRewardRate(ethers.parseEther("0.00000001"));
    
    return {
      compensator: this.compensator,
      compToken: this.compToken,
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      owner: this.owner
    };
  }

  async setupForIntegrationTests() {
    await this.setup();
    
    // Setup: Owner deposits rewards and sets reward rate
    const compensatorAddress = await this.compensator.getAddress();
    await this.compToken.connect(this.delegate).approve(compensatorAddress, ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).ownerDeposit(ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).setRewardRate(ethers.parseEther("0.00000001"));
    
    return {
      compensator: this.compensator,
      compToken: this.compToken,
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      owner: this.owner
    };
  }

  async setupForInvariantTests() {
    await this.setup();
    
    // Setup: Owner deposits rewards and sets reward rate
    const compensatorAddress = await this.compensator.getAddress();
    await this.compToken.connect(this.delegate).approve(compensatorAddress, ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).ownerDeposit(ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).setRewardRate(ethers.parseEther("0.00000001"));
    
    return {
      compensator: this.compensator,
      compToken: this.compToken,
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      owner: this.owner
    };
  }

  async setupForFuzzingTests() {
    await this.setup();
    
    // Setup: Owner deposits rewards and sets reward rate
    const compensatorAddress = await this.compensator.getAddress();
    await this.compToken.connect(this.delegate).approve(compensatorAddress, ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).ownerDeposit(ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).setRewardRate(ethers.parseEther("0.00000001"));
    
    return {
      compensator: this.compensator,
      compToken: this.compToken,
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      owner: this.owner
    };
  }

  async setupForForkTests() {
    await this.setup();
    
    // Setup: Owner deposits rewards and sets reward rate
    const compensatorAddress = await this.compensator.getAddress();
    await this.compToken.connect(this.delegate).approve(compensatorAddress, ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).ownerDeposit(ethers.parseEther("100"));
    await this.compensator.connect(this.delegate).setRewardRate(ethers.parseEther("0.00000001"));
    
    return {
      compensator: this.compensator,
      compToken: this.compToken,
      compensatorFactory: this.compensatorFactory,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      owner: this.owner
    };
  }

  async setupForMockTests() {
    [this.owner, this.delegate, this.delegator1, this.delegator2, this.delegator3] = 
      await ethers.getSigners();
    
    // Deploy mock contracts for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    this.compToken = await MockToken.deploy("COMP", "COMP");
    await this.compToken.waitForDeployment();
    
    // Mint initial supply
    await this.compToken.mint(this.delegate.address, ethers.parseEther("1000000"));
    await this.compToken.mint(this.delegator1.address, ethers.parseEther("10000"));
    await this.compToken.mint(this.delegator2.address, ethers.parseEther("10000"));
    await this.compToken.mint(this.delegator3.address, ethers.parseEther("10000"));
    
    return {
      compToken: this.compToken,
      delegate: this.delegate,
      delegator1: this.delegator1,
      delegator2: this.delegator2,
      delegator3: this.delegator3,
      owner: this.owner
    };
  }

  async timeTravel(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  }
}

module.exports = TestBase;
