// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompensatorFactory", function () {
  let factory;
  let owner, delegate, voteRecorder;
  let compToken, compoundGovernor;
  const delegateName = "Test Delegate";

  beforeEach(async function () {
    [owner, delegate, voteRecorder] = await ethers.getSigners();
    
    // Deploy mock contracts for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    compToken = await MockToken.deploy("COMP", "COMP");
    await compToken.waitForDeployment();
    compTokenAddress = await compToken.getAddress();
    
    const MockGovernor = await ethers.getContractFactory("MockGovernor");
    compoundGovernor = await MockGovernor.deploy();
    await compoundGovernor.waitForDeployment();
    compoundGovernorAddress = await compoundGovernor.getAddress();
    
    const CompensatorFactory = await ethers.getContractFactory("CompensatorFactory");
    factory = await CompensatorFactory.deploy(
      await compToken.getAddress(),
      await compoundGovernor.getAddress(),
      await voteRecorder.getAddress()
    );
    await factory.waitForDeployment();
  });

  it("should return empty array when no compensators exist", async function () {
    const compensators = await factory.getCompensators(0, 10);
    expect(compensators.length).to.equal(0);
  });

  it("should return zero address for non-existent delegate", async function () {
    const address = await factory.delegateToCompensator(delegate.address);
    expect(address).to.equal(ethers.ZeroAddress);
  });

  it("should create a new compensator", async function () {
    const delegateAddress = delegate.address;
    const factoryAddress = await factory.getAddress();
    const tx = await factory.createCompensator(delegateAddress, delegateName);
    const receipt = await tx.wait();
    
    const compensatorAddress = await factory.delegateToCompensator(delegateAddress);
    expect(compensatorAddress).to.not.equal(ethers.ZeroAddress);
    
    const compensators = await factory.getCompensators(0, 10);
    expect(compensators).to.include(compensatorAddress);
    expect(compensators.length).to.equal(1);
    
    await expect(tx)
      .to.emit(factory, "CompensatorCreated")
      .withArgs(delegateAddress, compensatorAddress, delegateName);
  });

  it("should not allow duplicate compensators for same delegate", async function () {
    const delegateAddress = delegate.address;
    await factory.createCompensator(delegateAddress, delegateName);
    
    await expect(
      factory.createCompensator(delegateAddress, delegateName)
    ).to.be.revertedWith("Delegate already has a Compensator");
  });
  
  it("should initialize the Compensator contract correctly", async function () {
    const delegateAddress = delegate.address;
    await factory.createCompensator(delegateAddress, delegateName);
    
    const compensatorAddress = await factory.delegateToCompensator(delegateAddress);
    const Compensator = await ethers.getContractFactory("Compensator");
    const compensator = await Compensator.attach(compensatorAddress);
    
    // Check initialization parameters
    expect(await compensator.delegate()).to.equal(delegateAddress);
    expect(await compensator.delegateName()).to.equal(delegateName);
    expect(await compensator.COMP_TOKEN()).to.equal(await compToken.getAddress());
    expect(await compensator.COMPOUND_GOVERNOR()).to.equal(await compoundGovernor.getAddress());
    expect(await compensator.VOTE_RECORDER()).to.equal(await voteRecorder.getAddress());
  });

  describe("Pagination", function () {
    let delegates;
    const PAGE_SIZE = 2;

    beforeEach(async function () {
      // Create multiple delegates for testing pagination
      delegates = await ethers.getSigners();
      for (let i = 1; i <= 5; i++) {
        await factory.createCompensator(delegates[i].address, `Delegate ${i}`);
      }
    });

    it("should return correct total count", async function () {
      const count = await factory.getCompensatorsCount();
      expect(count).to.equal(5);
    });

    it("should return first page correctly", async function () {
      const page = await factory.getCompensators(0, PAGE_SIZE);
      expect(page.length).to.equal(PAGE_SIZE);
      expect(page[0]).to.equal(await factory.delegateToCompensator(delegates[1].address));
      expect(page[1]).to.equal(await factory.delegateToCompensator(delegates[2].address));
    });

    it("should return middle page correctly", async function () {
      const page = await factory.getCompensators(2, PAGE_SIZE);
      expect(page.length).to.equal(PAGE_SIZE);
      expect(page[0]).to.equal(await factory.delegateToCompensator(delegates[3].address));
      expect(page[1]).to.equal(await factory.delegateToCompensator(delegates[4].address));
    });

    it("should return last page correctly", async function () {
      const page = await factory.getCompensators(4, PAGE_SIZE);
      expect(page.length).to.equal(1);
      expect(page[0]).to.equal(await factory.delegateToCompensator(delegates[5].address));
    });

    it("should handle out of bounds offset", async function () {
      await expect(
        factory.getCompensators(10, PAGE_SIZE)
      ).to.be.revertedWith("Offset out of bounds");
    });

    it("should handle empty result set", async function () {
      const emptyFactory = await ethers.deployContract("CompensatorFactory", [
        await compToken.getAddress(),
        await compoundGovernor.getAddress(),
        await voteRecorder.getAddress()
      ]);
      const page = await emptyFactory.getCompensators(0, PAGE_SIZE);
      expect(page.length).to.equal(0);
    });
  });
});
