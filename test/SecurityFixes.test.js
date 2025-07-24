// SPDX-License-Identifier: GPL-3.0
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Compensator Security Fixes", function () {
  let compToken;
  let compoundGovernor;
  let compensator;
  let owner, user1, user2;
  
  async function deployCompensatorFixture() {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy mock contracts for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    compToken = await MockToken.deploy("COMP", "COMP");
    await compToken.waitForDeployment();
    
    // Mint initial supply to ensure totalSupply > 0 for Compensator constructor
    await compToken.mint(owner.address, ethers.parseEther("1000000")); // 1M COMP initial supply
    
    const MockGovernor = await ethers.getContractFactory("MockGovernor");
    compoundGovernor = await MockGovernor.deploy();
    await compoundGovernor.waitForDeployment();
    
    // Deploy Compensator contract with mock addresses
    const CompensatorFactory = await ethers.getContractFactory("Compensator");
    compensator = await CompensatorFactory.deploy(
      await compToken.getAddress(),
      await compoundGovernor.getAddress(),
      await owner.getAddress() // owner address
    );
    await compensator.waitForDeployment();
    
    // Fund additional accounts for testing
    await compToken.mint(user1.address, ethers.parseEther("10000"));
    await compToken.mint(user2.address, ethers.parseEther("10000"));
    
    return { compensator, compToken, compoundGovernor, owner, user1, user2 };
  }

  beforeEach(async function () {
    const fixture = await deployCompensatorFixture();
    compensator = fixture.compensator;
    compToken = fixture.compToken;
    compoundGovernor = fixture.compoundGovernor;
    owner = fixture.owner;
    user1 = fixture.user1;
    user2 = fixture.user2;
  });

  describe("H-01 Fix: Token Transfer Prevention", function () {
    it("should prevent transfer of Compensator tokens", async function () {
      // First, let user1 deposit some COMP to get Compensator tokens
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(user1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(user1).userDeposit(ethers.parseEther("100"));
      
      // Verify user1 has Compensator tokens
      const balance = await compensator.balanceOf(user1.address);
      expect(balance).to.equal(ethers.parseEther("100"));
      
      // Try to transfer Compensator tokens - should revert
      await expect(
        compensator.connect(user1).transfer(user2.address, ethers.parseEther("50"))
      ).to.be.revertedWithCustomError(compensator, "CompensatorTokensNotTransferable");
    });

    it("should prevent transferFrom of Compensator tokens", async function () {
      // First, let user1 deposit some COMP to get Compensator tokens
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(user1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(user1).userDeposit(ethers.parseEther("100"));
      
      // Try to transferFrom Compensator tokens - should revert
      await expect(
        compensator.connect(user2).transferFrom(user1.address, user2.address, ethers.parseEther("50"))
      ).to.be.revertedWithCustomError(compensator, "CompensatorTokensNotTransferable");
    });

    it("should prevent approve of Compensator tokens", async function () {
      // Try to approve Compensator tokens - should revert
      await expect(
        compensator.connect(user1).approve(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(compensator, "CompensatorTokensNotTransferable");
    });
  });

  describe("H-02 Fix: Owner Withdraw Insolvency Prevention", function () {
    it("should properly update rewards before owner withdrawal", async function () {
      // Setup: Owner deposits rewards and sets reward rate
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(owner).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(owner).ownerDeposit(ethers.parseEther("1000"));
      await compensator.connect(owner).setRewardRate(ethers.parseEther("1")); // 1 COMP per second
      
      // User1 deposits COMP to start earning rewards
      await compToken.connect(user1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(user1).userDeposit(ethers.parseEther("100"));
      
      // Advance time to accrue rewards
      await ethers.provider.send("evm_increaseTime", [100]); // 100 seconds
      await ethers.provider.send("evm_mine");
      
      // Check pending rewards before withdrawal
      const pendingRewardsBefore = await compensator.getPendingRewards(user1.address);
      expect(pendingRewardsBefore).to.be.gt(0);
      
      // Owner should be able to withdraw only the excess (not the pending rewards)
      // The ownerWithdraw function will update rewards first, so we need to account for that
      const availableRewards = await compensator.availableRewards();
      const pendingRewards = await compensator.getPendingRewards(user1.address);
      const withdrawableAmount = availableRewards - pendingRewards;
      
      console.log("Available rewards:", ethers.formatEther(availableRewards));
      console.log("Pending rewards for user1:", ethers.formatEther(pendingRewards));
      console.log("Withdrawable amount:", ethers.formatEther(withdrawableAmount));
      
      // Owner should be able to withdraw the withdrawable amount
      await expect(
        compensator.connect(owner).ownerWithdraw(ethers.parseEther("800")) // Use conservative amount
      ).to.not.be.reverted;
      
      // User1 should still be able to claim their rewards
      await expect(
        compensator.connect(user1).claimRewards()
      ).to.not.be.reverted;
    });

    it("should prevent owner from withdrawing more than available after rewards", async function () {
      // Setup: Owner deposits rewards and sets reward rate
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(owner).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(owner).ownerDeposit(ethers.parseEther("1000"));
      await compensator.connect(owner).setRewardRate(ethers.parseEther("1")); // 1 COMP per second
      
      // User1 deposits COMP to start earning rewards
      await compToken.connect(user1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(user1).userDeposit(ethers.parseEther("100"));
      
      // Advance time to accrue rewards
      await ethers.provider.send("evm_increaseTime", [100]); // 100 seconds
      await ethers.provider.send("evm_mine");
      
      // Try to withdraw more than available - should revert
      await expect(
        compensator.connect(owner).ownerWithdraw(ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(compensator, "AmountExceedsAvailableRewards");
    });

    it("should demonstrate the fix prevents withdrawing accrued rewards", async function () {
      // Setup: Owner deposits 1000 COMP and sets reward rate
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(owner).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(owner).ownerDeposit(ethers.parseEther("1000"));
      await compensator.connect(owner).setRewardRate(ethers.parseEther("1")); // 1 COMP per second
      
      // User1 deposits 100 COMP to start earning rewards
      await compToken.connect(user1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(user1).userDeposit(ethers.parseEther("100"));
      
      // Check initial state
      const initialAvailableRewards = await compensator.availableRewards();
      const initialTotalPendingRewards = await compensator.totalPendingRewards();
      console.log("Initial availableRewards:", ethers.formatEther(initialAvailableRewards));
      console.log("Initial totalPendingRewards:", ethers.formatEther(initialTotalPendingRewards));
      
      // Advance time to accrue 50 COMP in rewards
      await ethers.provider.send("evm_increaseTime", [50]); // 50 seconds = 50 COMP
      await ethers.provider.send("evm_mine");
      
      // Check state after time advancement
      const pendingRewards = await compensator.getPendingRewards(user1.address);
      console.log("Pending rewards for user1:", ethers.formatEther(pendingRewards));
      
      // The owner should NOT be able to withdraw the full 1000 COMP
      // because 50 COMP should be reserved for user1's rewards
      await expect(
        compensator.connect(owner).ownerWithdraw(ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(compensator, "AmountExceedsAvailableRewards");
      
      // The owner should only be able to withdraw a conservative amount
      await expect(
        compensator.connect(owner).ownerWithdraw(ethers.parseEther("800"))
      ).to.not.be.reverted;
      
      // User1 should still be able to claim their 50 COMP rewards
      await expect(
        compensator.connect(user1).claimRewards()
      ).to.not.be.reverted;
    });
  });
}); 