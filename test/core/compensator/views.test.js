const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Compensator Views", function () {
  let compToken;
  let compoundGovernor;
  let compensator;
  let delegate, delegator1, delegator2, delegator3, voteRecorder;
  
  const COMP_TOKEN_ADDRESS = "0xc00e94Cb662C3520282E6f5717214004A7f26888";
  const GOVERNOR_ADDRESS = "0x309a862bbC1A00e45506cB8A802D1ff10004c8C0";

  async function deployCompensatorFixture() {
    [delegate, delegator1, delegator2, delegator3, voteRecorder] = await ethers.getSigners();
    
    // Deploy mock contracts for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    compToken = await MockToken.deploy("COMP", "COMP");
    await compToken.waitForDeployment();
    
    // Mint initial supply to ensure totalSupply > 0 for Compensator constructor
    await compToken.mint(delegate.address, ethers.parseEther("1000000")); // 1M COMP initial supply
    
    const MockGovernor = await ethers.getContractFactory("MockGovernor");
    compoundGovernor = await MockGovernor.deploy();
    await compoundGovernor.waitForDeployment();
    
    // Deploy Compensator contract with mock addresses
    const CompensatorFactory = await ethers.getContractFactory("Compensator");
    compensator = await CompensatorFactory.deploy(
      await compToken.getAddress(),
      await compoundGovernor.getAddress(),
      await delegate.getAddress() // owner address
    );
    await compensator.waitForDeployment();
    
    // Fund additional accounts for testing
    await compToken.mint(delegator1.address, ethers.parseEther("10000"));
    await compToken.mint(delegator2.address, ethers.parseEther("10000"));
    await compToken.mint(delegator3.address, ethers.parseEther("10000"));
    
    return { compensator, compToken, compoundGovernor, delegate, delegator1, delegator2, delegator3, voteRecorder };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployCompensatorFixture);
    compensator = fixture.compensator;
    compToken = fixture.compToken;
    compoundGovernor = fixture.compoundGovernor;
    delegate = fixture.delegate;
    delegator1 = fixture.delegator1;
    delegator2 = fixture.delegator2;
    delegator3 = fixture.delegator3;
    voteRecorder = fixture.voteRecorder;
  });

  describe("Basic Views", function () {
    it("should return correct token and governor addresses", async function () {
      const tokenAddress = await compensator.COMP_TOKEN();
      const governorAddress = await compensator.COMPOUND_GOVERNOR();
      
      expect(tokenAddress).to.equal(await compToken.getAddress());
      expect(governorAddress).to.equal(await compoundGovernor.getAddress());
    });

    it("should calculate pending rewards correctly", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup: Delegate deposits rewards and sets reward rate
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("100"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001"));
      
      // User stakes
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
      // Setup: Delegate deposits rewards and sets reward rate
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

    it("should calculate rewardsUntil correctly", async function () {
      const currentTime = await time.latest();
      const rewardsUntil = await compensator.rewardsUntil();
      
      // Should be greater than current time when reward rate > 0
      expect(rewardsUntil).to.be.gt(currentTime);
    });
  });

  describe("Advanced View Functions", function () {
    beforeEach(async function () {
      // Setup: Delegate deposits rewards and sets reward rate
      const compensatorAddress = await compensator.getAddress();
      await compToken.connect(delegate).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensator.connect(delegate).ownerDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001"));
      
      // Setup users with stakes
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensator.connect(delegator1).userDeposit(ethers.parseEther("100"));
      
      await compToken.connect(delegator2).approve(compensatorAddress, ethers.parseEther("200"));
      await compensator.connect(delegator2).userDeposit(ethers.parseEther("200"));
    });

    describe("getContractVotingPower", function () {
      it("should return correct voting power for the contract", async function () {
        const votingPower = await compensator.getContractVotingPower();
        // This should return the contract's voting power from COMP token
        expect(votingPower).to.be.a("bigint");
      });
    });

    describe("getContractVotingPowerAt", function () {
      it("should return voting power at a specific block", async function () {
        const currentBlock = await ethers.provider.getBlockNumber();
        const votingPower = await compensator.getContractVotingPowerAt(currentBlock);
        expect(votingPower).to.be.a("bigint");
      });
    });

    describe("getVoteInfo", function () {
      it("should return correct vote information structure", async function () {
        const proposalId = 1;
        const voteInfo = await compensator.getVoteInfo(proposalId);
        
        // voteInfo is a tuple: [direction, blockNumber, txHash, timestamp, votingPower, reason]
        expect(voteInfo).to.be.an("array");
        expect(voteInfo).to.have.length(6);
        expect(voteInfo[0]).to.be.a("bigint"); // direction
        expect(voteInfo[1]).to.be.a("bigint"); // blockNumber
        expect(voteInfo[2]).to.be.a("string"); // txHash
        expect(voteInfo[3]).to.be.a("bigint"); // timestamp
        expect(voteInfo[4]).to.be.a("bigint"); // votingPower
        expect(voteInfo[5]).to.be.a("string"); // reason
      });
    });

    describe("getVoteByIndex", function () {
      it("should return correct vote by index structure", async function () {
        // First, cast a vote to create some vote data
        const proposalId = 1;
        const vote = 1; // For
        await compensator.connect(delegate)["castVote(uint256,uint8)"](proposalId, vote);
        
        const voteIndex = 0;
        const voteData = await compensator.getVoteByIndex(voteIndex);
        
        // voteData is a tuple: [direction, blockNumber, txHash, timestamp, votingPower, reason]
        expect(voteData).to.be.an("array");
        expect(voteData).to.have.length(6);
        expect(voteData[0]).to.be.a("bigint"); // direction
        expect(voteData[1]).to.be.a("bigint"); // blockNumber
        expect(voteData[2]).to.be.a("string"); // txHash (bytes32)
        expect(voteData[3]).to.be.a("bigint"); // timestamp
        expect(voteData[4]).to.be.a("bigint"); // votingPower
        expect(voteData[5]).to.be.a("string"); // reason
      });

      it("should revert for invalid index", async function () {
        const invalidIndex = 999;
        
        await expect(
          compensator.getVoteByIndex(invalidIndex)
        ).to.be.revertedWithCustomError(compensator, "VoteIndexOutOfBounds");
      });

      it("should handle proposal with no votes", async function () {
        const voteIndex = 0;
        
        // This should revert with VoteIndexOutOfBounds if no votes exist
        await expect(
          compensator.getVoteByIndex(voteIndex)
        ).to.be.revertedWithCustomError(compensator, "VoteIndexOutOfBounds");
      });
    });

    describe("getProposalStake", function () {
      it("should return correct proposal stake structure", async function () {
        const proposalId = 1;
        const user = delegator1.address;
        const stake = await compensator.getProposalStake(proposalId, user);
        
        // stake is a tuple: [forStake, againstStake]
        expect(stake).to.be.an("array");
        expect(stake).to.have.length(2);
        expect(stake[0]).to.be.a("bigint"); // forStake
        expect(stake[1]).to.be.a("bigint"); // againstStake
      });

      it("should return zero stakes for user with no stake", async function () {
        const proposalId = 1;
        const user = delegator2.address; // User with no stake
        const stake = await compensator.getProposalStake(proposalId, user);
        
        expect(stake[0]).to.equal(0n); // forStake
        expect(stake[1]).to.equal(0n); // againstStake
      });

      it("should handle non-existent proposal", async function () {
        const proposalId = 999;
        const user = delegator1.address;
        const stake = await compensator.getProposalStake(proposalId, user);
        
        expect(stake[0]).to.equal(0n); // forStake
        expect(stake[1]).to.equal(0n); // againstStake
      });
    });

    // ERC20 Transfer Override Tests (for coverage)
    describe("ERC20 Transfer Overrides", function () {
      it("should revert transfer function", async function () {
        const to = delegator1.address;
        const amount = ethers.parseEther("100");
        
        await expect(
          compensator.transfer(to, amount)
        ).to.be.revertedWithCustomError(compensator, "CompensatorTokensNotTransferable");
      });

      it("should revert transferFrom function", async function () {
        const from = delegate.address;
        const to = delegator1.address;
        const amount = ethers.parseEther("100");
        
        await expect(
          compensator.transferFrom(from, to, amount)
        ).to.be.revertedWithCustomError(compensator, "CompensatorTokensNotTransferable");
      });

      it("should revert approve function", async function () {
        const spender = delegator1.address;
        const amount = ethers.parseEther("100");
        
        await expect(
          compensator.approve(spender, amount)
        ).to.be.revertedWithCustomError(compensator, "CompensatorTokensNotTransferable");
      });

      it("should revert transfer with zero amount", async function () {
        const to = delegator1.address;
        const amount = 0;
        
        await expect(
          compensator.transfer(to, amount)
        ).to.be.revertedWithCustomError(compensator, "CompensatorTokensNotTransferable");
      });

      it("should revert transferFrom with zero amount", async function () {
        const from = delegate.address;
        const to = delegator1.address;
        const amount = 0;
        
        await expect(
          compensator.transferFrom(from, to, amount)
        ).to.be.revertedWithCustomError(compensator, "CompensatorTokensNotTransferable");
      });

      it("should revert approve with zero amount", async function () {
        const spender = delegator1.address;
        const amount = 0;
        
        await expect(
          compensator.approve(spender, amount)
        ).to.be.revertedWithCustomError(compensator, "CompensatorTokensNotTransferable");
      });
    });

    // Constructor validation tests
    describe("Constructor Validation", function () {
      it("should validate COMP token address", async function () {
        // This test covers the constructor validation logic
        // The contract should have been deployed with valid addresses
        const compAddress = await compensator.COMP_TOKEN();
        expect(compAddress).to.not.equal(ethers.ZeroAddress);
      });

      it("should validate Governor address", async function () {
        const governorAddress = await compensator.COMPOUND_GOVERNOR();
        expect(governorAddress).to.not.equal(ethers.ZeroAddress);
      });

      it("should validate owner address", async function () {
        const ownerAddress = await compensator.owner();
        expect(ownerAddress).to.not.equal(ethers.ZeroAddress);
      });
    });
  });
});
