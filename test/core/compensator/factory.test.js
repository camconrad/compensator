const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompensatorFactory Operations", function () {
  let factory, compToken, delegate;

  beforeEach(async function () {
    [delegate] = await ethers.getSigners();
    
    // Deploy mock contracts
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    compToken = await MockERC20.deploy("Mock COMP", "COMP");
    
    // Deploy MockGovernor
    const MockGovernor = await ethers.getContractFactory("contracts/mocks/MockGovernor.sol:MockGovernor");
    const mockGovernor = await MockGovernor.deploy();
    await mockGovernor.waitForDeployment();
    
    // Deploy factory
    const CompensatorFactory = await ethers.getContractFactory("contracts/CompensatorFactory.sol:CompensatorFactory");
    factory = await CompensatorFactory.deploy(
      await compToken.getAddress(),
      await mockGovernor.getAddress()
    );
    
    // Mint some COMP tokens for the delegate
    await compToken.mint(delegate.address, ethers.parseEther("1000000"));
  });

  describe("Basic Factory Operations", function () {
    it("should return empty array when no compensators exist", async function () {
      const compensators = await factory.getCompensators(0, 10);
      expect(compensators).to.deep.equal([]);
    });

    it("should return false for non-existent owner", async function () {
      const [user] = await ethers.getSigners();
      const hasComp = await factory.hasCompensator(user.address);
      expect(hasComp).to.be.false;
    });

    it("should create a new compensator", async function () {
      const [user] = await ethers.getSigners();
      
      const tx = await factory.createCompensator(user.address);
      const receipt = await tx.wait();
      
      // Get the compensator address from the event
      const event = receipt.logs.find(log => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed.name === "CompensatorCreated";
        } catch {
          return false;
        }
      });
      
      const compensatorAddress = event ? factory.interface.parseLog(event).args.compensator : null;
      
      expect(compensatorAddress).to.not.equal(ethers.ZeroAddress);
      expect(await factory.hasCompensator(user.address)).to.be.true;
    });

    it("should not allow duplicate compensators for same owner", async function () {
      const [user] = await ethers.getSigners();
      
      await factory.createCompensator(user.address);
      
      await expect(
        factory.createCompensator(user.address)
      ).to.be.revertedWithCustomError(factory, "OwnerAlreadyHasCompensator");
    });

    it("should initialize the Compensator contract correctly", async function () {
      const [user] = await ethers.getSigners();
      
      const tx = await factory.createCompensator(user.address);
      const receipt = await tx.wait();
      
      // Get the compensator address from the event
      const event = receipt.logs.find(log => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed.name === "CompensatorCreated";
        } catch {
          return false;
        }
      });
      
      const compensatorAddress = event ? factory.interface.parseLog(event).args.compensator : null;
      const compensator = await ethers.getContractAt("Compensator", compensatorAddress);
      
      expect(await compensator.owner()).to.equal(user.address);
      expect(await compensator.COMP_TOKEN()).to.equal(await compToken.getAddress());
    });
  });

  describe("Pagination", function () {
    beforeEach(async function () {
      // Create multiple compensators
      const [user1, user2, user3, user4, user5] = await ethers.getSigners();
      await factory.createCompensator(user1.address);
      await factory.createCompensator(user2.address);
      await factory.createCompensator(user3.address);
      await factory.createCompensator(user4.address);
      await factory.createCompensator(user5.address);
    });

    it("should return correct number of compensators", async function () {
      const compensators = await factory.getCompensators(0, 10);
      expect(compensators).to.have.length(5);
    });

    it("should handle pagination correctly", async function () {
      const firstPage = await factory.getCompensators(0, 3);
      const secondPage = await factory.getCompensators(3, 3);
      
      expect(firstPage).to.have.length(3);
      expect(secondPage).to.have.length(2);
    });

    it("should handle empty pagination ranges", async function () {
      const emptyPage = await factory.getCompensators(10, 5);
      expect(emptyPage).to.deep.equal([]);
    });
  });

  describe("Compensator Management", function () {
    it("should track compensator addresses correctly", async function () {
      const [user] = await ethers.getSigners();
      
      await factory.createCompensator(user.address);
      
      const hasComp = await factory.hasCompensator(user.address);
      expect(hasComp).to.be.true;
    });

          it("should return correct compensator address", async function () {
        const [user] = await ethers.getSigners();
        
        await factory.createCompensator(user.address);
        
        const compensatorAddress = await factory.ownerToCompensator(user.address);
        expect(compensatorAddress).to.not.equal(ethers.ZeroAddress);
      });

      it("should return zero address for non-existent owner", async function () {
        const [user] = await ethers.getSigners();
        
        const compensatorAddress = await factory.ownerToCompensator(user.address);
        expect(compensatorAddress).to.equal(ethers.ZeroAddress);
      });
  });

  describe("Access Control", function () {
    it("should allow anyone to create compensators", async function () {
      const [user1, user2] = await ethers.getSigners();
      
      // User1 creates compensator for User2
      await factory.connect(user1).createCompensator(user2.address);
      
      expect(await factory.hasCompensator(user2.address)).to.be.true;
    });

          it("should allow factory to transfer ownership", async function () {
        const [user1, user2] = await ethers.getSigners();
        
        // Create compensator for User1
        await factory.createCompensator(user1.address);
        const compensatorAddress = await factory.ownerToCompensator(user1.address);
        const compensator = await ethers.getContractAt("Compensator", compensatorAddress);
        
        // Transfer ownership to User2
        await compensator.connect(user1).transferOwnership(user2.address);
        
        expect(await compensator.owner()).to.equal(user2.address);
      });
  });

  describe("Events", function () {
          it("should emit CompensatorCreated event", async function () {
        const [user] = await ethers.getSigners();
        
        const tx = await factory.createCompensator(user.address);
        const receipt = await tx.wait();
        
        // Get the compensator address from the event
        const filter = factory.filters.CompensatorCreated(user.address);
        const events = await factory.queryFilter(filter);
        expect(events).to.have.length(1);
        
        const compensatorAddress = events[0].args.compensator;
        expect(compensatorAddress).to.not.equal(ethers.ZeroAddress);
      });
  });

  describe("Edge Cases", function () {
    it("should handle zero address owner", async function () {
      await expect(
        factory.createCompensator(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "InvalidOwnerAddress");
    });

    it("should handle factory deployment with invalid COMP token", async function () {
      const CompensatorFactory = await ethers.getContractFactory("contracts/CompensatorFactory.sol:CompensatorFactory");
      
      await expect(
        CompensatorFactory.deploy(ethers.ZeroAddress, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(CompensatorFactory, "InvalidCompTokenAddress");
    });
  });
});



