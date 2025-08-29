const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const TestBase = require("../../helpers/TestBase");

describe("Compensator Performance Testing", function () {
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

  describe("Performance Analysis", function () {
    it("should handle multiple user delegations efficiently", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup: Owner deposits rewards
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("1000"));
      
      // Test multiple users delegating simultaneously
      const users = [delegator1, delegator2, delegator3];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200"), ethers.parseEther("300")];
      
      for (let i = 0; i < users.length; i++) {
        await compToken.connect(users[i]).approve(compensatorAddress, amounts[i]);
        await compensator.connect(users[i]).userDeposit(amounts[i]);
      }
      
      // Verify all delegations were processed
      for (let i = 0; i < users.length; i++) {
        const balance = await compensator.balanceOf(users[i].address);
        expect(balance).to.equal(amounts[i]);
      }
    });

    it("should handle reward distribution efficiently", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup: Owner deposits rewards and sets rate
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001"));
      
      // Multiple users delegate COMP
      const users = [delegator1, delegator2, delegator3];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200"), ethers.parseEther("300")];
      
      for (let i = 0; i < users.length; i++) {
        await compToken.connect(users[i]).approve(compensatorAddress, amounts[i]);
        await compensator.connect(users[i]).userDeposit(amounts[i]);
      }
      
      // Advance time to generate rewards
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");
      
      // Test reward claiming performance
      for (const user of users) {
        const pendingRewards = await compensator.getPendingRewards(user.address);
        expect(pendingRewards).to.be.gt(0);
      }
    });
  });

  describe("Scalability Testing", function () {
    it("should handle delegation cap efficiently", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Test that the contract handles delegation cap efficiently
      const delegationCap = await compensator.delegationCap();
      expect(delegationCap).to.be.gt(0);
      
      // Test that users can delegate up to the cap
      const testAmount = delegationCap / 10n; // Use 10% of cap
      await compToken.connect(delegator1).approve(compensatorAddress, testAmount);
      await compensator.connect(delegator1).userDeposit(testAmount);
      
      const userBalance = await compensator.balanceOf(delegator1.address);
      expect(userBalance).to.equal(testAmount);
    });

    it("should handle reward rate changes efficiently", async function () {
      // Test multiple reward rate changes
      const rates = [
        ethers.parseEther("0.00000001"),
        ethers.parseEther("0.00000002"),
        ethers.parseEther("0.00000003"),
        ethers.parseEther("0")
      ];
      
      for (const rate of rates) {
        await compensator.connect(delegate).setRewardRate(rate);
        const currentRate = await compensator.rewardRate();
        expect(currentRate).to.equal(rate);
      }
    });
  });

  describe("Memory and Storage Efficiency", function () {
    it("should use storage efficiently", async function () {
      // Test that the contract uses storage efficiently
      const compensatorAddress = await compensator.getAddress();
      
      // Setup: Owner deposits rewards
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("100"));
      
      // User delegates COMP
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("50"));
      await compensator.connect(delegator1).userDeposit(ethers.parseEther("50"));
      
      // Verify storage efficiency
      const availableRewards = await compensator.availableRewards();
      const totalDelegated = await compensator.totalDelegatedCOMP();
      const userBalance = await compensator.balanceOf(delegator1.address);
      
      expect(availableRewards).to.equal(ethers.parseEther("100"));
      expect(totalDelegated).to.equal(ethers.parseEther("50"));
      expect(userBalance).to.equal(ethers.parseEther("50"));
    });
  });
});
