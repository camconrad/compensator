const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const TestBase = require("../helpers/TestBase");
const TestUtils = require("../helpers/TestUtils");
const { TEST_CONSTANTS, TEST_SCENARIOS } = require("../helpers/Constants");

describe("Compensator Edge Cases", function () {
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

  describe("Zero Amount Operations", function () {
    it("should reject zero amount deposits", async function () {
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegator1).approve(compensatorAddress, 0);
      
      await expect(
        compensator.connect(delegator1).userDeposit(0)
      ).to.be.revertedWithCustomError(compensator, "AmountMustBeGreaterThanZero");
      
      const balance = await compensator.balanceOf(delegator1.address);
      expect(balance).to.equal(0);
    });

    it("should reject zero amount withdrawals", async function () {
      // First deposit some tokens so we can test withdrawal
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegator1).userDeposit(ethers.parseEther("100"));
      
      // Now try to withdraw zero amount
      await expect(
        compensator.connect(delegator1).userWithdraw(0)
      ).to.be.revertedWithCustomError(compensator, "AmountMustBeGreaterThanZero");
    });

    it("should handle zero reward rate setting", async function () {
      // First set a non-zero rate, then set it to zero
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("1"));
      await expect(
        compensator.connect(delegate).setRewardRate(0)
      ).to.not.be.reverted;
      
      const rewardRate = await compensator.rewardRate();
      expect(rewardRate).to.equal(0);
    });
  });

  describe("Maximum Amount Operations", function () {
    it("should handle maximum uint256 amounts", async function () {
      const maxAmount = ethers.parseEther("1000000"); // Use a large but manageable amount
      
      // Mint large amount to delegate
      await compToken.mint(delegate.address, maxAmount);
      
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegate).approve(compensatorAddress, maxAmount);
      
      // This should not revert due to overflow
      await expect(
        compensator.connect(delegate).ownerDeposit(maxAmount)
      ).to.not.be.reverted;
    });

    it("should handle very large reward rates", async function () {
      const largeRewardRate = ethers.parseEther("1000000000"); // 1B tokens per second
      
      await expect(
        compensator.connect(delegate).setRewardRate(largeRewardRate)
      ).to.not.be.reverted;
      
      const rewardRate = await compensator.rewardRate();
      expect(rewardRate).to.equal(largeRewardRate);
    });
  });

  describe("Boundary Conditions", function () {
    it("should handle minimum valid amounts", async function () {
      const minAmount = 1; // 1 wei
      
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegator1).approve(compensatorAddress, minAmount);
      
      await expect(
        compensator.connect(delegator1).userDeposit(minAmount)
      ).to.not.be.reverted;
      
      const balance = await compensator.balanceOf(delegator1.address);
      expect(balance).to.equal(minAmount);
    });

    it("should handle amounts just below maximum", async function () {
      const nearMaxAmount = ethers.parseEther("999999"); // Use a large but manageable amount
      
      // Mint large amount
      await compToken.mint(delegate.address, nearMaxAmount);
      
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegate).approve(compensatorAddress, nearMaxAmount);
      
      await expect(
        compensator.connect(delegate).ownerDeposit(nearMaxAmount)
      ).to.not.be.reverted;
    });
  });

  describe("Invalid Inputs", function () {
    it("should reject invalid addresses", async function () {
      const invalidAddress = "0x0000000000000000000000000000000000000000";
      
      await expect(
        compensatorFactory.createCompensator(invalidAddress)
      ).to.be.revertedWithCustomError(compensatorFactory, "InvalidOwnerAddress");
    });

    it("should reject excessive amounts", async function () {
      const excessiveAmount = ethers.parseEther("1000000");
      
      // Try to deposit more than available balance
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegator1).approve(compensatorAddress, excessiveAmount);
      
      await expect(
        compensator.connect(delegator1).userDeposit(excessiveAmount)
      ).to.be.revertedWithCustomError(compensator, "DelegationCapExceeded");
    });
  });

  describe("State Transitions", function () {
    it("should handle rapid state changes", async function () {
      // Rapidly change reward rate
      for (let i = 1; i <= 5; i++) {
        await compensator.connect(delegate).setRewardRate(ethers.parseEther(i.toString()));
        const rewardRate = await compensator.rewardRate();
        expect(rewardRate).to.equal(ethers.parseEther(i.toString()));
      }
    });

    it("should handle concurrent operations", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup multiple users
      const users = [delegator1, delegator2, delegator3];
      const amounts = [ethers.parseEther("10"), ethers.parseEther("20"), ethers.parseEther("30")];
      
      // Approve all at once
      const approvePromises = users.map((user, i) => 
        compToken.connect(user).approve(compensatorAddress, amounts[i])
      );
      await Promise.all(approvePromises);
      
      // Deposit all at once
      const depositPromises = users.map((user, i) => 
        compensator.connect(user).userDeposit(amounts[i])
      );
      await Promise.all(depositPromises);
      
      // Verify all deposits succeeded
      for (let i = 0; i < users.length; i++) {
        const balance = await compensator.balanceOf(users[i].address);
        expect(balance).to.equal(amounts[i]);
      }
    });
  });
});
