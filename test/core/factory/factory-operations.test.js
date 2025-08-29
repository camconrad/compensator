const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("CompensatorFactory Operations", function () {
  let compensatorFactory;
  let compToken;
  let owner, user1, user2;

  async function deployFactoryFixture() {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy mock contracts for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    compToken = await MockToken.deploy("COMP", "COMP");
    await compToken.waitForDeployment();
    
    // Mint initial supply to ensure totalSupply > 0 for Compensator constructor
    await compToken.mint(owner.address, ethers.parseEther("1000000")); // 1M COMP initial supply
    
    // Deploy factory
    const CompensatorFactory = await ethers.getContractFactory("contracts/CompensatorFactory.sol:CompensatorFactory");
    compensatorFactory = await CompensatorFactory.deploy(
      await compToken.getAddress()
    );
    await compensatorFactory.waitForDeployment();
    
    return { compensatorFactory, compToken, owner, user1, user2 };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployFactoryFixture);
    compensatorFactory = fixture.compensatorFactory;
    compToken = fixture.compToken;
    owner = fixture.owner;
    user1 = fixture.user1;
    user2 = fixture.user2;
  });

  describe("Basic Factory Operations", function () {
    it("should return empty array when no compensators exist", async function () {
      const compensators = await compensatorFactory.getCompensators(0, 10);
      expect(compensators).to.be.an('array').that.is.empty;
    });

    it("should return zero address for non-existent owner", async function () {
      const hasCompensator = await compensatorFactory.hasCompensator(user1.address);
      expect(hasCompensator).to.be.false;
    });

    it("should create a new compensator", async function () {
      const tx = await compensatorFactory.createCompensator(user1.address);
      const receipt = await tx.wait();
      
      // Check that event was emitted
      expect(receipt.logs).to.have.length.greaterThan(0);
      
      // Verify compensator was created
      const hasCompensator = await compensatorFactory.hasCompensator(user1.address);
      expect(hasCompensator).to.be.true;
    });

    it("should not allow duplicate compensators for same owner", async function () {
      // Create first compensator
      await compensatorFactory.createCompensator(user1.address);
      
      // Try to create second compensator for same owner
      await expect(
        compensatorFactory.createCompensator(user1.address)
      ).to.be.revertedWithCustomError(compensatorFactory, "OwnerAlreadyHasCompensator");
    });

    it("should initialize the Compensator contract correctly", async function () {
      await compensatorFactory.createCompensator(user1.address);
      
      // Get the compensator address from the event
      const filter = compensatorFactory.filters.CompensatorCreated(user1.address);
      const events = await compensatorFactory.queryFilter(filter);
      expect(events).to.have.length(1);
      
      const compensatorAddress = events[0].args.compensator;
      
      // Get the deployed compensator contract
      const Compensator = await ethers.getContractFactory("Compensator");
      const compensator = Compensator.attach(compensatorAddress);
      
      // Verify initialization
      const tokenAddress = await compensator.COMP_TOKEN();
      const ownerAddress = await compensator.owner();
      
      expect(tokenAddress).to.equal(await compToken.getAddress());
      expect(ownerAddress).to.equal(user1.address);
    });
  });

  describe("Pagination", function () {
    beforeEach(async function () {
      // Create multiple compensators
      await compensatorFactory.createCompensator(user1.address);
      await compensatorFactory.createCompensator(user2.address);
      await compensatorFactory.createCompensator(owner.address);
    });

    it("should return correct total count", async function () {
      const totalCount = await compensatorFactory.getCompensatorsCount();
      expect(totalCount).to.equal(3);
    });

    it("should return first page correctly", async function () {
      const compensators = await compensatorFactory.getCompensators(0, 2);
      expect(compensators).to.have.length(2);
    });

    it("should return middle page correctly", async function () {
      const compensators = await compensatorFactory.getCompensators(1, 2);
      expect(compensators).to.have.length(2);
    });

    it("should return last page correctly", async function () {
      const compensators = await compensatorFactory.getCompensators(2, 2);
      expect(compensators).to.have.length(1);
    });

    it("should handle out of bounds offset", async function () {
      const compensators = await compensatorFactory.getCompensators(10, 2);
      expect(compensators).to.have.length(0);
    });

    it("should handle empty result set", async function () {
      const compensators = await compensatorFactory.getCompensators(5, 2);
      expect(compensators).to.have.length(0);
    });
  });

  describe("Access Control", function () {
    it("should reject invalid owner addresses", async function () {
      const invalidAddress = ethers.ZeroAddress;
      
      await expect(
        compensatorFactory.createCompensator(invalidAddress)
      ).to.be.revertedWithCustomError(compensatorFactory, "InvalidOwnerAddress");
    });
  });
});
