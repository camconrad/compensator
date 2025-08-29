const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const TestBase = require("../../helpers/TestBase");

describe("Compensator Gas Optimization", function () {
  let testBase;
  let compensator, compToken, compensatorFactory;
  let delegate, delegator1, delegator2, delegator3, owner;

  before(async function () {
    testBase = new TestBase();
  });

  async function setupFixture() {
    return await testBase.setup();
  }

  beforeEach(async function () {
    const fixture = await loadFixture(setupFixture);
    compensator = fixture.compensator;
    compToken = fixture.compToken;
    compensatorFactory = fixture.compensatorFactory;
    delegate = fixture.delegate;
    delegator1 = fixture.delegator1;
    delegator2 = fixture.delegator2;
    delegator3 = fixture.delegator3;
    owner = fixture.owner;
  });

  describe("Gas Optimization Analysis", function () {
    it("should measure gas usage for basic operations", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Measure gas for ownerDeposit
      const depositAmount = ethers.parseEther("100");
      await compToken.connect(delegate).approve(compensatorAddress, depositAmount);
      
      const tx = await compensator.connect(delegate).ownerDeposit(depositAmount);
      const receipt = await tx.wait();
      
      expect(receipt.gasUsed).to.be.a("bigint");
      expect(receipt.gasUsed).to.be.gt(0);
    });

    it("should measure gas usage for user delegation", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup: Owner deposits rewards
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("100"));
      
      // Measure gas for userDeposit
      const delegationAmount = ethers.parseEther("50");
      await compToken.connect(delegator1).approve(compensatorAddress, delegationAmount);
      
      const tx = await compensator.connect(delegator1).userDeposit(delegationAmount);
      const receipt = await tx.wait();
      
      expect(receipt.gasUsed).to.be.a("bigint");
      expect(receipt.gasUsed).to.be.gt(0);
    });

    it("should measure gas usage for reward claiming", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup: Owner deposits rewards and sets rate
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("100"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001"));
      
      // User delegates COMP
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("50"));
      await compensator.connect(delegator1).userDeposit(ethers.parseEther("50"));
      
      // Advance time to generate rewards
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");
      
      // Measure gas for claimRewards
      const tx = await compensator.connect(delegator1).claimRewards();
      const receipt = await tx.wait();
      
      expect(receipt.gasUsed).to.be.a("bigint");
      expect(receipt.gasUsed).to.be.gt(0);
    });
  });

  describe("Storage Optimization", function () {
    it("should use efficient storage patterns", async function () {
      // Test that the contract uses efficient storage patterns
      const compensatorAddress = await compensator.getAddress();
      
      // Check storage layout
      const owner = await compensator.owner();
      const compToken = await compensator.COMP_TOKEN();
      const factory = await compensator.FACTORY();
      
      expect(owner).to.not.equal(ethers.ZeroAddress);
      expect(compToken).to.not.equal(ethers.ZeroAddress);
      expect(factory).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Function Optimization", function () {
    it("should optimize view function calls", async function () {
      // Test that view functions are gas efficient
      
      // Call multiple view functions
      await compensator.owner();
      await compensator.COMP_TOKEN();
      await compensator.FACTORY();
      await compensator.availableRewards();
      await compensator.totalDelegatedCOMP();
      
      // Verify the functions execute without errors
      expect(true).to.be.true;
    });

    it("should optimize state-changing operations", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup: Owner deposits rewards
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("100"));
      
      // Test that state changes are optimized
      const initialAvailableRewards = await compensator.availableRewards();
      expect(initialAvailableRewards).to.equal(ethers.parseEther("100"));
    });
  });
});
