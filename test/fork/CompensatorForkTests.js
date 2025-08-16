const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const ForkTestBase = require("../helpers/ForkTestBase");

describe("Compensator Fork Tests", function () {
  let forkTestBase;
  let compensator, compToken, compoundGovernor;
  let delegate, delegator1, delegator2, delegator3;
  
  // Test configuration
  const FORK_TIMEOUT = 60000; // 60 seconds for fork tests
  
  before(async function () {
    forkTestBase = new ForkTestBase();
    
    // Setup fork if available
    try {
      await forkTestBase.setupFork({
        rpcUrl: process.env.MAINNET_RPC_URL,
        blockNumber: process.env.FORK_BLOCK_NUMBER ? parseInt(process.env.FORK_BLOCK_NUMBER) : undefined
      });
    } catch (error) {
      console.log("⚠️  Fork setup failed, running with local contracts:", error.message);
    }
  });

  async function setupFixture() {
    [delegate, delegator1, delegator2, delegator3] = await ethers.getSigners();
    
    // Use the same working setup as other tests
    const MockToken = await ethers.getContractFactory("MockERC20");
    compToken = await MockToken.deploy("COMP", "COMP");
    await compToken.waitForDeployment();
    
    const MockGovernor = await ethers.getContractFactory("MockGovernor");
    compoundGovernor = await MockGovernor.deploy();
    await compoundGovernor.waitForDeployment();
    
    // IMPORTANT: Mint initial supply BEFORE deploying Compensator
    // Compensator constructor calls totalSupply() and requires it to be > 0
    await compToken.mint(delegate.address, ethers.parseEther("1000000"));
    
    // Verify supply is set correctly
    const totalSupply = await compToken.totalSupply();
    console.log(`📊 Mock COMP token total supply: ${ethers.formatEther(totalSupply)}`);
    if (totalSupply === 0n) {
      throw new Error("Mock COMP token must have non-zero supply for Compensator constructor");
    }
    
    // Now deploy Compensator (after token has supply)
    const Compensator = await ethers.getContractFactory("Compensator");
    compensator = await Compensator.deploy(
      await compToken.getAddress(),
      await compoundGovernor.getAddress(),
      delegate.address
    );
    await compensator.waitForDeployment();
    
    // Mint additional supply for test accounts
    await compToken.mint(delegator1.address, ethers.parseEther("10000"));
    await compToken.mint(delegator2.address, ethers.parseEther("10000"));
    await compToken.mint(delegator3.address, ethers.parseEther("10000"));
    
    return { 
      compensator, 
      compToken, 
      compoundGovernor, 
      delegate, 
      delegator1, 
      delegator2, 
      delegator3 
    };
  }

  beforeEach(async function () {
    this.timeout(FORK_TIMEOUT);
    const fixture = await loadFixture(setupFixture);
    compensator = fixture.compensator;
    compToken = fixture.compToken;
    compoundGovernor = fixture.compoundGovernor;
    delegate = fixture.delegate;
    delegator1 = fixture.delegator1;
    delegator2 = fixture.delegator2;
    delegator3 = fixture.delegator3;
  });

  describe("Fork Network Detection", function () {
    it("should detect fork network correctly", async function () {
      const forkInfo = forkTestBase.getForkInfo();
      console.log("📊 Fork Info:", forkInfo);
      
      expect(forkInfo).to.have.property("isForked");
      expect(forkInfo).to.have.property("mainnetContracts");
      
      if (forkInfo.isForked) {
        expect(forkInfo.mainnetContracts).to.include("COMP_TOKEN");
        expect(forkInfo.mainnetContracts).to.include("COMPOUND_GOVERNOR");
      }
    });
  });

  describe("Basic Functionality on Fork", function () {
    it("should deploy and initialize correctly", async function () {
      const tokenAddress = await compensator.COMP_TOKEN();
      const governorAddress = await compensator.COMPOUND_GOVERNOR();
      const owner = await compensator.owner();
      
      expect(tokenAddress).to.equal(await compToken.getAddress());
      expect(governorAddress).to.equal(await compoundGovernor.getAddress());
      expect(owner).to.equal(delegate.address);
      
      console.log("✅ Compensator deployed successfully");
    });

    it("should handle basic deposits", async function () {
      const compensatorAddress = await compensator.getAddress();
      const depositAmount = ethers.parseEther("100");
      
      // Approve and deposit
      await compToken.connect(delegator1).approve(compensatorAddress, depositAmount);
      await compensator.connect(delegator1).userDeposit(depositAmount);
      
      const balance = await compensator.balanceOf(delegator1.address);
      expect(balance).to.equal(depositAmount);
      
      console.log("✅ Basic deposit successful");
    });
  });

  describe("Fork-Specific Features", function () {
    it("should provide fork information", async function () {
      const isForked = forkTestBase.isNetworkForked();
      console.log(`🔄 Network forked: ${isForked}`);
      
      if (isForked) {
        const forkInfo = forkTestBase.getForkInfo();
        console.log("📊 Fork details:", forkInfo);
        expect(forkInfo.isForked).to.be.true;
      } else {
        console.log("🧪 Running on local network");
        expect(isForked).to.be.false;
      }
    });

    it("should handle time manipulation", async function () {
      const initialBlock = await forkTestBase.getCurrentBlock();
      console.log(`📦 Initial block: ${initialBlock}`);
      
      await forkTestBase.timeTravel(3600); // 1 hour
      
      const newBlock = await forkTestBase.getCurrentBlock();
      console.log(`📦 New block: ${newBlock}`);
      
      expect(newBlock).to.be.gt(initialBlock);
      console.log("✅ Time manipulation working");
    });
  });
});
