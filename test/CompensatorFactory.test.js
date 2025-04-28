// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompensatorFactory", function () {
  let factory;
  let owner, delegatee;
  const delegateeName = "Test Delegatee";

  beforeEach(async function () {
    [owner, delegatee] = await ethers.getSigners();
    
    const CompensatorFactory = await ethers.getContractFactory("CompensatorFactory");
    factory = await CompensatorFactory.deploy();
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
});
