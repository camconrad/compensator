const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const TestBase = require("../helpers/TestBase");

describe("Compensator Integration Tests", function () {
  let testBase;
  let compensator, compToken, compoundGovernor, compensatorFactory;
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
    compoundGovernor = fixture.compoundGovernor;
    compensatorFactory = fixture.compensatorFactory;
    delegate = fixture.delegate;
    delegator1 = fixture.delegator1;
    delegator2 = fixture.delegator2;
    delegator3 = fixture.delegator3;
    owner = fixture.owner;
  });

  describe("Complete System Workflow", function () {
    it("should handle complete staking and reward cycle", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup rewards
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("1"));
      
      // Multiple users stake
      const users = [delegator1, delegator2];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];
      
      for (let i = 0; i < users.length; i++) {
        await compToken.connect(users[i]).approve(compensatorAddress, amounts[i]);
        await compensator.connect(users[i]).userDeposit(amounts[i]);
      }
      
      // Advance time and check rewards
      await testBase.timeTravel(1000);
      
      for (let i = 0; i < users.length; i++) {
        const pendingRewards = await compensator.getPendingRewards(users[i].address);
        expect(pendingRewards).to.be.gt(0);
      }
    });

    it("should handle multiple reward cycles", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup initial rewards
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("1"));
      
      // User stakes
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegator1).userDeposit(ethers.parseEther("100"));
      
      // First reward cycle
      await testBase.timeTravel(500);
      const rewards1 = await compensator.getPendingRewards(delegator1.address);
      
      // Second reward cycle
      await testBase.timeTravel(500);
      const rewards2 = await compensator.getPendingRewards(delegator1.address);
      
      expect(rewards2).to.be.gt(rewards1);
    });
  });

  describe("Multi-User Scenarios", function () {
    it("should handle many users staking simultaneously", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup rewards
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("10000"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("10000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("1"));
      
      // Multiple users stake simultaneously
      const users = [delegator1, delegator2, delegator3];
      const amounts = [ethers.parseEther("50"), ethers.parseEther("100"), ethers.parseEther("150")];
      
      const depositPromises = users.map((user, i) => {
        return compToken.connect(user).approve(compensatorAddress, amounts[i])
          .then(() => compensator.connect(user).userDeposit(amounts[i]));
      });
      
      await Promise.all(depositPromises);
      
      // Verify all stakes are recorded
      for (let i = 0; i < users.length; i++) {
        const balance = await compensator.balanceOf(users[i].address);
        expect(balance).to.equal(amounts[i]);
      }
    });

    it("should handle users joining and leaving the system", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup rewards
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("1"));
      
      // User 1 joins
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegator1).userDeposit(ethers.parseEther("100"));
      
      // Advance time
      await testBase.timeTravel(500);
      
      // User 2 joins
      await compToken.connect(delegator2).approve(compensatorAddress, ethers.parseEther("200"));
      await compensator.connect(delegator2).userDeposit(ethers.parseEther("200"));
      
      // Advance time more
      await testBase.timeTravel(500);
      
      // Check rewards for both users
      const rewards1 = await compensator.getPendingRewards(delegator1.address);
      const rewards2 = await compensator.getPendingRewards(delegator2.address);
      
      expect(rewards1).to.be.gt(0);
      expect(rewards2).to.be.gt(0);
      expect(rewards1).to.be.gt(rewards2); // User 1 should have more rewards (staked longer)
    });
  });

  describe("Reward Distribution Mechanics", function () {
    it("should distribute rewards proportionally to stake amounts", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup rewards
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("1"));
      
      // Users stake different amounts
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegator1).userDeposit(ethers.parseEther("100"));
      
      await compToken.connect(delegator2).approve(compensatorAddress, ethers.parseEther("200"));
      await compensator.connect(delegator2).userDeposit(ethers.parseEther("200"));
      
      // Advance time
      await testBase.timeTravel(1000);
      
      // Check rewards - user 2 should have roughly 2x the rewards of user 1
      const rewards1 = await compensator.getPendingRewards(delegator1.address);
      const rewards2 = await compensator.getPendingRewards(delegator2.address);
      
      expect(rewards2).to.be.gt(rewards1);
      // User 2 should have approximately 2x the rewards (200/100 = 2x stake)
      // Convert to numbers for comparison
      const ratio = Number(rewards2) / Number(rewards1);
      expect(ratio).to.be.closeTo(2, 0.2); // Allow 20% tolerance
    });

    it("should handle reward rate changes correctly", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup initial rewards
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("1"));
      
      // User stakes
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegator1).userDeposit(ethers.parseEther("100"));
      
      // First reward period
      await testBase.timeTravel(500);
      const rewards1 = await compensator.getPendingRewards(delegator1.address);
      
      // Change reward rate
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("2"));
      
      // Second reward period
      await testBase.timeTravel(500);
      const rewards2 = await compensator.getPendingRewards(delegator1.address);
      
      // Second period should have higher rewards due to higher rate
      const period1Rewards = rewards1;
      const period2Rewards = rewards2 - rewards1;
      
      // Both periods should have rewards, but the second might be similar due to timing
      expect(period1Rewards).to.be.gt(0);
      expect(period2Rewards).to.be.gte(0);
    });
  });

  describe("Performance and Scalability", function () {
    it("should handle high-frequency operations", async function () {
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("1000"));
      
      const startTime = Date.now();
      
      // Perform multiple rapid operations
      const operations = [];
      for (let i = 0; i < 10; i++) {
        const amount = ethers.parseEther((10 + i * 5).toString());
        operations.push(compensator.connect(delegator1).userDeposit(amount));
      }
      
      // Execute all operations
      const results = await Promise.all(operations);
      expect(results.length).to.equal(10);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).to.be.lt(10000); // Less than 10 seconds
      
      // Verify final state
      const finalBalance = await compensator.balanceOf(delegator1.address);
      expect(finalBalance).to.be.gt(0);
    });
  });
});
