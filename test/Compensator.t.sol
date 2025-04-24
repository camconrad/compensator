// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import "../contracts/IComp.sol";
import "../contracts/IGovernorBravo.sol";

describe("Compensator", function () {
  let compToken: Contract;
  let governorBravo: Contract;
  let compensator: Contract;
  let delegate: Signer, delegator1: Signer, delegator2: Signer, delegator3: Signer;
  
  const COMP_TOKEN_ADDRESS = "0xc00e94Cb662C3520282E6f5717214004A7f26888";
  const GOVERNOR_BRAVO_ADDRESS = "0x309a862bbC1A00e45506cB8A802D1ff10004c8C0";

  before(async function () {
    [delegate, delegator1, delegator2, delegator3] = await ethers.getSigners();
    
    compToken = await ethers.getContractAt("IComp", COMP_TOKEN_ADDRESS);
    governorBravo = await ethers.getContractAt("IGovernorBravo", GOVERNOR_BRAVO_ADDRESS);
    
    const Compensator = await ethers.getContractFactory("Compensator");
    compensator = await Compensator.deploy();
    
    await compensator.initialize(await delegate.getAddress(), "Test Delegate");
  });

  describe("Views", function () {
    beforeEach(async function () {
      await compToken.connect(delegate).approve(compensator.target, ethers.parseEther("100"));
      await compensator.connect(delegate).delegateDeposit(ethers.parseEther("100"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("1"));
    });

    it("should calculate rewardsUntil correctly", async function () {
      expect(await compensator.rewardsUntil()).to.equal(
        (await ethers.provider.getBlock("latest"))!.timestamp + 100
      );
    });

    it("should calculate pending rewards correctly", async function () {
      await compToken.connect(delegator1).approve(compensator.target, ethers.parseEther("100"));
      await compensator.connect(delegator1).delegatorDeposit(ethers.parseEther("100"));
      
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine", []);
      
      expect(await compensator.getPendingRewards(await delegator1.getAddress()))
        .to.equal(ethers.parseEther("10"));
    });
  });

  describe("Delegate Functions", function () {
    it("should allow setting reward rate", async function () {
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("100"));
      expect(await compensator.rewardRate()).to.equal(ethers.parseEther("100"));
    });

    it("should handle delegate deposits", async function () {
      await expect(
        compensator.connect(delegate).delegateDeposit(ethers.parseEther("100"))
        .to.changeTokenBalances(
          compToken,
          [delegate, compensator],
          [ethers.parseEther("-100"), ethers.parseEther("100")]
        );
    });

    it("should revert when withdrawing too much", async function () {
      await expect(
        compensator.connect(delegate).delegateWithdraw(ethers.parseEther("101"))
        .to.be.revertedWith("Amount exceeds available rewards");
    });
  });

  describe("Delegator Functions", function () {
    beforeEach(async function () {
      await compToken.connect(delegate).approve(compensator.target, ethers.parseEther("1000"));
      await compensator.connect(delegate).delegateDeposit(ethers.parseEther("1000"));
      await compensator.connect(delegate).setRewardRate(ethers.parseEther("1"));
    });

    it("should handle delegator deposits", async function () {
      await expect(
        compensator.connect(delegator1).delegatorDeposit(ethers.parseEther("100"))
      ).to.changeTokenBalances(
        compToken,
        [delegator1, compensator],
        [ethers.parseEther("-100"), ethers.parseEther("100")]
      );
    });

    it("should distribute rewards correctly", async function () {
      await compToken.connect(delegator1).approve(compensator.target, ethers.parseEther("100"));
      await compensator.connect(delegator1).delegatorDeposit(ethers.parseEther("100"));
      
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);
      
      await expect(
        compensator.connect(delegator1).claimRewards()
      ).to.changeTokenBalance(
        compToken,
        delegator1,
        ethers.parseEther("100").div(365)
      );
    });
  });

  describe("Staking Functions", function () {
    it("should handle proposal staking", async function () {
      const proposalId = 1;
      await compToken.connect(delegator1).approve(compensator.target, ethers.parseEther("50"));
      
      await expect(
        compensator.connect(delegator1).stakeForProposal(proposalId, 1, ethers.parseEther("50"))
      ).to.emit(compensator, "ProposalStaked");
    });
  });
});
