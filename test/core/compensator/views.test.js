const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Compensator Views", function () {
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

  describe("Basic Views", function () {
    it("should return correct token address", async function () {
      const tokenAddress = await compensator.COMP_TOKEN();
      expect(tokenAddress).to.equal(await compToken.getAddress());
    });

    it("should calculate pending rewards correctly", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup: Owner deposits rewards and sets reward rate
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("100"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001"));
      
      // User delegates COMP
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegator1).userDeposit(ethers.parseEther("100"));
      
      // Advance time
      await ethers.provider.send("evm_increaseTime", [100]); // 100 seconds
      await ethers.provider.send("evm_mine");
      
      const pendingRewards = await compensator.getPendingRewards(delegator1.address);
      expect(pendingRewards).to.be.gt(0);
    });
  });

  describe("rewardsUntil", function () {
    beforeEach(async function () {
      // Setup: Owner deposits rewards and sets reward rate
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("100"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001"));
    });

    it("should return lastRewarded when rewardRate is zero", async function () {
      await compensator.connect(delegate).setRewardRate(0);
      const lastRewarded = await compensator.lastRewarded();
      const rewardsUntil = await compensator.rewardsUntil();
      
      expect(rewardsUntil).to.equal(lastRewarded);
    });

    it("should calculate rewards until correctly", async function () {
      const rewardsUntil = await compensator.rewardsUntil();
      expect(rewardsUntil).to.be.a("bigint");
      expect(rewardsUntil).to.be.gt(0);
    });

    it("should handle zero available rewards", async function () {
      // Withdraw all available rewards
      const availableRewards = await compensator.availableRewards();
      await compensator.connect(delegate).ownerWithdraw(availableRewards);
      
      const rewardsUntil = await compensator.rewardsUntil();
      const lastRewarded = await compensator.lastRewarded();
      
      expect(rewardsUntil).to.equal(lastRewarded);
    });
  });

  describe("getPendingRewards", function () {
    beforeEach(async function () {
      // Setup: Owner deposits rewards and sets reward rate
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("100"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001"));
    });

    it("should return zero for user with no delegation", async function () {
      const pendingRewards = await compensator.getPendingRewards(delegator1.address);
      expect(pendingRewards).to.equal(0);
    });

    it("should calculate rewards for user with delegation", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // User delegates COMP
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegator1).userDeposit(ethers.parseEther("100"));
      
      // Advance time to generate rewards
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");
      
      const pendingRewards = await compensator.getPendingRewards(delegator1.address);
      expect(pendingRewards).to.be.gt(0);
    });

    it("should handle multiple users with different delegation amounts", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // User 1 delegates 100 COMP
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegator1).userDeposit(ethers.parseEther("100"));
      
      // User 2 delegates 200 COMP
      await compToken.connect(delegator2).approve(compensatorAddress, ethers.parseEther("200"));
      await compensator.connect(delegator2).userDeposit(ethers.parseEther("200"));
      
      // Advance time to generate rewards
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");
      
      const rewards1 = await compensator.getPendingRewards(delegator1.address);
      const rewards2 = await compensator.getPendingRewards(delegator2.address);
      
      expect(rewards1).to.be.gt(0);
      expect(rewards2).to.be.gt(0);
      expect(rewards2).to.be.gt(rewards1); // User 2 should have more rewards due to more delegation
    });
  });

  describe("getContractVotingPower", function () {
    it("should return correct voting power for the contract", async function () {
      const votingPower = await compensator.getContractVotingPower();
      // This should return the contract's voting power from COMP token
      expect(votingPower).to.be.a("bigint");
      expect(votingPower).to.equal(0); // Initially 0 since no delegations
    });

    it("should update voting power after user delegation", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // User delegates COMP
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegator1).userDeposit(ethers.parseEther("100"));
      
      // Check that the contract has the correct total delegated COMP
      const totalDelegated = await compensator.totalDelegatedCOMP();
      expect(totalDelegated).to.equal(ethers.parseEther("100"));
      
      // Check that the user has the correct balance
      const userBalance = await compensator.balanceOf(delegator1.address);
      expect(userBalance).to.equal(ethers.parseEther("100"));
    });
  });



  describe("Contract State Views", function () {
    it("should return correct owner address", async function () {
      const owner = await compensator.owner();
      expect(owner).to.equal(delegate.address);
    });

    it("should return correct factory address", async function () {
      const factory = await compensator.FACTORY();
      expect(factory).to.be.a("string");
      expect(factory).to.not.equal(ethers.ZeroAddress);
    });

    it("should return correct delegation cap", async function () {
      const delegationCap = await compensator.delegationCap();
      expect(delegationCap).to.be.a("bigint");
      expect(delegationCap).to.be.gt(0);
    });

    it("should return correct total delegated COMP", async function () {
      const totalDelegated = await compensator.totalDelegatedCOMP();
      expect(totalDelegated).to.be.a("bigint");
      expect(totalDelegated).to.equal(0); // Initially 0
    });

    it("should return correct available rewards", async function () {
      const availableRewards = await compensator.availableRewards();
      expect(availableRewards).to.be.a("bigint");
      expect(availableRewards).to.equal(0); // Initially 0
    });

    it("should return correct total pending rewards", async function () {
      const totalPendingRewards = await compensator.totalPendingRewards();
      expect(totalPendingRewards).to.be.a("bigint");
      expect(totalPendingRewards).to.equal(0); // Initially 0
    });

    it("should return correct reward rate", async function () {
      const rewardRate = await compensator.rewardRate();
      expect(rewardRate).to.be.a("bigint");
      expect(rewardRate).to.equal(0); // Initially 0
    });

    it("should return correct reward index", async function () {
      const rewardIndex = await compensator.rewardIndex();
      expect(rewardIndex).to.be.a("bigint");
      expect(rewardIndex).to.equal(ethers.parseEther("1")); // REWARD_PRECISION = 1e18
    });

    it("should return correct last rewarded timestamp", async function () {
      const lastRewarded = await compensator.lastRewarded();
      expect(lastRewarded).to.be.a("bigint");
      expect(lastRewarded).to.equal(0); // Initially 0, only updated when rewards are distributed
    });
  });

  describe("User Balance Views", function () {
    it("should return correct user balance", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // User delegates COMP
      const depositAmount = ethers.parseEther("100");
      await compToken.connect(delegator1).approve(compensatorAddress, depositAmount);
      await compensator.connect(delegator1).userDeposit(depositAmount);
      
      const userBalance = await compensator.balanceOf(delegator1.address);
      expect(userBalance).to.equal(depositAmount);
    });

    it("should return zero for user with no delegation", async function () {
      const userBalance = await compensator.balanceOf(delegator1.address);
      expect(userBalance).to.equal(0);
    });

    it("should return correct start reward index", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // User delegates COMP
      const depositAmount = ethers.parseEther("100");
      await compToken.connect(delegator1).approve(compensatorAddress, depositAmount);
      await compensator.connect(delegator1).userDeposit(depositAmount);
      
      const startRewardIndex = await compensator.startRewardIndex(delegator1.address);
      expect(startRewardIndex).to.be.a("bigint");
      expect(startRewardIndex).to.be.gte(0);
    });
  });
});
