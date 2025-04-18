// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";

describe("CompensatorFactory", function () {
  let factory: Contract;
  let owner: Signer;
  let delegatee: Signer;
  const delegateeName = "Test Delegatee";

  before(async function () {
    [owner, delegatee] = await ethers.getSigners();
    
    const CompensatorFactory = await ethers.getContractFactory("CompensatorFactory");
    factory = await CompensatorFactory.deploy();
  });

  it("should create a new compensator", async function () {
    const delegateeAddress = await delegatee.getAddress();
    const tx = await factory.createCompensator(delegateeAddress, delegateeName);
    const receipt = await tx.wait();
    
    // Get the created compensator address
    const compensatorAddress = await factory.getCompensator(delegateeAddress);
    expect(compensatorAddress).to.not.equal(ethers.ZeroAddress);
    
    // Check it's in the getCompensators array
    const compensators = await factory.getCompensators();
    expect(compensators).to.include(compensatorAddress);
    expect(compensators.length).to.equal(1);
    
    // Verify the event was emitted
    await expect(tx)
      .to.emit(factory, "CompensatorCreated")
      .withArgs(delegateeAddress, compensatorAddress);
  });

  it("should return empty array when no compensators exist", async function () {
    const compensators = await factory.getCompensators();
    expect(compensators.length).to.equal(0);
  });

  it("should return zero address for non-existent delegatee", async function () {
    const address = await factory.getCompensator(await delegatee.getAddress());
    expect(address).to.equal(ethers.ZeroAddress);
  });

  it("should not allow duplicate compensators for same delegatee", async function () {
    const delegateeAddress = await delegatee.getAddress();
    await factory.createCompensator(delegateeAddress, delegateeName);
    
    await expect(
      factory.createCompensator(delegateeAddress, delegateeName)
    ).to.be.revertedWith("Compensator already exists for this delegatee");
  });
});
