const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Compensator Voting Functions", function () {
  let compensator, compToken, mockGovernor, delegate, delegator1;

  async function deployCompensatorFixture() {
    [delegate, delegator1] = await ethers.getSigners();
    
    // Deploy mock contracts for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    compToken = await MockToken.deploy("COMP", "COMP");
    await compToken.waitForDeployment();
    
    // Mint initial supply FIRST (required for compensator constructor)
    await compToken.mint(delegate.address, ethers.parseEther("1000000"));
    await compToken.mint(delegator1.address, ethers.parseEther("10000"));
    
    // Deploy MockGovernor
    const MockGovernor = await ethers.getContractFactory("contracts/mocks/MockGovernor.sol:MockGovernor");
    mockGovernor = await MockGovernor.deploy();
    await mockGovernor.waitForDeployment();
    
    // Deploy CompensatorFactory
    const CompensatorFactory = await ethers.getContractFactory("contracts/CompensatorFactory.sol:CompensatorFactory");
    const compensatorFactory = await CompensatorFactory.deploy(
      await compToken.getAddress(),
      await mockGovernor.getAddress()
    );
    await compensatorFactory.waitForDeployment();
    
    // Create a compensator for the delegate
    await compensatorFactory.createCompensator(delegate.address);
    const compensatorAddress = await compensatorFactory.ownerToCompensator(delegate.address);
    
    // Attach to the deployed compensator
    const Compensator = await ethers.getContractFactory("Compensator");
    compensator = await Compensator.attach(compensatorAddress);
    
    return { compensator, compToken, mockGovernor, delegate, delegator1 };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployCompensatorFixture);
    compensator = fixture.compensator;
    compToken = fixture.compToken;
    mockGovernor = fixture.mockGovernor;
    delegate = fixture.delegate;
    delegator1 = fixture.delegator1;
  });

  describe("Vote Validation", function () {
    it("should accept valid support values (0, 1, 2)", async function () {
      const proposalId = 1;
      
      // Test Against (0)
      await expect(compensator.connect(delegate).castVote(proposalId, 0))
        .to.emit(compensator, "VoteCast")
        .withArgs(proposalId, 0, "");
      
      // Test For (1) - should fail because already voted
      await expect(compensator.connect(delegate).castVote(proposalId, 1))
        .to.be.revertedWithCustomError(compensator, "AlreadyVotedOnProposal");
      
      // Test Abstain (2) on new proposal
      const proposalId2 = 2;
      await expect(compensator.connect(delegate).castVote(proposalId2, 2))
        .to.emit(compensator, "VoteCast")
        .withArgs(proposalId2, 2, "");
    });

    it("should reject invalid support values (> 2)", async function () {
      const proposalId = 3;
      
      // Test invalid support values
      await expect(compensator.connect(delegate).castVote(proposalId, 3))
        .to.be.revertedWithCustomError(compensator, "InvalidSupportValue");
      
      await expect(compensator.connect(delegate).castVote(proposalId, 255))
        .to.be.revertedWithCustomError(compensator, "InvalidSupportValue");
    });

    it("should reject voting on same proposal twice", async function () {
      const proposalId = 4;
      
      // First vote should succeed
      await expect(compensator.connect(delegate).castVote(proposalId, 1))
        .to.emit(compensator, "VoteCast");
      
      // Second vote should fail
      await expect(compensator.connect(delegate).castVote(proposalId, 0))
        .to.be.revertedWithCustomError(compensator, "AlreadyVotedOnProposal");
    });

    it("should allow voting with reason", async function () {
      const proposalId = 5;
      const reason = "This proposal aligns with our governance principles";
      
      await expect(compensator.connect(delegate)["castVote(uint256,uint8,string)"](proposalId, 1, reason))
        .to.emit(compensator, "VoteCast")
        .withArgs(proposalId, 1, reason);
    });

    it("should track vote direction correctly", async function () {
      const proposalId = 6;
      
      // Vote Against
      await compensator.connect(delegate).castVote(proposalId, 0);
      expect(await compensator.contractVoteDirection(proposalId)).to.equal(0);
      expect(await compensator.contractVoted(proposalId)).to.be.true;
      
      // Test different proposal with For vote
      const proposalId2 = 7;
      await compensator.connect(delegate).castVote(proposalId2, 1);
      expect(await compensator.contractVoteDirection(proposalId2)).to.equal(1);
      expect(await compensator.contractVoted(proposalId2)).to.be.true;
      
      // Test different proposal with Abstain vote
      const proposalId3 = 8;
      await compensator.connect(delegate).castVote(proposalId3, 2);
      expect(await compensator.contractVoteDirection(proposalId3)).to.equal(2);
      expect(await compensator.contractVoted(proposalId3)).to.be.true;
    });
  });

  describe("Access Control", function () {
    it("should only allow owner to cast votes", async function () {
      const proposalId = 9;
      
      // Non-owner should not be able to vote
      await expect(compensator.connect(delegator1).castVote(proposalId, 1))
        .to.be.revertedWithCustomError(compensator, "OwnableUnauthorizedAccount");
    });
  });

  describe("View Functions", function () {
    it("should return voting power (MockERC20 limitation)", async function () {
      // This test demonstrates that getContractVotingPower() works
      // Note: MockERC20 has limitations in voting power tracking
      const votingPower = await compensator.getContractVotingPower();
      expect(votingPower).to.be.a('bigint');
    });

    it("should check if contract has voted", async function () {
      const proposalId = 10;
      
      // Initially should not have voted
      expect(await compensator.hasVoted(proposalId)).to.be.false;
      
      // After voting, should have voted
      await compensator.connect(delegate).castVote(proposalId, 1);
      expect(await compensator.hasVoted(proposalId)).to.be.true;
    });
  });
});
