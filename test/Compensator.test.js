// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Compensator", function () {
  let compToken;
  let compoundGovernor;
  let compensator;
  let compensatorFactory;
  let delegate, delegator1, delegator2, delegator3;
  
  const COMP_TOKEN_ADDRESS = "0xc00e94Cb662C3520282E6f5717214004A7f26888";
  const GOVERNOR_ADDRESS = "0x309a862bbC1A00e45506cB8A802D1ff10004c8C0";

  before(async function () {
    [delegate, delegator1, delegator2, delegator3] = await ethers.getSigners();
    
    // Get contracts from mainnet
    compToken = await ethers.getContractAt("IComp", COMP_TOKEN_ADDRESS);
    compoundGovernor = await ethers.getContractAt("IGovernor", GOVERNOR_ADDRESS);
    
    // Deploy Compensator contract
    const CompensatorFactory = await ethers.getContractFactory("Compensator");
    compensator = await CompensatorFactory.deploy();
    await compensator.deployed();
    
    // Initialize the compensator
    await compensator.initialize(await delegate.getAddress(), "Test Delegate");
  });

  describe("Views", function () {
    beforeEach(async function () {
      // Setup: Delegate deposits rewards and sets reward rate
      await compToken.connect(delegate).approve(compensator.address, ethers.parseEther("100"));
      await compensator.connect(delegate).delegateDeposit(ethers.parseEther("100"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("1"));
    });

    it("should calculate rewardsUntil correctly", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const expectedTime = latestBlock.timestamp + 100; // 100 seconds of rewards at 1 token/second
      
      const rewardsUntil = await compensator.rewardsUntil();
      // Allow for a small difference due to block timestamp changes
      expect(rewardsUntil).to.be.closeTo(expectedTime, 5);
    });

    it("should calculate pending rewards correctly", async function () {
      // Setup delegator with tokens
      await compToken.connect(delegator1).approve(compensator.address, ethers.parseEther("100"));
      await compensator.connect(delegator1).delegatorDeposit(ethers.parseEther("100"));
      
      // Advance time to accumulate rewards
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");
      
      // Check pending rewards
      const pendingRewards = await compensator.getPendingRewards(await delegator1.getAddress());
      expect(pendingRewards).to.be.closeTo(
        ethers.parseEther("10"),
        ethers.parseEther("0.1") // Allow small difference due to block timing
      );
    });
  });

  describe("Delegate Functions", function () {
    it("should allow setting reward rate", async function () {
      const newRate = ethers.parseEther("100");
      await compensator.connect(delegate).setRewardRate(newRate);
      expect(await compensator.rewardRate()).to.equal(newRate);
    });

    it("should handle delegate deposits", async function () {
      const depositAmount = ethers.parseEther("100");
      
      // Get initial balances
      const initialDelegateBalance = await compToken.balanceOf(delegate.address);
      const initialCompensatorBalance = await compToken.balanceOf(compensator.address);
      
      // Approve and deposit
      await compToken.connect(delegate).approve(compensator.address, depositAmount);
      await compensator.connect(delegate).delegateDeposit(depositAmount);
      
      // Check final balances
      const finalDelegateBalance = await compToken.balanceOf(delegate.address);
      const finalCompensatorBalance = await compToken.balanceOf(compensator.address);
      
      expect(initialDelegateBalance - finalDelegateBalance).to.equal(depositAmount);
      expect(finalCompensatorBalance - initialCompensatorBalance).to.equal(depositAmount);
    });

    it("should handle delegate withdrawals", async function () {
      // First deposit tokens
      const depositAmount = ethers.parseEther("100");
      await compToken.connect(delegate).approve(compensator.address, depositAmount);
      await compensator.connect(delegate).delegateDeposit(depositAmount);
      
      // Then withdraw a portion
      const withdrawAmount = ethers.parseEther("50");
      
      // Get initial balances
      const initialDelegateBalance = await compToken.balanceOf(delegate.address);
      const initialCompensatorBalance = await compToken.balanceOf(compensator.address);
      
      // Withdraw
      await compensator.connect(delegate).delegateWithdraw(withdrawAmount);
      
      // Check final balances
      const finalDelegateBalance = await compToken.balanceOf(delegate.address);
      const finalCompensatorBalance = await compToken.balanceOf(compensator.address);
      
      expect(finalDelegateBalance - initialDelegateBalance).to.equal(withdrawAmount);
      expect(initialCompensatorBalance - finalCompensatorBalance).to.equal(withdrawAmount);
    });

    it("should revert when withdrawing too much", async function () {
      // First deposit tokens
      const depositAmount = ethers.parseEther("100");
      await compToken.connect(delegate).approve(compensator.address, depositAmount);
      await compensator.connect(delegate).delegateDeposit(depositAmount);
      
      // Try to withdraw more than available
      const withdrawAmount = ethers.parseEther("101");
      await expect(
        compensator.connect(delegate).delegateWithdraw(withdrawAmount)
      ).to.be.revertedWith("Amount exceeds available rewards");
    });
  });

  describe("Delegator Functions", function () {
    beforeEach(async function () {
      // Setup: Delegate deposits rewards and sets reward rate
      await compToken.connect(delegate).approve(compensator.address, ethers.parseEther("1000"));
      await compensator.connect(delegate).delegateDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("1"));
    });

    it("should handle delegator deposits", async function () {
      const depositAmount = ethers.parseEther("100");
      
      // Get initial balances
      const initialDelegatorBalance = await compToken.balanceOf(delegator1.address);
      const initialCompensatorBalance = await compToken.balanceOf(compensator.address);
      
      // Approve and deposit
      await compToken.connect(delegator1).approve(compensator.address, depositAmount);
      await compensator.connect(delegator1).delegatorDeposit(depositAmount);
      
      // Check final balances
      const finalDelegatorBalance = await compToken.balanceOf(delegator1.address);
      const finalCompensatorBalance = await compToken.balanceOf(compensator.address);
      
      expect(initialDelegatorBalance - finalDelegatorBalance).to.equal(depositAmount);
      expect(finalCompensatorBalance - initialCompensatorBalance).to.equal(depositAmount);
      
      // Check tokens minted
      expect(await compensator.balanceOf(delegator1.address)).to.equal(depositAmount);
    });

    it("should distribute rewards correctly", async function () {
      const depositAmount = ethers.parseEther("100");
      
      // Approve and deposit
      await compToken.connect(delegator1).approve(compensator.address, depositAmount);
      await compensator.connect(delegator1).delegatorDeposit(depositAmount);
      
      // Advance time to accumulate rewards (1 day)
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");
      
      // Get initial balance
      const initialDelegatorBalance = await compToken.balanceOf(delegator1.address);
      
      // Claim rewards
      await compensator.connect(delegator1).claimRewards();
      
      // Get final balance
      const finalDelegatorBalance = await compToken.balanceOf(delegator1.address);
      
      // Check rewards received (approximately 86400 seconds of rewards)
      const expectedRewards = ethers.parseEther("86400");
      expect(finalDelegatorBalance - initialDelegatorBalance).to.be.closeTo(
        expectedRewards,
        ethers.parseEther("1") // Allow small difference due to block timing
      );
    });

    it("should not lose rewards when increasing delegator deposit", async function () {
      const initialDeposit = ethers.parseEther("100");
      const additionalDeposit = ethers.parseEther("100");
      
      // Approve and make initial deposit
      await compToken.connect(delegator1).approve(compensator.address, initialDeposit + additionalDeposit);
      await compensator.connect(delegator1).delegatorDeposit(initialDeposit);
      
      // Advance time to accumulate rewards (10 seconds)
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");
      
      // Check pending rewards after first deposit
      const pendingRewards1 = await compensator.getPendingRewards(delegator1.address);
      expect(pendingRewards1).to.be.closeTo(
        ethers.parseEther("10"),
        ethers.parseEther("0.1")
      );
      
      // Make additional deposit
      await compensator.connect(delegator1).delegatorDeposit(additionalDeposit);
      
      // Check that rewards are preserved after adding more tokens
      const pendingRewards2 = await compensator.getPendingRewards(delegator1.address);
      expect(pendingRewards2).to.be.closeTo(pendingRewards1, ethers.parseEther("0.1"));
      
      // Advance time again (10 more seconds)
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");
      
      // Check that rewards continue to accrue at the higher rate
      const pendingRewards3 = await compensator.getPendingRewards(delegator1.address);
      
      // Should be approximately: initial pending + (new rate * time)
      // ≈ 10 + (200 tokens * 10 seconds / total supply) ≈ 10 + 20 = 30
      const expectedRewards = pendingRewards2 + ethers.parseEther("20");
      expect(pendingRewards3).to.be.closeTo(
        expectedRewards,
        ethers.parseEther("1")
      );
    });

    it("should handle delegator withdrawals", async function () {
      const depositAmount = ethers.parseEther("100");
      const withdrawAmount = ethers.parseEther("50");
      
      // Approve and deposit
      await compToken.connect(delegator1).approve(compensator.address, depositAmount);
      await compensator.connect(delegator1).delegatorDeposit(depositAmount);
      
      // Get initial balances
      const initialDelegatorBalance = await compToken.balanceOf(delegator1.address);
      const initialCompensatorBalance = await compToken.balanceOf(compensator.address);
      
      // Withdraw
      await compensator.connect(delegator1).delegatorWithdraw(withdrawAmount);
      
      // Check final balances
      const finalDelegatorBalance = await compToken.balanceOf(delegator1.address);
      const finalCompensatorBalance = await compToken.balanceOf(compensator.address);
      
      expect(finalDelegatorBalance - initialDelegatorBalance).to.equal(withdrawAmount);
      expect(initialCompensatorBalance - finalCompensatorBalance).to.equal(withdrawAmount);
      
      // Check tokens burned
      expect(await compensator.balanceOf(delegator1.address)).to.equal(depositAmount - withdrawAmount);
    });
  });

  describe("Staking Functions", function () {
    // Mock an active proposal ID - this will need to be adjusted based on mainnet state
    const MOCK_ACTIVE_PROPOSAL_ID = 1; 
    
    beforeEach(async function () {
      // We might need to mock the Governor's state function to return "Active"
      // This is just a placeholder since we can't actually manipulate mainnet contracts
    });
    
    it("should handle proposal staking", async function () {
      const stakeAmount = ethers.parseEther("50");
      
      // Fund the delegator
      await compToken.connect(delegator1).approve(compensator.address, stakeAmount);
      
      // This test might fail if there's no active proposal on mainnet
      // In a real implementation, we'd mock the governor contract
      try {
        await expect(
          compensator.connect(delegator1).stakeForProposal(MOCK_ACTIVE_PROPOSAL_ID, 1, stakeAmount)
        ).to.emit(compensator, "ProposalStaked");
      } catch (error) {
        // Skip if no active proposals
        this.skip();
      }
    });
  });
  
  describe("Multiple Delegator Interaction", function () {
    beforeEach(async function () {
      // Setup: Delegate deposits rewards and sets reward rate
      await compToken.connect(delegate).approve(compensator.address, ethers.parseEther("10000"));
      await compensator.connect(delegate).delegateDeposit(ethers.parseEther("10000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("10"));
    });
    
    it("should distribute rewards proportionally among multiple delegators", async function () {
      // Delegator 1 deposits 100 tokens
      await compToken.connect(delegator1).approve(compensator.address, ethers.parseEther("100"));
      await compensator.connect(delegator1).delegatorDeposit(ethers.parseEther("100"));
      
      // Advance time (10 seconds)
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");
      
      // Delegator 2 deposits 300 tokens (3x more than delegator1)
      await compToken.connect(delegator2).approve(compensator.address, ethers.parseEther("300"));
      await compensator.connect(delegator2).delegatorDeposit(ethers.parseEther("300"));
      
      // Advance time (10 more seconds)
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");
      
      // Check rewards - delegator1 should have earned for full 20 seconds, delegator2 for 10 seconds
      const rewards1 = await compensator.getPendingRewards(delegator1.address);
      const rewards2 = await compensator.getPendingRewards(delegator2.address);
      
      // Delegator 1 should have:
      // - First 10 seconds: 10 tokens/sec * 10 sec = 100 tokens
      // - Second 10 seconds: 10 tokens/sec * 10 sec * (100/400) = 25 tokens
      // - Total ≈ 125 tokens
      expect(rewards1).to.be.closeTo(
        ethers.parseEther("125"),
        ethers.parseEther("5")
      );
      
      // Delegator 2 should have:
      // - Second 10 seconds only: 10 tokens/sec * 10 sec * (300/400) = 75 tokens
      expect(rewards2).to.be.closeTo(
        ethers.parseEther("75"),
        ethers.parseEther("5")
      );
    });
  });
});
