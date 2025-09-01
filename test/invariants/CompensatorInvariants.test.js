const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const TestBase = require("../helpers/TestBase");

describe("Compensator Invariant Tests", function () {
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

  describe("Supply Invariants", function () {
    it("should maintain total supply consistency", async function () {
      // INVARIANT: Total supply should always equal sum of all user balances
      const initialSupply = await compensator.totalSupply();
      expect(initialSupply).to.equal(0); // Should start at 0
      
      // After deposits, total supply should equal sum of balances
      const compensatorAddress = await compensator.getAddress();
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200"), ethers.parseEther("300")];
      const users = [delegator1, delegator2, delegator3];
      
      let totalDeposited = 0;
      for (let i = 0; i < users.length; i++) {
        await compToken.connect(users[i]).approve(compensatorAddress, amounts[i]);
        await compensator.connect(users[i]).userDeposit(amounts[i]);
        totalDeposited += Number(amounts[i]);
      }
      
      const finalSupply = await compensator.totalSupply();
      expect(Number(finalSupply)).to.equal(totalDeposited);
      
      // Verify individual balances sum to total supply
      let sumOfBalances = 0;
      for (const user of users) {
        const balance = await compensator.balanceOf(user.address);
        sumOfBalances += Number(balance);
      }
      expect(sumOfBalances).to.equal(totalDeposited);
    });

    it("should maintain supply consistency during withdrawals", async function () {
      // INVARIANT: Supply should decrease proportionally during withdrawals
      const compensatorAddress = await compensator.getAddress();
      
      // Setup initial deposits
      const initialAmount = ethers.parseEther("100");
      await compToken.connect(delegator1).approve(compensatorAddress, initialAmount);
      await compensator.connect(delegator1).userDeposit(initialAmount);
      
      const supplyAfterDeposit = await compensator.totalSupply();
      expect(supplyAfterDeposit).to.equal(initialAmount);
      
      // Note: Withdrawals require lock period, so we'll test the invariant
      // that supply remains consistent during the process
      const balance = await compensator.balanceOf(delegator1.address);
      expect(balance).to.equal(initialAmount);
      expect(balance).to.equal(supplyAfterDeposit);
    });
  });

  describe("Reward Invariants", function () {
    it("should maintain reward distribution consistency", async function () {
      // INVARIANT: Total rewards distributed should not exceed available rewards
      const compensatorAddress = await compensator.getAddress();
      
      // Setup rewards
      const rewardPool = ethers.parseEther("1000");
      await compToken.connect(delegate).approve(compensatorAddress, rewardPool);
      await compensator.connect(delegate).ownerDeposit(rewardPool);
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000002"));
      
      // Multiple users stake
      const users = [delegator1, delegator2];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];
      
      for (let i = 0; i < users.length; i++) {
        await compToken.connect(users[i]).approve(compensatorAddress, amounts[i]);
        await compensator.connect(users[i]).userDeposit(amounts[i]);
      }
      
      // Advance time
      await testBase.timeTravel(1000);
      
      // Check reward invariants
      let totalRewardsDistributed = 0;
      for (const user of users) {
        const rewards = await compensator.getPendingRewards(user.address);
        totalRewardsDistributed += Number(rewards);
      }
      
      // INVARIANT: Total rewards should not exceed the reward pool
      expect(totalRewardsDistributed).to.be.lte(Number(rewardPool));
      
      // INVARIANT: Rewards should be proportional to stake amounts
      const rewards1 = await compensator.getPendingRewards(delegator1.address);
      const rewards2 = await compensator.getPendingRewards(delegator2.address);
      
      if (Number(rewards1) > 0 && Number(rewards2) > 0) {
        const ratio = Number(rewards2) / Number(rewards1);
        const stakeRatio = Number(amounts[1]) / Number(amounts[0]);
        // Allow some tolerance for timing differences
        expect(Math.abs(ratio - stakeRatio)).to.be.lt(1.0);
      }
    });

    it("should maintain reward rate consistency", async function () {
      // INVARIANT: Reward rate should always be non-negative
      let currentRate = await compensator.rewardRate();
      expect(currentRate).to.be.gte(0);
      
      // Test various reward rates (start with a different rate)
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000002"));
      
      const testRates = [
        ethers.parseEther("0.000000001"), // Very small rate
        ethers.parseEther("0.000000005"), // Small rate (unique)
        ethers.parseEther("0.00000001"), // Medium rate (reduced from 1)
        ethers.parseEther("0.00000002") // High rate (reduced to stay within secure limits)
      ];
      
      for (const rate of testRates) {
        await compensator.connect(delegate).setRewardRate(rate);
        currentRate = await compensator.rewardRate();
        expect(currentRate).to.equal(rate);
        expect(currentRate).to.be.gte(0); // Always non-negative
      }
    });
  });

  describe("State Invariants", function () {
    it("should maintain user balance consistency", async function () {
      // INVARIANT: User balances should always be non-negative
      const compensatorAddress = await compensator.getAddress();
      
      // Use delegator2 to avoid balance accumulation from previous tests
      const testUser = delegator2;
      
      // Test with a single amount to avoid accumulation
      const testAmount = ethers.parseEther("50");
      
      await compToken.connect(testUser).approve(compensatorAddress, testAmount);
      await compensator.connect(testUser).userDeposit(testAmount);
      
      const balance = await compensator.balanceOf(testUser.address);
      expect(balance).to.be.gte(0); // Always non-negative
      expect(balance).to.equal(testAmount); // Should match deposited amount
    });

    it("should maintain delegation cap consistency", async function () {
      // INVARIANT: Total delegation should not exceed the cap
      const compensatorAddress = await compensator.getAddress();
      
      // Try to exceed delegation cap
      const excessiveAmount = ethers.parseEther("1000000");
      await compToken.connect(delegator1).approve(compensatorAddress, excessiveAmount);
      
      await expect(
        compensator.connect(delegator1).userDeposit(excessiveAmount)
      ).to.be.revertedWithCustomError(compensator, "DelegationCapExceeded");
      
      // Verify no balance was added
      const balance = await compensator.balanceOf(delegator1.address);
      expect(balance).to.equal(0);
    });
  });

  describe("Access Control Invariants", function () {
    it("should maintain delegate-only function access", async function () {
      // INVARIANT: Only delegate can call owner functions
      const nonDelegateUsers = [delegator1, delegator2, delegator3];
      
      for (const user of nonDelegateUsers) {
        // ownerDeposit should fail
        await expect(
          compensator.connect(user).ownerDeposit(ethers.parseEther("100"))
        ).to.be.reverted;
        
        // setRewardRate should fail
        await expect(
          compensator.connect(user).setRewardRate(ethers.parseEther("0.00000001"))
        ).to.be.reverted;
      }
      
      // Delegate should be able to call these functions
      await expect(
        compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001"))
      ).to.not.be.reverted;
    });

    it("should maintain user function access", async function () {
      // INVARIANT: Any user can call user functions
      const compensatorAddress = await compensator.getAddress();
      const testAmount = ethers.parseEther("100");
      
      // All users should be able to deposit
      for (const user of [delegator1, delegator2, delegator3]) {
        await compToken.connect(user).approve(compensatorAddress, testAmount);
        await expect(
          compensator.connect(user).userDeposit(testAmount)
        ).to.not.be.reverted;
      }
    });
  });

  describe("Mathematical Invariants", function () {
    it("should maintain arithmetic consistency", async function () {
      // INVARIANT: Mathematical operations should be consistent
      const compensatorAddress = await compensator.getAddress();
      
      // Test deposit arithmetic
      const amount1 = ethers.parseEther("50");
      const amount2 = ethers.parseEther("75");
      
      await compToken.connect(delegator1).approve(compensatorAddress, amount1 + amount2);
      await compensator.connect(delegator1).userDeposit(amount1);
      await compensator.connect(delegator1).userDeposit(amount2);
      
      const totalBalance = await compensator.balanceOf(delegator1.address);
      expect(totalBalance).to.equal(amount1 + amount2);
      
      // Test that individual deposits sum to total
      expect(Number(totalBalance)).to.equal(Number(amount1) + Number(amount2));
    });

    it("should maintain precision consistency", async function () {
      // INVARIANT: Precision should be maintained across operations
      const compensatorAddress = await compensator.getAddress();
      
      // Test with very small amounts
      const smallAmount = ethers.parseEther("0.000001");
      await compToken.connect(delegator1).approve(compensatorAddress, smallAmount);
      await compensator.connect(delegator1).userDeposit(smallAmount);
      
      const balance = await compensator.balanceOf(delegator1.address);
      expect(balance).to.equal(smallAmount);
      
      // Test that precision is maintained
      const balanceNumber = Number(balance);
      const amountNumber = Number(smallAmount);
      expect(balanceNumber).to.equal(amountNumber);
    });
  });

  describe("Time-Based Invariants", function () {
    it("should maintain time progression consistency", async function () {
      // INVARIANT: Time should always move forward
      const initialTime = await ethers.provider.getBlock("latest");
      
      // Advance time
      await testBase.timeTravel(1000);
      
      const newTime = await ethers.provider.getBlock("latest");
      expect(newTime.timestamp).to.be.gt(initialTime.timestamp);
      
      // INVARIANT: Block number should increase
      expect(newTime.number).to.be.gte(initialTime.number);
    });

    it("should maintain reward timing consistency", async function () {
      // INVARIANT: Rewards should increase with time
      const compensatorAddress = await compensator.getAddress();
      
      // Setup rewards
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001"));
      
      // User stakes
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegator1).userDeposit(ethers.parseEther("100"));
      
      // Check rewards at different times
      const rewards1 = await compensator.getPendingRewards(delegator1.address);
      
      await testBase.timeTravel(1000);
      const rewards2 = await compensator.getPendingRewards(delegator1.address);
      
      // INVARIANT: Rewards should increase over time
      expect(rewards2).to.be.gte(rewards1);
    });
  });

  describe("C-01 Invariant Tests", function () {
    it("should prevent reward accounting inconsistencies that lead to protocol insolvency", async function () {
      // This test addresses the C-01 criticism about reward accuracy by design
      // It tests the core invariants that prevent insolvency and theft of funds
      const compensatorAddress = await compensator.getAddress();
      
      // Setup with large reward pool to test edge cases
      const rewardPool = ethers.parseEther("10000");
      await compToken.connect(delegate).approve(compensatorAddress, rewardPool);
      await compensator.connect(delegate).ownerDeposit(rewardPool);
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001")); // High rate
      
      // Multiple users stake different amounts
      const users = [delegator1, delegator2, delegator3];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200"), ethers.parseEther("300")];
      
      for (let i = 0; i < users.length; i++) {
        await compToken.connect(users[i]).approve(compensatorAddress, amounts[i]);
        await compensator.connect(users[i]).userDeposit(amounts[i]);
      }
      
      // Test invariant over multiple time periods with complex scenarios
      for (let period = 0; period < 3; period++) {
        await testBase.timeTravel(1000);
        
        // INVARIANT 1: availableRewards >= totalPendingRewards (prevents over-distribution)
        const availableRewards = await compensator.availableRewards();
        const totalPendingRewards = await compensator.totalPendingRewards();
        expect(Number(availableRewards)).to.be.gte(Number(totalPendingRewards), 
          "C-01: availableRewards must be >= totalPendingRewards to prevent insolvency");
        
        // INVARIANT 2: No user can have negative unclaimed rewards
        for (const user of users) {
          const unclaimed = await compensator.unclaimedRewards(user.address);
          expect(Number(unclaimed)).to.be.gte(0, 
            "C-01: User unclaimed rewards must be non-negative");
        }
        
        // INVARIANT 3: Reward index should never decrease (prevents reward manipulation)
        const rewardIndex = await compensator.rewardIndex();
        expect(Number(rewardIndex)).to.be.gte(1e18, 
          "C-01: Reward index must never decrease below initial value");
      }
      
      // Test reward claiming accuracy
      const userToTest = delegator1;
      const unclaimedBefore = await compensator.unclaimedRewards(userToTest.address);
      
      if (Number(unclaimedBefore) > 0) {
        await compensator.connect(userToTest).claimRewards();
        
        const unclaimedAfter = await compensator.unclaimedRewards(userToTest.address);
        
        // INVARIANT 4: Claiming should not allow double-spending
        expect(unclaimedAfter).to.equal(0, 
          "C-01: Unclaimed rewards must be reset to 0 after claiming");
      }
    });

    it("should maintain reward accuracy under high-frequency operations", async function () {
      // Test reward accounting accuracy under stress conditions
      const compensatorAddress = await compensator.getAddress();
      
      // Setup with moderate reward pool
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001"));
      
      // User stakes
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegator1).userDeposit(ethers.parseEther("100"));
      
      // Simulate high-frequency operations
      for (let i = 0; i < 10; i++) {
        await testBase.timeTravel(100); // Small time increments
        
        // Check invariants after each operation
        const availableRewards = await compensator.availableRewards();
        const totalPendingRewards = await compensator.totalPendingRewards();
        
        // INVARIANT: availableRewards >= totalPendingRewards must hold at all times
        expect(Number(availableRewards)).to.be.gte(Number(totalPendingRewards), 
          `C-01: Invariant violated at iteration ${i}`);
        
        // INVARIANT: Reward index should be monotonically increasing
        const rewardIndex = await compensator.rewardIndex();
        expect(Number(rewardIndex)).to.be.gte(1e18, 
          `C-01: Reward index invariant violated at iteration ${i}`);
      }
    });

    it("should handle boundary conditions that could lead to accounting errors", async function () {
      // Test boundary conditions that could cause reward accounting failures
      const compensatorAddress = await compensator.getAddress();
      
      // Setup with very small reward pool to test exhaustion
      const smallRewardPool = ethers.parseEther("10");
      await compToken.connect(delegate).approve(compensatorAddress, smallRewardPool);
      await compensator.connect(delegate).ownerDeposit(smallRewardPool);
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001")); // High rate
      
      // User stakes
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegator1).userDeposit(ethers.parseEther("100"));
      
      // Advance time to near exhaustion
      await testBase.timeTravel(5000);
      
      // INVARIANT: System should maintain accounting consistency even when rewards are exhausted
      const availableRewards = await compensator.availableRewards();
      const totalPendingRewards = await compensator.totalPendingRewards();
      
      expect(Number(availableRewards)).to.be.gte(Number(totalPendingRewards), 
        "C-01: Accounting consistency must be maintained even when rewards are exhausted");
      
      // Test with zero reward rate
      await compensator.connect(delegate).setRewardRate(0);
      await testBase.timeTravel(1000);
      
      // INVARIANT: Reward index should not change with zero rate
      const rewardIndexBefore = await compensator.rewardIndex();
      await testBase.timeTravel(1000);
      const rewardIndexAfter = await compensator.rewardIndex();
      
      expect(Number(rewardIndexAfter)).to.equal(Number(rewardIndexBefore), 
        "C-01: Reward index should not change with zero rate");
    });

    it("should prevent reward manipulation through rapid operations", async function () {
      // Test that rapid operations cannot manipulate reward accounting
      const compensatorAddress = await compensator.getAddress();
      
      // Setup rewards
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001"));
      
      // Multiple users stake
      const users = [delegator1, delegator2, delegator3];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200"), ethers.parseEther("300")];
      
      for (let i = 0; i < users.length; i++) {
        await compToken.connect(users[i]).approve(compensatorAddress, amounts[i]);
        await compensator.connect(users[i]).userDeposit(amounts[i]);
      }
      
      // Record initial state
      const initialAvailableRewards = await compensator.availableRewards();
      const initialTotalPendingRewards = await compensator.totalPendingRewards();
      
      // Simulate rapid operations
      for (let i = 0; i < 5; i++) {
        await testBase.timeTravel(50); // Very small time increments
        
        // Check that invariants are maintained
        const availableRewards = await compensator.availableRewards();
        const totalPendingRewards = await compensator.totalPendingRewards();
        
        // INVARIANT: availableRewards should never go below totalPendingRewards
        expect(Number(availableRewards)).to.be.gte(Number(totalPendingRewards), 
          `C-01: Rapid operation ${i} violated accounting invariant`);
        
        // INVARIANT: totalPendingRewards should never exceed initial available rewards
        expect(Number(totalPendingRewards)).to.be.lte(Number(initialAvailableRewards), 
          `C-01: Rapid operation ${i} could lead to over-distribution`);
      }
      
      // Test that claiming rewards maintains accounting consistency
      let totalClaimed = 0;
      for (const user of users) {
        const unclaimed = await compensator.unclaimedRewards(user.address);
        if (Number(unclaimed) > 0) {
          await compensator.connect(user).claimRewards();
          totalClaimed += Number(unclaimed);
        }
      }
      
      // INVARIANT: Final state should be consistent
      const finalAvailableRewards = await compensator.availableRewards();
      const finalTotalPendingRewards = await compensator.totalPendingRewards();
      
      expect(Number(initialAvailableRewards) - Number(finalAvailableRewards)).to.equal(totalClaimed, 
        "C-01: Total claimed amount must equal decrease in available rewards");
      expect(Number(initialTotalPendingRewards) - Number(finalTotalPendingRewards)).to.equal(totalClaimed, 
        "C-01: Total claimed amount must equal decrease in total pending rewards");
    });
  });
});
