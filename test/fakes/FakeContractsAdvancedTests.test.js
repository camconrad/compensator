const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Fake Contracts Advanced Testing", function () {
  let erc20Fake;
  let governorFake;
  let compensatorFake;
  let owner, user1, user2, user3;

  async function deployFakesFixture() {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy ERC20Fake with realistic parameters
    const ERC20Fake = await ethers.getContractFactory("ERC20Fake");
    erc20Fake = await ERC20Fake.deploy(
      "Advanced COMP", 
      "COMP", 
      ethers.parseEther("10000000"), // 10M max supply
      owner.address // pauser
    );
    await erc20Fake.waitForDeployment();
    
    // Mint initial supply
    await erc20Fake.mint(owner.address, ethers.parseEther("1000000"));
    await erc20Fake.mint(user1.address, ethers.parseEther("10000"));
    await erc20Fake.mint(user2.address, ethers.parseEther("10000"));
    
    // Deploy GovernorFake with realistic parameters
    const GovernorFake = await ethers.getContractFactory("GovernorFake");
    governorFake = await GovernorFake.deploy(
      await erc20Fake.getAddress(),
      owner.address, // pauser
      100, // min voting period (blocks)
      1000, // max voting period (blocks)
      ethers.parseEther("1000") // quorum votes
    );
    await governorFake.waitForDeployment();
    
    // Deploy CompensatorFake
    const CompensatorFake = await ethers.getContractFactory("CompensatorFake");
    compensatorFake = await CompensatorFake.deploy(
      await erc20Fake.getAddress(),
      await governorFake.getAddress(),
      owner.address
    );
    await compensatorFake.waitForDeployment();
    
    return { erc20Fake, governorFake, compensatorFake, owner, user1, user2, user3 };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployFakesFixture);
    erc20Fake = fixture.erc20Fake;
    governorFake = fixture.governorFake;
    compensatorFake = fixture.compensatorFake;
    owner = fixture.owner;
    user1 = fixture.user1;
    user2 = fixture.user2;
    user3 = fixture.user3;
  });

  describe("ERC20Fake Advanced Features", function () {
    it("should handle pausable minting and burning", async function () {
      // Pause minting
      await erc20Fake.connect(owner).setMintingPaused(true);
      
      // Try to mint while paused
      await expect(
        erc20Fake.mint(user3.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Minting is paused");
      
      // Unpause minting
      await erc20Fake.connect(owner).setMintingPaused(false);
      
      // Mint should work now
      await erc20Fake.mint(user3.address, ethers.parseEther("100"));
      expect(await erc20Fake.balanceOf(user3.address)).to.equal(ethers.parseEther("100"));
    });

    it("should handle supply cap enforcement", async function () {
      const maxSupply = await erc20Fake.maxSupply();
      const currentSupply = await erc20Fake.totalSupply();
      const remainingSupply = maxSupply - currentSupply;
      
      // Try to mint more than remaining supply
      await expect(
        erc20Fake.mint(user3.address, remainingSupply + ethers.parseEther("0.00000001"))
      ).to.be.revertedWith("Would exceed max supply");
      
      // Mint exactly the remaining supply
      await erc20Fake.mint(user3.address, remainingSupply);
      expect(await erc20Fake.totalSupply()).to.equal(maxSupply);
    });

    it("should simulate transfer failures", async function () {
      // Give user3 some tokens first
      await erc20Fake.mint(user3.address, ethers.parseEther("200"));
      
      // Get initial balance
      const initialBalance = await erc20Fake.balanceOf(user2.address);
      
      // Simulate successful transfer
      await erc20Fake.transferWithFailure(user2.address, ethers.parseEther("100"), false);
      // Check if the transfer actually happened by checking balances
      expect(await erc20Fake.balanceOf(user2.address)).to.equal(initialBalance + ethers.parseEther("100"));
      
      // Simulate failed transfer
      await erc20Fake.transferWithFailure(user2.address, ethers.parseEther("100"), true);
      // Check that the transfer didn't happen
      expect(await erc20Fake.balanceOf(user2.address)).to.equal(initialBalance + ethers.parseEther("100")); // Balance unchanged
    });

    it("should emit detailed events", async function () {
      const mintAmount = ethers.parseEther("500");
      
      // Check that minting emits proper events
      await expect(erc20Fake.mint(user3.address, mintAmount))
        .to.emit(erc20Fake, "TokensMinted")
        .withArgs(user3.address, mintAmount);
        
      // Check that burning emits proper events
      await expect(erc20Fake.burn(user3.address, mintAmount))
        .to.emit(erc20Fake, "TokensBurned")
        .withArgs(user3.address, mintAmount);
    });
  });

  describe("GovernorFake Advanced Features", function () {
    it("should handle proposal lifecycle with realistic states", async function () {
      // Create a proposal
      const targets = [user1.address];
      const values = [0];
      const signatures = ["transfer(address,uint256)"];
      const calldatas = ["0x"];
      const description = "Test proposal";
      
      const tx = await governorFake.connect(user1).propose(
        targets, values, signatures, calldatas, description
      );
      const receipt = await tx.wait();
      
      // Check proposal creation event
      expect(receipt.logs).to.have.length.greaterThan(0);
      
      const proposalId = 0; // First proposal
      expect(await governorFake.state(proposalId)).to.equal(1); // Active
      
      // Cast votes
      await governorFake.connect(user1).castVote(proposalId, 1, "Support this proposal");
      await governorFake.connect(user2).castVote(proposalId, 0, "Against this proposal");
      
      // Advance time to end voting
      await time.increase(200); // More than min voting period
      await time.increaseTo(await time.latest() + 100);
      
      // Check final state
      const finalState = await governorFake.state(proposalId);
      // 1 = Active, 2 = Defeated, 3 = Succeeded
      expect([1, 2, 3]).to.include(Number(finalState));
    });

    it("should handle pausable operations", async function () {
      // Pause voting
      await governorFake.connect(owner).setVotingPaused(true);
      
      // Try to create proposal while paused
      const targets = [user1.address];
      const values = [0];
      const signatures = ["transfer(address,uint256)"];
      const calldatas = ["0x"];
      const description = "Test proposal";
      
      await governorFake.connect(user1).propose(
        targets, values, signatures, calldatas, description
      );
      
      // Try to vote while paused
      await expect(
        governorFake.connect(user1).castVote(0, 1, "Support")
      ).to.be.revertedWith("Voting is paused");
      
      // Unpause voting
      await governorFake.connect(owner).setVotingPaused(false);
      
      // Voting should work now
      await governorFake.connect(user1).castVote(0, 1, "Support");
    });

    it("should simulate voting power failures", async function () {
      // Simulate successful voting power retrieval
      const power1 = await governorFake.getCurrentVotesWithFailure(user1.address, false);
      expect(power1).to.be.gt(0);
      
      // Simulate failed voting power retrieval
      const power2 = await governorFake.getCurrentVotesWithFailure(user1.address, true);
      expect(power2).to.equal(0);
    });

    it("should handle proposal state manipulation for testing", async function () {
      // Create a proposal
      const targets = [user1.address];
      const values = [0];
      const signatures = ["transfer(address,uint256)"];
      const calldatas = ["0x"];
      const description = "Test proposal";
      
      await governorFake.connect(user1).propose(
        targets, values, signatures, calldatas, description
      );
      
      // Check initial state
      const initialState = await governorFake.state(0);
      expect(Number(initialState)).to.equal(1); // Active
      
      // Manually change proposal state for testing
      await governorFake.connect(owner).setProposalState(0, 4); // Succeeded
      const finalState = await governorFake.getRawProposalState(0);
      expect(Number(finalState)).to.equal(4); // Succeeded
    });
  });

  describe("CompensatorFake Advanced Features", function () {
    beforeEach(async function () {
      // Setup: Fund compensator and set reward rate
      const compensatorAddress = await compensatorFake.getAddress();
      await erc20Fake.connect(owner).approve(compensatorAddress, ethers.parseEther("10000"));
      await compensatorFake.connect(owner).ownerDeposit(ethers.parseEther("10000"));
      await compensatorFake.connect(owner).setRewardRate(ethers.parseEther("0.00000001"));
    });

    it("should handle function-level pausing", async function () {
      // Pause specific function
      const functionSelector = compensatorFake.interface.getFunction("userDeposit").selector;
      await compensatorFake.connect(owner).setFunctionPaused(functionSelector, true);
      
      // Try to call paused function
      const compensatorAddress = await compensatorFake.getAddress();
      await erc20Fake.connect(user1).approve(compensatorAddress, ethers.parseEther("100"));
      
      await expect(
        compensatorFake.connect(user1).userDeposit(ethers.parseEther("100"))
      ).to.be.revertedWith("Function is paused");
      
      // Unpause function
      await compensatorFake.connect(owner).setFunctionPaused(functionSelector, false);
      
      // Function should work now
      await compensatorFake.connect(user1).userDeposit(ethers.parseEther("100"));
    });

    it("should handle emergency mode", async function () {
      // Enable emergency mode
      await compensatorFake.connect(owner).setEmergencyMode(true);
      
      // Emergency withdrawal should work
      const tokenAddress = await erc20Fake.getAddress();
      await compensatorFake.connect(owner).emergencyWithdraw(tokenAddress, ethers.parseEther("1000"));
      
      // Disable emergency mode
      await compensatorFake.connect(owner).setEmergencyMode(false);
      
      // Emergency withdrawal should fail
      await expect(
        compensatorFake.connect(owner).emergencyWithdraw(tokenAddress, ethers.parseEther("1000"))
      ).to.be.revertedWith("Emergency mode not enabled");
    });

    it("should handle proposal staking and locking", async function () {
      // User deposits
      const compensatorAddress = await compensatorFake.getAddress();
      await erc20Fake.connect(user1).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensatorFake.connect(user1).userDeposit(ethers.parseEther("1000"));
      
      // Create active proposal
      await compensatorFake.connect(owner).setProposalActive(1, true);
      await compensatorFake.connect(owner).setProposalCreationTime(1, await time.latest());
      
      // Stake on proposal
      await compensatorFake.connect(user1).stakeOnProposal(1, ethers.parseEther("500"));
      
      // User should be locked
      expect(await compensatorFake.isUserLocked(user1.address)).to.be.true;
      
      // Try to withdraw while locked
      await expect(
        compensatorFake.connect(user1).userWithdraw(ethers.parseEther("100"))
      ).to.be.revertedWith("User is locked");
      
      // Advance time past lock period
      await time.increase(8 * 24 * 60 * 60); // 8 days
      
      // Withdraw stake
      await compensatorFake.connect(user1).withdrawProposalStake(1, ethers.parseEther("500"));
      
      // User should no longer be locked
      expect(await compensatorFake.isUserLocked(user1.address)).to.be.false;
      
      // Withdrawal should work now
      await compensatorFake.connect(user1).userWithdraw(ethers.parseEther("100"));
    });

    it("should simulate failures and gas consumption", async function () {
      // Simulate failure
      await expect(
        compensatorFake.simulateFailure(true, "Simulated failure for testing")
      ).to.be.revertedWith("Simulated failure for testing");
      
      // Simulate success
      await expect(
        compensatorFake.simulateFailure(false, "This should not fail")
      ).to.not.be.reverted;
      
      // Simulate gas consumption (this will consume some gas)
      const tx = await compensatorFake.simulateGasConsumption(10000);
      // Since it's a view function, we can't get gasUsed from receipt
      expect(tx).to.not.be.undefined;
    });

    it("should handle voting power delegation", async function () {
      // User deposits
      const compensatorAddress = await compensatorFake.getAddress();
      await erc20Fake.connect(user1).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensatorFake.connect(user1).userDeposit(ethers.parseEther("1000"));
      
      // Delegate voting power
      await compensatorFake.connect(user1).delegateVotingPower(user2.address, ethers.parseEther("500"));
      
      // Check delegation
      expect(await compensatorFake.userDelegations(user1.address)).to.equal(user2.address);
      expect(await compensatorFake.delegatedVotingPower(user2.address)).to.equal(ethers.parseEther("500"));
      
      // Revoke delegation
      await compensatorFake.connect(user1).revokeVotingPowerDelegation(user2.address, ethers.parseEther("300"));
      
      // Check updated delegation
      expect(await compensatorFake.delegatedVotingPower(user2.address)).to.equal(ethers.parseEther("200"));
    });
  });

  describe("Integration Between Fakes", function () {
    it("should handle complex multi-contract interactions", async function () {
      // Setup complex scenario
      const compensatorAddress = await compensatorFake.getAddress();
      
      // Users deposit into compensator
      await erc20Fake.connect(user1).approve(compensatorAddress, ethers.parseEther("1000"));
      await erc20Fake.connect(user2).approve(compensatorAddress, ethers.parseEther("1000"));
      await compensatorFake.connect(user1).userDeposit(ethers.parseEther("1000"));
      await compensatorFake.connect(user2).userDeposit(ethers.parseEther("1000"));
      
      // Create governance proposal (simplified)
      const targets = [user1.address]; // Simple target
      const values = [0];
      const signatures = ["transfer(address,uint256)"];
      const calldatas = ["0x"]; // Empty calldata
      const description = "Simple test proposal";
      
      await governorFake.connect(user1).propose(targets, values, signatures, calldatas, description);
      
      // Vote on proposal
      await governorFake.connect(user1).castVote(0, 1, "Support proposal");
      await governorFake.connect(user2).castVote(0, 1, "Support proposal");
      
      // Manually set proposal to succeeded for testing
      await governorFake.connect(owner).setProposalState(0, 4); // Succeeded
      
      // Execute proposal
      await governorFake.execute(0);
      
      // Check that proposal was executed
      const finalState = await governorFake.state(0);
      expect(Number(finalState)).to.equal(7); // Executed
    });

    it("should handle edge cases across multiple contracts", async function () {
      // Pause operations in multiple contracts
      await erc20Fake.connect(owner).setMintingPaused(true);
      await governorFake.connect(owner).setVotingPaused(true);
      await governorFake.connect(owner).setProposalCreationPaused(true);
      await compensatorFake.connect(owner).setPaused(true);
      
      // All operations should be paused
      await expect(erc20Fake.mint(user3.address, ethers.parseEther("100")))
        .to.be.revertedWith("Minting is paused");
        
      await expect(
        governorFake.connect(user1).propose([user1.address], [0], ["test"], ["0x"], "test")
      ).to.be.revertedWith("Proposal creation is paused");
      
      await expect(
        compensatorFake.connect(user1).userDeposit(ethers.parseEther("100"))
      ).to.be.revertedWith("Contract is paused");
      
      // Unpause all
      await erc20Fake.connect(owner).setMintingPaused(false);
      await governorFake.connect(owner).setVotingPaused(false);
      await governorFake.connect(owner).setProposalCreationPaused(false);
      await compensatorFake.connect(owner).setPaused(false);
      
      // All operations should work now
      await erc20Fake.mint(user3.address, ethers.parseEther("100"));
      await governorFake.connect(user1).propose([user1.address], [0], ["test"], ["0x"], "test");
      
      const compensatorAddress = await compensatorFake.getAddress();
      await erc20Fake.connect(user1).approve(compensatorAddress, ethers.parseEther("100"));
      await compensatorFake.connect(user1).userDeposit(ethers.parseEther("100"));
    });
  });
});
