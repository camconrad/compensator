// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

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
    
    // Deploy mock contracts for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    compToken = await MockToken.deploy("COMP", "COMP");
    await compToken.waitForDeployment();
    compTokenAddress = await compToken.getAddress();
    
    const MockGovernor = await ethers.getContractFactory("MockGovernor");
    compoundGovernor = await MockGovernor.deploy();
    await compoundGovernor.waitForDeployment();
    compoundGovernorAddress = await compoundGovernor.getAddress();
    
    // Deploy Compensator contract with mock addresses
    const CompensatorFactory = await ethers.getContractFactory("Compensator");
    compensator = await CompensatorFactory.deploy(
      await delegate.getAddress(),
      "Test Delegate",
      await compToken.getAddress(),
      await compoundGovernor.getAddress()
    );
    await compensator.waitForDeployment();
    
    // Fund accounts for testing
    await compToken.mint(delegate.address, ethers.parseEther("10000"));
    await compToken.mint(delegator1.address, ethers.parseEther("10000"));
    await compToken.mint(delegator2.address, ethers.parseEther("10000"));
    await compToken.mint(delegator3.address, ethers.parseEther("10000"));
  });

  describe("Views", function () {
    beforeEach(async function () {
      // Setup: Delegate deposits rewards and sets reward rate
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegate).delegateDeposit(ethers.parseEther("100"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("1"));
    });

    describe("rewardsUntil", function () {
      it("should return lastRewarded when rewardRate is zero", async function () {
        await compensator.connect(delegate).setRewardRate(0);
        const lastRewarded = await compensator.lastRewarded();
        const rewardsUntil = await compensator.rewardsUntil();
        expect(rewardsUntil).to.equal(lastRewarded);
      });

      it("should calculate time for current available rewards", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const expectedTime = latestBlock.timestamp + 100; // 100 seconds of rewards at 1 token/second
        const rewardsUntil = await compensator.rewardsUntil();
        expect(rewardsUntil).to.be.closeTo(expectedTime, 5);
      });

      it("should include deficit time in calculation", async function () {
        // Setup delegator to create deficit
        const compensatorAddress = await compensator.getAddress();
        await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
        await compensator.connect(delegator1).delegatorDeposit(ethers.parseEther("100"));
        
        // Advance time to create deficit
        await ethers.provider.send("evm_increaseTime", [200]); // 200 seconds
        await ethers.provider.send("evm_mine");
        
        // Get rewardsUntil
        const rewardsUntil = await compensator.rewardsUntil();
        const latestBlock = await ethers.provider.getBlock("latest");
        
        // Should be lastRewarded + time for current rewards + time for deficit
        expect(rewardsUntil).to.be.closeTo(latestBlock.timestamp + 200, 5);
      });

      it("should handle both current rewards and deficit", async function () {
        // Setup delegator
        const compensatorAddress = await compensator.getAddress();
        await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
        await compensator.connect(delegator1).delegatorDeposit(ethers.parseEther("100"));
        
        // Create deficit
        await ethers.provider.send("evm_increaseTime", [100]); // 100 seconds deficit
        await ethers.provider.send("evm_mine");
        
        // Add more rewards
        await compensator.connect(delegate).delegateDeposit(ethers.parseEther("50"));
        
        // Get rewardsUntil
        const rewardsUntil = await compensator.rewardsUntil();
        const latestBlock = await ethers.provider.getBlock("latest");
        
        // Should be lastRewarded + time for new rewards + time for deficit
        expect(rewardsUntil).to.be.closeTo(latestBlock.timestamp + 150, 5);
      });

      it("should handle zero available rewards correctly", async function () {
        // Setup delegator
        const compensatorAddress = await compensator.getAddress();
        await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
        await compensator.connect(delegator1).delegatorDeposit(ethers.parseEther("100"));
        
        // Create deficit
        await ethers.provider.send("evm_increaseTime", [100]); // 100 seconds deficit
        await ethers.provider.send("evm_mine");
        
        // Get rewardsUntil
        const rewardsUntil = await compensator.rewardsUntil();
        const latestBlock = await ethers.provider.getBlock("latest");
        
        // Should be lastRewarded + time for deficit only
        expect(rewardsUntil).to.be.closeTo(latestBlock.timestamp + 100, 5);
      });
    });

    it("should calculate pending rewards correctly", async function () {
      // Setup delegator with tokens
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
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
      const compensatorAddress = await compensator.getAddress();
      
      // Get initial balances
      const initialDelegateBalance = await compToken.balanceOf(delegate.address);
      const initialCompensatorBalance = await compToken.balanceOf(compensatorAddress);
      
      // Approve and deposit
      await compToken.connect(delegate).approve(compensatorAddress, depositAmount);
      await compensator.connect(delegate).delegateDeposit(depositAmount);
      
      // Check final balances
      const finalDelegateBalance = await compToken.balanceOf(delegate.address);
      const finalCompensatorBalance = await compToken.balanceOf(compensatorAddress);
      
      expect(initialDelegateBalance - finalDelegateBalance).to.equal(depositAmount);
      expect(finalCompensatorBalance - initialCompensatorBalance).to.equal(depositAmount);
    });

    it("should handle delegate withdrawals", async function () {
      // First deposit tokens
      const depositAmount = ethers.parseEther("100");
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegate).approve(compensatorAddress, depositAmount);
      await compensator.connect(delegate).delegateDeposit(depositAmount);
      
      // Then withdraw a portion
      const withdrawAmount = ethers.parseEther("50");
      
      // Get initial balances
      const initialDelegateBalance = await compToken.balanceOf(delegate.address);
      const initialCompensatorBalance = await compToken.balanceOf(compensatorAddress);
      
      // Withdraw
      await compensator.connect(delegate).delegateWithdraw(withdrawAmount);
      
      // Check final balances
      const finalDelegateBalance = await compToken.balanceOf(delegate.address);
      const finalCompensatorBalance = await compToken.balanceOf(compensatorAddress);
      
      expect(finalDelegateBalance - initialDelegateBalance).to.equal(withdrawAmount);
      expect(initialCompensatorBalance - finalCompensatorBalance).to.equal(withdrawAmount);
    });

    it("should revert when withdrawing too much", async function () {
      // First deposit tokens
      const depositAmount = ethers.parseEther("100");
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegate).approve(compensatorAddress, depositAmount);
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
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(delegate).delegateDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("1"));
    });

    it("should handle delegator deposits", async function () {
      const depositAmount = ethers.parseEther("100");
      const compensatorAddress = await compensator.getAddress();
      
      // Get initial balances
      const initialDelegatorBalance = await compToken.balanceOf(delegator1.address);
      const initialCompensatorBalance = await compToken.balanceOf(compensatorAddress);
      
      // Approve and deposit
      await compToken.connect(delegator1).approve(compensatorAddress, depositAmount);
      await compensator.connect(delegator1).delegatorDeposit(depositAmount);
      
      // Check final balances
      const finalDelegatorBalance = await compToken.balanceOf(delegator1.address);
      const finalCompensatorBalance = await compToken.balanceOf(compensatorAddress);
      
      expect(initialDelegatorBalance - finalDelegatorBalance).to.equal(depositAmount);
      expect(finalCompensatorBalance - initialCompensatorBalance).to.equal(depositAmount);
      
      // Check tokens minted
      expect(await compensator.balanceOf(delegator1.address)).to.equal(depositAmount);
    });

    it("should distribute rewards correctly", async function () {
      const depositAmount = ethers.parseEther("100");
      const compensatorAddress = await compensator.getAddress();
      
      // Approve and deposit
      await compToken.connect(delegator1).approve(compensatorAddress, depositAmount);
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
      const compensatorAddress = await compensator.getAddress();
      
      // Approve and make initial deposit
      await compToken.connect(delegator1).approve(compensatorAddress, initialDeposit + additionalDeposit);
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
      const compensatorAddress = await compensator.getAddress();
      
      // Approve and deposit
      await compToken.connect(delegator1).approve(compensatorAddress, depositAmount);
      await compensator.connect(delegator1).delegatorDeposit(depositAmount);
      
      // Get initial balances
      const initialDelegatorBalance = await compToken.balanceOf(delegator1.address);
      const initialCompensatorBalance = await compToken.balanceOf(compensatorAddress);
      
      // Withdraw
      await compensator.connect(delegator1).delegatorWithdraw(withdrawAmount);
      
      // Check final balances
      const finalDelegatorBalance = await compToken.balanceOf(delegator1.address);
      const finalCompensatorBalance = await compToken.balanceOf(compensatorAddress);
      
      expect(finalDelegatorBalance - initialDelegatorBalance).to.equal(withdrawAmount);
      expect(initialCompensatorBalance - finalCompensatorBalance).to.equal(withdrawAmount);
      
      // Check tokens burned
      expect(await compensator.balanceOf(delegator1.address)).to.equal(depositAmount - withdrawAmount);
    });
  });

  describe("Lock Period and Proposal State Tests", function () {
    beforeEach(async function () {
      // Setup: Delegate deposits rewards and sets reward rate
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(delegate).delegateDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("1"));
    });

    it("should enforce minimum lock period on deposit", async function () {
      const depositAmount = ethers.parseEther("100");
      const compensatorAddress = await compensator.getAddress();
      
      await compToken.connect(delegator1).approve(compensatorAddress, depositAmount);
      await compensator.connect(delegator1).delegatorDeposit(depositAmount);
      
      // Try to withdraw before lock period
      await expect(
        compensator.connect(delegator1).delegatorWithdraw(depositAmount)
      ).to.be.revertedWith("COMP is locked");
      
      // Advance time to just before lock period
      await ethers.provider.send("evm_increaseTime", [6 * 24 * 3600]); // 6 days
      await ethers.provider.send("evm_mine");
      
      // Should still be locked
      await expect(
        compensator.connect(delegator1).delegatorWithdraw(depositAmount)
      ).to.be.revertedWith("COMP is locked");
      
      // Advance time past lock period
      await ethers.provider.send("evm_increaseTime", [2 * 24 * 3600]); // 2 more days
      await ethers.provider.send("evm_mine");
      
      // Should be able to withdraw
      await expect(
        compensator.connect(delegator1).delegatorWithdraw(depositAmount)
      ).to.not.be.reverted;
    });

    it("should extend lock period when active proposal exists", async function () {
      const depositAmount = ethers.parseEther("100");
      const compensatorAddress = await compensator.getAddress();
      
      // Mock an active proposal
      const mockProposalId = 1;
      await compoundGovernor.mock.state.returns(1); // Active state
      await compoundGovernor.mock.proposalSnapshot.returns(block.number + 1000);
      
      await compToken.connect(delegator1).approve(compensatorAddress, depositAmount);
      await compensator.connect(delegator1).delegatorDeposit(depositAmount);
      
      // Advance time past minimum lock period
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 3600]); // 8 days
      await ethers.provider.send("evm_mine");
      
      // Should still be locked due to active proposal
      await expect(
        compensator.connect(delegator1).delegatorWithdraw(depositAmount)
      ).to.be.revertedWith("Cannot withdraw during active or pending proposals");
    });

    it("should handle multiple active proposals correctly", async function () {
      const depositAmount = ethers.parseEther("100");
      const compensatorAddress = await compensator.getAddress();
      
      // Mock multiple active proposals
      const mockProposalId1 = 1;
      const mockProposalId2 = 2;
      await compoundGovernor.mock.state.withArgs(mockProposalId1).returns(1); // Active
      await compoundGovernor.mock.state.withArgs(mockProposalId2).returns(1); // Active
      
      await compToken.connect(delegator1).approve(compensatorAddress, depositAmount);
      await compensator.connect(delegator1).delegatorDeposit(depositAmount);
      
      // Advance time past minimum lock period
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 3600]); // 8 days
      await ethers.provider.send("evm_mine");
      
      // Should still be locked due to active proposals
      await expect(
        compensator.connect(delegator1).delegatorWithdraw(depositAmount)
      ).to.be.revertedWith("Cannot withdraw during active or pending proposals");
    });

    it("should handle pending proposals correctly", async function () {
      const depositAmount = ethers.parseEther("100");
      const compensatorAddress = await compensator.getAddress();
      
      // Mock a pending proposal (about to start)
      const mockProposalId = 1;
      await compoundGovernor.mock.state.returns(0); // Pending state
      await compoundGovernor.mock.proposalSnapshot.returns(block.number + 1000);
      
      await compToken.connect(delegator1).approve(compensatorAddress, depositAmount);
      await compensator.connect(delegator1).delegatorDeposit(depositAmount);
      
      // Advance time past minimum lock period
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 3600]); // 8 days
      await ethers.provider.send("evm_mine");
      
      // Should still be locked due to pending proposal
      await expect(
        compensator.connect(delegator1).delegatorWithdraw(depositAmount)
      ).to.be.revertedWith("Cannot withdraw during active or pending proposals");
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("should handle zero amount deposits and withdrawals", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      await expect(
        compensator.connect(delegator1).delegatorDeposit(0)
      ).to.be.revertedWith("Amount must be greater than 0");
      
      await expect(
        compensator.connect(delegator1).delegatorWithdraw(0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("should handle delegation cap correctly", async function () {
      const compensatorAddress = await compensator.getAddress();
      const cap = await compensator.delegationCap();
      
      // Try to deposit more than cap
      await compToken.connect(delegator1).approve(compensatorAddress, cap + 1);
      await expect(
        compensator.connect(delegator1).delegatorDeposit(cap + 1)
      ).to.be.revertedWith("Delegation cap exceeded");
      
      // Deposit up to cap
      await compensator.connect(delegator1).delegatorDeposit(cap);
      
      // Try to deposit more
      await expect(
        compensator.connect(delegator1).delegatorDeposit(1)
      ).to.be.revertedWith("Delegation cap exceeded");
    });

    it("should handle reward rate changes correctly", async function () {
      const depositAmount = ethers.parseEther("100");
      const compensatorAddress = await compensator.getAddress();
      
      // Setup initial deposit
      await compToken.connect(delegator1).approve(compensatorAddress, depositAmount);
      await compensator.connect(delegator1).delegatorDeposit(depositAmount);
      
      // Set initial reward rate
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("1"));
      
      // Advance time
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");
      
      // Change reward rate
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("2"));
      
      // Advance time again
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");
      
      // Check rewards reflect both rates
      const rewards = await compensator.getPendingRewards(delegator1.address);
      expect(rewards).to.be.closeTo(
        ethers.parseEther("30"), // 10 seconds at rate 1 + 10 seconds at rate 2
        ethers.parseEther("1")
      );
    });
  });

  describe("Staking Functions", function () {
    beforeEach(async function () {
      // Setup mock governor responses
      await compoundGovernor.mock.state.returns(1); // Active state
      await compoundGovernor.mock.proposalSnapshot.returns(block.number + 1000);
    });

    it("should handle proposal staking correctly", async function () {
      const stakeAmount = ethers.parseEther("50");
      const compensatorAddress = await compensator.getAddress();
      
      // Fund the delegator
      await compToken.connect(delegator1).approve(compensatorAddress, stakeAmount);
      
      // Stake for proposal
      await expect(
        compensator.connect(delegator1).stakeForProposal(1, 1, stakeAmount)
      ).to.emit(compensator, "ProposalStaked")
        .withArgs(await delegator1.getAddress(), 1, 1, stakeAmount);
      
      // Check stake amounts
      const stake = await compensator.proposalStakes(1, delegator1.address);
      expect(stake.forStake).to.equal(stakeAmount);
      expect(stake.againstStake).to.equal(0);
    });

    it("should handle stake distribution correctly", async function () {
      const stakeAmount = ethers.parseEther("50");
      const compensatorAddress = await compensator.getAddress();
      
      // Setup stakes
      await compToken.connect(delegator1).approve(compensatorAddress, stakeAmount);
      await compensator.connect(delegator1).stakeForProposal(1, 1, stakeAmount);
      
      // Distribute stakes
      await expect(
        compensator.connect(delegate).distributeStakes(1, 1)
      ).to.emit(compensator, "ProposalStakeDistributed")
        .withArgs(1, 1);
      
      // Check outcome
      expect(await compensator.proposalOutcomes(1)).to.equal(2); // For won
    });

    it("should handle losing stake reclamation correctly", async function () {
      const stakeAmount = ethers.parseEther("50");
      const compensatorAddress = await compensator.getAddress();
      
      // Setup stakes
      await compToken.connect(delegator1).approve(compensatorAddress, stakeAmount);
      await compensator.connect(delegator1).stakeForProposal(1, 0, stakeAmount); // Stake against
      
      // Distribute stakes (For wins)
      await compensator.connect(delegate).distributeStakes(1, 1);
      
      // Reclaim losing stake
      await expect(
        compensator.connect(delegator1).reclaimLosingStake(1)
      ).to.emit(compensator, "LosingStakeReclaimed")
        .withArgs(await delegator1.getAddress(), 1, stakeAmount);
    });
  });

  describe("Multiple Delegator Interaction", function () {
    beforeEach(async function () {
      // Setup: Delegate deposits rewards and sets reward rate
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("10000"));
      await compensator.connect(delegate).delegateDeposit(ethers.parseEther("10000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("10"));
    });
    
    it("should distribute rewards proportionally among multiple delegators", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Delegator 1 deposits 100 tokens
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegator1).delegatorDeposit(ethers.parseEther("100"));
      
      // Advance time (10 seconds)
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");
      
      // Delegator 2 deposits 300 tokens (3x more than delegator1)
      await compToken.connect(delegator2).approve(compensatorAddress, ethers.parseEther("300"));
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

  describe("Proposal Staking and Resolution", function () {
    beforeEach(async function () {
      // Setup: Delegate deposits rewards and sets reward rate
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(delegate).delegateDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("1"));
    });

    it("should verify delegate voting before distributing stakes", async function () {
      const proposalId = 1;
      const stakeAmount = ethers.parseEther("100");
      const compensatorAddress = await compensator.getAddress();

      // Setup delegator with tokens
      await compToken.connect(delegator1).approve(compensatorAddress, stakeAmount);
      await compensator.connect(delegator1).stakeForProposal(proposalId, 1, stakeAmount);

      // Mock delegate voting
      await compoundGovernor.mockHasVoted(proposalId, delegate.address, true);
      await compoundGovernor.mockProposalVotes(proposalId, ethers.parseEther("100"), ethers.parseEther("50"), 0);

      // Resolve proposal
      await compoundGovernor.mockState(proposalId, 4); // Succeeded state
      await compensator.resolveProposal(proposalId);

      // Check delegate voting verification
      const delegateVoted = await compensator.delegateVoted(proposalId);
      const delegateVoteDirection = await compensator.delegateVoteDirection(proposalId);
      expect(delegateVoted).to.be.true;
      expect(delegateVoteDirection).to.equal(1); // For
    });

    it("should only distribute winning stakes if delegate voted correctly", async function () {
      const proposalId = 2;
      const stakeAmount = ethers.parseEther("100");
      const compensatorAddress = await compensator.getAddress();

      // Setup delegator with tokens
      await compToken.connect(delegator1).approve(compensatorAddress, stakeAmount);
      await compensator.connect(delegator1).stakeForProposal(proposalId, 1, stakeAmount);

      // Mock delegate voting in wrong direction
      await compoundGovernor.mockHasVoted(proposalId, delegate.address, true);
      await compoundGovernor.mockProposalVotes(proposalId, ethers.parseEther("50"), ethers.parseEther("100"), 0);

      // Resolve proposal
      await compoundGovernor.mockState(proposalId, 4); // Succeeded state
      await compensator.resolveProposal(proposalId);

      // Check that winning stakes were not distributed
      const delegateBalance = await compToken.balanceOf(delegate.address);
      expect(delegateBalance).to.equal(ethers.parseEther("10000")); // Initial balance unchanged
    });

    it("should auto-resolve proposals after timeout", async function () {
      const proposalId = 3;
      const stakeAmount = ethers.parseEther("100");
      const compensatorAddress = await compensator.getAddress();

      // Setup delegator with tokens
      await compToken.connect(delegator1).approve(compensatorAddress, stakeAmount);
      await compensator.connect(delegator1).stakeForProposal(proposalId, 1, stakeAmount);

      // Advance time past MAX_PROPOSAL_RESOLUTION_TIME
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]); // 31 days
      await ethers.provider.send("evm_mine");

      // Try to reclaim losing stake
      await compensator.connect(delegator1).reclaimLosingStake(proposalId);

      // Check proposal was auto-resolved
      const outcome = await compensator.proposalOutcomes(proposalId);
      expect(outcome).to.equal(2); // Against won (auto-resolved)
    });

    it("should track proposal states correctly", async function () {
      const proposalId = 4;
      const stakeAmount = ethers.parseEther("100");
      const compensatorAddress = await compensator.getAddress();

      // Setup delegator with tokens
      await compToken.connect(delegator1).approve(compensatorAddress, stakeAmount);
      await compensator.connect(delegator1).stakeForProposal(proposalId, 1, stakeAmount);

      // Check proposal is tracked as active
      const isActive = await compensator.activeProposals(proposalId);
      expect(isActive).to.be.true;

      // Mock proposal becoming pending
      await compoundGovernor.mockProposalSnapshot(proposalId, (await ethers.provider.getBlockNumber()) + 100);
      await compensator.connect(delegator1).stakeForProposal(proposalId, 1, stakeAmount);

      // Check proposal is tracked as pending
      const isPending = await compensator.pendingProposals(proposalId);
      expect(isPending).to.be.true;
    });

    it("should emit correct events for delegate voting verification", async function () {
      const proposalId = 5;
      const stakeAmount = ethers.parseEther("100");
      const compensatorAddress = await compensator.getAddress();

      // Setup delegator with tokens
      await compToken.connect(delegator1).approve(compensatorAddress, stakeAmount);
      await compensator.connect(delegator1).stakeForProposal(proposalId, 1, stakeAmount);

      // Mock delegate voting
      await compoundGovernor.mockHasVoted(proposalId, delegate.address, true);
      await compoundGovernor.mockProposalVotes(proposalId, ethers.parseEther("100"), ethers.parseEther("50"), 0);

      // Resolve proposal and check events
      await compoundGovernor.mockState(proposalId, 4); // Succeeded state
      const tx = await compensator.resolveProposal(proposalId);
      const receipt = await tx.wait();

      // Check DelegateVotingVerified event
      const delegateVotingVerifiedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'DelegateVotingVerified'
      );
      expect(delegateVotingVerifiedEvent).to.not.be.undefined;
      expect(delegateVotingVerifiedEvent.args.hasVoted).to.be.true;
      expect(delegateVotingVerifiedEvent.args.voteDirection).to.equal(1);
    });
  });

  it("should return correct token and governor addresses", async function () {
    expect(await compensator.COMP_TOKEN()).to.equal(await compToken.getAddress());
    expect(await compensator.COMPOUND_GOVERNOR()).to.equal(await compoundGovernor.getAddress());
  });

  describe("Access Control", function () {
    it("Only delegate can call delegateDeposit", async function () {
      const { compensator, delegate, otherAccount } = await loadFixture(deployCompensatorFixture);
      await expect(compensator.connect(otherAccount).delegateDeposit(100))
        .to.be.revertedWith("Only delegate can deposit");
    });

    it("Only delegate can call delegateWithdraw", async function () {
      const { compensator, delegate, otherAccount } = await loadFixture(deployCompensatorFixture);
      await expect(compensator.connect(otherAccount).delegateWithdraw(100))
        .to.be.revertedWith("Only delegate can withdraw");
    });

    it("Only delegate can call setRewardRate", async function () {
      const { compensator, delegate, otherAccount } = await loadFixture(deployCompensatorFixture);
      await expect(compensator.connect(otherAccount).setRewardRate(100))
        .to.be.revertedWith("Only delegate can set reward rate");
    });

    it("Delegate can call delegateDeposit", async function () {
      const { compensator, delegate, compToken } = await loadFixture(deployCompensatorFixture);
      await compToken.mint(delegate.address, 100);
      await compToken.connect(delegate).approve(compensator.address, 100);
      await expect(compensator.connect(delegate).delegateDeposit(100))
        .to.not.be.reverted;
    });

    it("Delegate can call delegateWithdraw", async function () {
      const { compensator, delegate, compToken } = await loadFixture(deployCompensatorFixture);
      await compToken.mint(delegate.address, 100);
      await compToken.connect(delegate).approve(compensator.address, 100);
      await compensator.connect(delegate).delegateDeposit(100);
      await expect(compensator.connect(delegate).delegateWithdraw(50))
        .to.not.be.reverted;
    });

    it("Delegate can call setRewardRate", async function () {
      const { compensator, delegate } = await loadFixture(deployCompensatorFixture);
      await expect(compensator.connect(delegate).setRewardRate(100))
        .to.not.be.reverted;
    });
  });
});
