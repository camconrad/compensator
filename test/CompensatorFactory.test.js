// SPDX-License-Identifier: GPL-3.0
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompensatorFactory", function () {
  let factory;
  let owner, delegate;
  let compToken, compoundGovernor;

  beforeEach(async function () {
    [owner, delegate] = await ethers.getSigners();
    
    // Deploy mock contracts for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    compToken = await MockToken.deploy("COMP", "COMP");
    await compToken.waitForDeployment();
    compTokenAddress = await compToken.getAddress();
    
    // Mint initial supply to ensure totalSupply > 0 for Compensator constructor
    await compToken.mint(delegate.address, ethers.parseEther("1000000")); // 1M COMP initial supply
    
    const MockGovernor = await ethers.getContractFactory("MockGovernor");
    compoundGovernor = await MockGovernor.deploy();
    await compoundGovernor.waitForDeployment();
    compoundGovernorAddress = await compoundGovernor.getAddress();
    
    const CompensatorFactory = await ethers.getContractFactory("CompensatorFactory");
    factory = await CompensatorFactory.deploy(
      await compToken.getAddress(),
      await compoundGovernor.getAddress()
    );
    await factory.waitForDeployment();
  });

  it("should return empty array when no compensators exist", async function () {
    const compensators = await factory.getCompensators(0, 10);
    expect(compensators.length).to.equal(0);
  });

  it("should return zero address for non-existent owner", async function () {
    const address = await factory.ownerToCompensator(delegate.address);
    expect(address).to.equal(ethers.ZeroAddress);
  });

  it("should create a new compensator", async function () {
    const ownerAddress = delegate.address;
    const factoryAddress = await factory.getAddress();
    const tx = await factory.createCompensator(ownerAddress);
    const receipt = await tx.wait();
    
    const compensatorAddress = await factory.ownerToCompensator(ownerAddress);
    expect(compensatorAddress).to.not.equal(ethers.ZeroAddress);
    
    const compensators = await factory.getCompensators(0, 10);
    expect(compensators).to.include(compensatorAddress);
    expect(compensators.length).to.equal(1);
    
    await expect(tx)
      .to.emit(factory, "CompensatorCreated")
      .withArgs(ownerAddress, compensatorAddress);
  });

  it("should not allow duplicate compensators for same owner", async function () {
    const ownerAddress = delegate.address;
    await factory.createCompensator(ownerAddress);
    
    await expect(
      factory.createCompensator(ownerAddress)
    ).to.be.revertedWith("Owner already has a Compensator");
  });
  
  it("should initialize the Compensator contract correctly", async function () {
    const ownerAddress = delegate.address;
    await factory.createCompensator(ownerAddress);
    
    const compensatorAddress = await factory.ownerToCompensator(ownerAddress);
    const Compensator = await ethers.getContractFactory("Compensator");
    const compensator = await Compensator.attach(compensatorAddress);
    
    // Check initialization parameters
    expect(await compensator.owner()).to.equal(ownerAddress);
    expect(await compensator.COMP_TOKEN()).to.equal(await compToken.getAddress());
    expect(await compensator.COMPOUND_GOVERNOR()).to.equal(await compoundGovernor.getAddress());
  });

  describe("Pagination", function () {
    let owners;
    const PAGE_SIZE = 2;

    beforeEach(async function () {
      // Create multiple owners for testing pagination
      owners = await ethers.getSigners();
      for (let i = 1; i <= 5; i++) {
        await factory.createCompensator(owners[i].address);
      }
    });

    it("should return correct total count", async function () {
      const count = await factory.getCompensatorsCount();
      expect(count).to.equal(5);
    });

    it("should return first page correctly", async function () {
      const page = await factory.getCompensators(0, PAGE_SIZE);
      expect(page.length).to.equal(PAGE_SIZE);
      expect(page[0]).to.equal(await factory.ownerToCompensator(owners[1].address));
      expect(page[1]).to.equal(await factory.ownerToCompensator(owners[2].address));
    });

    it("should return middle page correctly", async function () {
      const page = await factory.getCompensators(2, PAGE_SIZE);
      expect(page.length).to.equal(PAGE_SIZE);
      expect(page[0]).to.equal(await factory.ownerToCompensator(owners[3].address));
      expect(page[1]).to.equal(await factory.ownerToCompensator(owners[4].address));
    });

    it("should return last page correctly", async function () {
      const page = await factory.getCompensators(4, PAGE_SIZE);
      expect(page.length).to.equal(1);
      expect(page[0]).to.equal(await factory.ownerToCompensator(owners[5].address));
    });

    it("should handle out of bounds offset", async function () {
      const page = await factory.getCompensators(10, PAGE_SIZE);
      expect(page.length).to.equal(0);
    });

    it("should handle empty result set", async function () {
      const emptyFactory = await ethers.deployContract("CompensatorFactory", [
        await compToken.getAddress(),
        await compoundGovernor.getAddress()
      ]);
      const page = await emptyFactory.getCompensators(0, PAGE_SIZE);
      expect(page.length).to.equal(0);
    });
  });
});
