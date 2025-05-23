// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompensatorFactory", function () {
  let factory;
  let owner, delegatee;
  let compToken, compoundGovernor;
  const delegateeName = "Test Delegatee";

  beforeEach(async function () {
    [owner, delegatee] = await ethers.getSigners();
    
    // Deploy mock contracts for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    compToken = await MockToken.deploy("COMP", "COMP");
    await compToken.waitForDeployment();
    
    const MockGovernor = await ethers.getContractFactory("MockGovernor");
    compoundGovernor = await MockGovernor.deploy();
    await compoundGovernor.waitForDeployment();
    
    const CompensatorFactory = await ethers.getContractFactory("CompensatorFactory");
    factory = await CompensatorFactory.deploy(
      await compToken.getAddress(),
      await compoundGovernor.getAddress()
    );
    await factory.waitForDeployment();
  });

  it("should return empty array when no compensators exist", async function () {
    const compensators = await factory.getCompensators();
    expect(compensators.length).to.equal(0);
  });

  it("should return zero address for non-existent delegatee", async function () {
    const address = await factory.getCompensator(delegatee.address);
    expect(address).to.equal(ethers.ZeroAddress);
  });

  it("should create a new compensator", async function () {
    const delegateeAddress = delegatee.address;
    const factoryAddress = await factory.getAddress(); // Get factory address
    const tx = await factory.createCompensator(delegateeAddress, delegateeName);
    const receipt = await tx.wait();
    
    const compensatorAddress = await factory.getCompensator(delegateeAddress);
    expect(compensatorAddress).to.not.equal(ethers.ZeroAddress);
    
    const compensators = await factory.getCompensators();
    expect(compensators).to.include(compensatorAddress);
    expect(compensators.length).to.equal(1);
    
    await expect(tx)
      .to.emit(factory, "CompensatorCreated")
      .withArgs(delegateeAddress, compensatorAddress);
  });

  it("should not allow duplicate compensators for same delegatee", async function () {
    const delegateeAddress = delegatee.address;
    await factory.createCompensator(delegateeAddress, delegateeName);
    
    await expect(
      factory.createCompensator(delegateeAddress, delegateeName)
    ).to.be.revertedWith("Delegatee already has a Compensator");
  });
  
  it("should initialize the Compensator contract correctly", async function () {
    const delegateeAddress = delegatee.address;
    await factory.createCompensator(delegateeAddress, delegateeName);
    
    const compensatorAddress = await factory.getCompensator(delegateeAddress);
    const Compensator = await ethers.getContractFactory("Compensator");
    const compensator = await Compensator.attach(compensatorAddress);
    
    // Check initialization parameters
    expect(await compensator.delegate()).to.equal(delegateeAddress);
    expect(await compensator.delegateName()).to.equal(delegateeName);
    expect(await compensator.compToken()).to.equal(await compToken.getAddress());
    expect(await compensator.compoundGovernor()).to.equal(await compoundGovernor.getAddress());
  });
  
  it("should allow creating multiple compensators for different delegatees", async function () {
    const [_, delegatee1, delegatee2, delegatee3] = await ethers.getSigners();
    
    // Create compensators for different delegatees
    await factory.createCompensator(delegatee1.address, "Delegatee 1");
    await factory.createCompensator(delegatee2.address, "Delegatee 2");
    await factory.createCompensator(delegatee3.address, "Delegatee 3");
    
    // Check all compensators exist
    const compensators = await factory.getCompensators();
    expect(compensators.length).to.equal(3);
    
    // Check individual mappings
    expect(await factory.getCompensator(delegatee1.address)).to.not.equal(ethers.ZeroAddress);
    expect(await factory.getCompensator(delegatee2.address)).to.not.equal(ethers.ZeroAddress);
    expect(await factory.getCompensator(delegatee3.address)).to.not.equal(ethers.ZeroAddress);
    
    // Check all addresses are different
    expect(await factory.getCompensator(delegatee1.address)).to.not.equal(await factory.getCompensator(delegatee2.address));
    expect(await factory.getCompensator(delegatee1.address)).to.not.equal(await factory.getCompensator(delegatee3.address));
    expect(await factory.getCompensator(delegatee2.address)).to.not.equal(await factory.getCompensator(delegatee3.address));
  });

  describe("Pagination", function () {
    let delegatees;
    const PAGE_SIZE = 2;

    beforeEach(async function () {
      // Create multiple delegatees for testing pagination
      delegatees = await ethers.getSigners();
      for (let i = 1; i <= 5; i++) {
        await factory.createCompensator(delegatees[i].address, `Delegatee ${i}`);
      }
    });

    it("should return correct total count", async function () {
      const count = await factory.getCompensatorsCount();
      expect(count).to.equal(5);
    });

    it("should return first page correctly", async function () {
      const page = await factory.getCompensators(0, PAGE_SIZE);
      expect(page.length).to.equal(PAGE_SIZE);
      expect(page[0]).to.equal(await factory.getCompensator(delegatees[1].address));
      expect(page[1]).to.equal(await factory.getCompensator(delegatees[2].address));
    });

    it("should return middle page correctly", async function () {
      const page = await factory.getCompensators(2, PAGE_SIZE);
      expect(page.length).to.equal(PAGE_SIZE);
      expect(page[0]).to.equal(await factory.getCompensator(delegatees[3].address));
      expect(page[1]).to.equal(await factory.getCompensator(delegatees[4].address));
    });

    it("should return last page correctly", async function () {
      const page = await factory.getCompensators(4, PAGE_SIZE);
      expect(page.length).to.equal(1);
      expect(page[0]).to.equal(await factory.getCompensator(delegatees[5].address));
    });

    it("should handle out of bounds offset", async function () {
      await expect(
        factory.getCompensators(10, PAGE_SIZE)
      ).to.be.revertedWith("Offset out of bounds");
    });

    it("should handle empty result set", async function () {
      const emptyFactory = await ethers.deployContract("CompensatorFactory");
      const page = await emptyFactory.getCompensators(0, PAGE_SIZE);
      expect(page.length).to.equal(0);
    });

    it("should handle limit larger than remaining items", async function () {
      const page = await factory.getCompensators(3, PAGE_SIZE * 2);
      expect(page.length).to.equal(2); // Should only return remaining items
      expect(page[0]).to.equal(await factory.getCompensator(delegatees[4].address));
      expect(page[1]).to.equal(await factory.getCompensator(delegatees[5].address));
    });
  });
});
