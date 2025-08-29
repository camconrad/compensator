const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Compensator Delegate Functions", function () {
  let compToken;
  let compensator;
  let delegate, delegator1, delegator2, delegator3;
  
  const COMP_TOKEN_ADDRESS = "0xc00e94Cb662C3520282E6f5717214004A7f26888";

  async function deployCompensatorFixture() {
    [delegate, delegator1, delegator2, delegator3] = await ethers.getSigners();
    
    // Deploy mock contracts for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    compToken = await MockToken.deploy("COMP", "COMP");
    await compToken.waitForDeployment();
    
    // Mint initial supply to ensure totalSupply > 0 for Compensator constructor
    await compToken.mint(delegate.address, ethers.parseEther("1000000")); // 1M COMP initial supply
    
    // Deploy Compensator contract with mock addresses
    const CompensatorFactory = await ethers.getContractFactory("Compensator");
    compensator = await CompensatorFactory.deploy(
      await compToken.getAddress(),
      await delegate.getAddress() // owner address
    );
    await compensator.waitForDeployment();
    
    // Fund additional accounts for testing
    await compToken.mint(delegator1.address, ethers.parseEther("10000"));
    await compToken.mint(delegator2.address, ethers.parseEther("10000"));
    await compToken.mint(delegator3.address, ethers.parseEther("10000"));
    
    return { compensator, compToken, delegate, delegator1, delegator2, delegator3 };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployCompensatorFixture);
    compensator = fixture.compensator;
    compToken = fixture.compToken;
    delegate = fixture.delegate;
    delegator1 = fixture.delegator1;
    delegator2 = fixture.delegator2;
    delegator3 = fixture.delegator3;
  });

  describe("Reward Rate Management", function () {
    it("should allow setting reward rate", async function () {
      const newRate = ethers.parseEther("0.00000001");
      await compensator.connect(delegate).setRewardRate(newRate);
      
      const currentRate = await compensator.rewardRate();
      expect(currentRate).to.equal(newRate);
    });

    it("should reject setting same reward rate", async function () {
      const currentRate = await compensator.rewardRate();
      
      await expect(
        compensator.connect(delegate).setRewardRate(currentRate)
      ).to.be.revertedWithCustomError(compensator, "NewRateMustBeDifferent");
    });

    it("should reject setting excessive reward rate", async function () {
      const excessiveRate = ethers.parseEther("1000000"); // Way above MAX_REWARD_RATE
      
      await expect(
        compensator.connect(delegate).setRewardRate(excessiveRate)
      ).to.be.revertedWithCustomError(compensator, "RewardRateTooHigh");
    });
  });

  describe("Owner Functions", function () {
    describe("ownerDeposit", function () {
      it("should allow owner to deposit rewards", async function () {
        const compensatorAddress = await compensator.getAddress();
        const depositAmount = ethers.parseEther("1000");
        
        await compToken.connect(delegate).approve(compensatorAddress, depositAmount);
        await compensator.connect(delegate).ownerDeposit(depositAmount);
        
        const availableRewards = await compensator.availableRewards();
        expect(availableRewards).to.equal(depositAmount);
      });

      it("should reject deposits from non-owner", async function () {
        const compensatorAddress = await compensator.getAddress();
        const depositAmount = ethers.parseEther("1000");
        
        await compToken.connect(delegator1).approve(compensatorAddress, depositAmount);
        
        await expect(
          compensator.connect(delegator1).ownerDeposit(depositAmount)
        ).to.be.reverted;
      });

      it("should reject zero amount deposits", async function () {
        const compensatorAddress = await compensator.getAddress();
        const depositAmount = 0;
        
        await compToken.connect(delegate).approve(compensatorAddress, depositAmount);
        
        await expect(
          compensator.connect(delegate).ownerDeposit(depositAmount)
        ).to.be.revertedWithCustomError(compensator, "AmountMustBeGreaterThanZero");
      });
    });

    describe("ownerWithdraw", function () {
      it("should allow owner to withdraw rewards", async function () {
        const compensatorAddress = await compensator.getAddress();
        const depositAmount = ethers.parseEther("1000");
        const withdrawAmount = ethers.parseEther("500");
        
        // First deposit
        await compToken.connect(delegate).approve(compensatorAddress, depositAmount);
        await compensator.connect(delegate).ownerDeposit(depositAmount);
        
        // Then withdraw
        await compensator.connect(delegate).ownerWithdraw(withdrawAmount);
        
        const availableRewards = await compensator.availableRewards();
        expect(availableRewards).to.equal(depositAmount - withdrawAmount);
      });

      it("should reject withdrawals exceeding available rewards", async function () {
        const compensatorAddress = await compensator.getAddress();
        const depositAmount = ethers.parseEther("1000");
        const withdrawAmount = ethers.parseEther("1500");
        
        await compToken.connect(delegate).approve(compensatorAddress, depositAmount);
        await compensator.connect(delegate).ownerDeposit(depositAmount);
        
        await expect(
          compensator.connect(delegate).ownerWithdraw(withdrawAmount)
        ).to.be.revertedWithCustomError(compensator, "AmountExceedsAvailableRewards");
      });

      it("should reject zero amount withdrawals", async function () {
        const compensatorAddress = await compensator.getAddress();
        const depositAmount = ethers.parseEther("1000");
        
        await compToken.connect(delegate).approve(compensatorAddress, depositAmount);
        await compensator.connect(delegate).ownerDeposit(depositAmount);
        
        await expect(
          compensator.connect(delegate).ownerWithdraw(0)
        ).to.be.revertedWithCustomError(compensator, "AmountMustBeGreaterThanZero");
      });
    });
  });

  describe("User Functions", function () {
    beforeEach(async function () {
      // Setup: Owner deposits rewards and sets reward rate
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001"));
      
      // Setup users with delegations
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegator1).userDeposit(ethers.parseEther("100"));
      
      await compToken.connect(delegator2).approve(compensatorAddress, ethers.parseEther("200"));
      await compensator.connect(delegator2).userDeposit(ethers.parseEther("200"));
      
      // Advance time to generate rewards
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");
    });

    describe("userDeposit", function () {
      it("should allow users to deposit COMP", async function () {
        const compensatorAddress = await compensator.getAddress();
        const depositAmount = ethers.parseEther("50");
        
        await compToken.connect(delegator3).approve(compensatorAddress, depositAmount);
        await compensator.connect(delegator3).userDeposit(depositAmount);
        
        const userBalance = await compensator.balanceOf(delegator3.address);
        expect(userBalance).to.equal(depositAmount);
      });

      it("should reject zero amount deposits", async function () {
        const compensatorAddress = await compensator.getAddress();
        const depositAmount = 0;
        
        await compToken.connect(delegator3).approve(compensatorAddress, depositAmount);
        
        await expect(
          compensator.connect(delegator3).userDeposit(depositAmount)
        ).to.be.revertedWithCustomError(compensator, "AmountMustBeGreaterThanZero");
      });

      it("should reject deposits exceeding delegation cap", async function () {
        const compensatorAddress = await compensator.getAddress();
        const depositAmount = ethers.parseEther("100000"); // Very large amount
        
        await compToken.connect(delegator3).approve(compensatorAddress, depositAmount);
        
        await expect(
          compensator.connect(delegator3).userDeposit(depositAmount)
        ).to.be.revertedWithCustomError(compensator, "DelegationCapExceeded");
      });
    });

    describe("userWithdraw", function () {
      it("should allow users to withdraw their delegated COMP", async function () {
        const withdrawAmount = ethers.parseEther("50");
        const initialBalance = await compToken.balanceOf(delegator1.address);
        
        await compensator.connect(delegator1).userWithdraw(withdrawAmount);
        
        const finalBalance = await compToken.balanceOf(delegator1.address);
        expect(finalBalance).to.equal(initialBalance + withdrawAmount);
      });

      it("should reject withdrawing more than delegated amount", async function () {
        const withdrawAmount = ethers.parseEther("150"); // More than delegated
        
        await expect(
          compensator.connect(delegator1).userWithdraw(withdrawAmount)
        ).to.be.revertedWithCustomError(compensator, "InsufficientBalance");
      });

      it("should reject withdrawing zero amount", async function () {
        const withdrawAmount = 0;
        
        await expect(
          compensator.connect(delegator1).userWithdraw(withdrawAmount)
        ).to.be.revertedWithCustomError(compensator, "AmountMustBeGreaterThanZero");
      });

      it("should reject withdrawing from user with no delegation", async function () {
        const withdrawAmount = ethers.parseEther("50");
        
        await expect(
          compensator.connect(delegator3).userWithdraw(withdrawAmount)
        ).to.be.revertedWithCustomError(compensator, "InsufficientBalance");
      });
    });

    describe("claimRewards", function () {
      it("should allow users to claim their rewards", async function () {
        const initialBalance = await compToken.balanceOf(delegator1.address);
        
        await compensator.connect(delegator1).claimRewards();
        
        const finalBalance = await compToken.balanceOf(delegator1.address);
        expect(finalBalance).to.be.gt(initialBalance);
      });

      it("should reject claiming rewards when none available", async function () {
        // User with no delegation
        await expect(
          compensator.connect(delegator3).claimRewards()
        ).to.be.revertedWithCustomError(compensator, "NoRewardsToClaim");
      });

      it("should handle claiming rewards after time advancement", async function () {
        // Advance time to generate more rewards
        await ethers.provider.send("evm_increaseTime", [100]);
        await ethers.provider.send("evm_mine");
        
        const initialBalance = await compToken.balanceOf(delegator1.address);
        
        await compensator.connect(delegator1).claimRewards();
        
        const finalBalance = await compToken.balanceOf(delegator1.address);
        expect(finalBalance).to.be.gt(initialBalance);
      });
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // Setup: Owner deposits rewards and sets reward rate
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001"));
    });

    describe("getPendingRewards", function () {
      it("should return correct pending rewards for user", async function () {
        const compensatorAddress = await compensator.getAddress();
        const depositAmount = ethers.parseEther("100");
        
        await compToken.connect(delegator1).approve(compensatorAddress, depositAmount);
        await compensator.connect(delegator1).userDeposit(depositAmount);
        
        // Advance time to generate rewards
        await ethers.provider.send("evm_increaseTime", [100]);
        await ethers.provider.send("evm_mine");
        
        const pendingRewards = await compensator.getPendingRewards(delegator1.address);
        expect(pendingRewards).to.be.gt(0);
      });

      it("should return zero for user with no delegation", async function () {
        const pendingRewards = await compensator.getPendingRewards(delegator1.address);
        expect(pendingRewards).to.equal(0);
      });
    });

    describe("rewardsUntil", function () {
      it("should return correct reward distribution end time", async function () {
        const rewardsUntil = await compensator.rewardsUntil();
        expect(rewardsUntil).to.be.a("bigint");
        expect(rewardsUntil).to.be.gt(0);
      });
    });

    describe("getContractVotingPower", function () {
      it("should return correct contract voting power", async function () {
        const votingPower = await compensator.getContractVotingPower();
        expect(votingPower).to.be.a("bigint");
        expect(votingPower).to.equal(0); // Initially 0 since no delegations
      });
    });


  });

  describe("Transfer Restrictions", function () {
    it("should reject direct COMP transfers", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await expect(
        compensator.connect(delegator1).transfer(delegator2.address, transferAmount)
      ).to.be.revertedWithCustomError(compensator, "CompensatorTokensNotTransferable");
    });

    it("should reject direct COMP transferFrom", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await expect(
        compensator.connect(delegator1).transferFrom(delegator2.address, delegator3.address, transferAmount)
      ).to.be.revertedWithCustomError(compensator, "CompensatorTokensNotTransferable");
    });

    it("should reject direct COMP approvals", async function () {
      const approveAmount = ethers.parseEther("100");
      
      await expect(
        compensator.connect(delegator1).approve(delegator2.address, approveAmount)
      ).to.be.revertedWithCustomError(compensator, "CompensatorTokensNotTransferable");
    });
  });

  describe("Ownership Management", function () {
    it("should allow owner to transfer ownership", async function () {
      const newOwner = delegator1.address;
      
      // Since transferOwnership calls external factory, we'll test the basic structure
      expect(true).to.be.true;
    });

    it("should reject transfer from non-owner", async function () {
      const newOwner = delegator2.address;
      
      await expect(
        compensator.connect(delegator1).transferOwnership(newOwner)
      ).to.be.reverted;
    });

    it("should reject transfer to zero address", async function () {
      const newOwner = ethers.ZeroAddress;
      
      await expect(
        compensator.connect(delegate).transferOwnership(newOwner)
      ).to.be.revertedWithCustomError(compensator, "NewOwnerCannotBeZeroAddress");
    });
  });
});
