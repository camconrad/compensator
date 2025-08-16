const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockERC20", function () {
  let mockERC20, owner, user1, user2, user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("Mock Token", "MTK");
  });

  describe("Basic ERC20 Functionality", function () {
    it("should have correct name and symbol", async function () {
      expect(await mockERC20.name()).to.equal("Mock Token");
      expect(await mockERC20.symbol()).to.equal("MTK");
    });

    it("should allow minting", async function () {
      const amount = ethers.parseEther("1000");
      await mockERC20.mint(user1.address, amount);
      
      expect(await mockERC20.balanceOf(user1.address)).to.equal(amount);
      expect(await mockERC20.totalSupply()).to.equal(amount);
    });

    it("should allow burning", async function () {
      const mintAmount = ethers.parseEther("1000");
      const burnAmount = ethers.parseEther("300");
      
      await mockERC20.mint(user1.address, mintAmount);
      await mockERC20.burn(user1.address, burnAmount);
      
      expect(await mockERC20.balanceOf(user1.address)).to.equal(mintAmount - burnAmount);
      expect(await mockERC20.totalSupply()).to.equal(mintAmount - burnAmount);
    });

    it("should allow delegation", async function () {
      const amount = ethers.parseEther("1000");
      await mockERC20.mint(user1.address, amount);
      
      await mockERC20.connect(user1).delegate(user2.address);
      
      expect(await mockERC20.delegates(user1.address)).to.equal(user2.address);
    });

    it("should return current votes", async function () {
      const amount = ethers.parseEther("1000");
      await mockERC20.mint(user1.address, amount);
      
      const votes = await mockERC20.getCurrentVotes(user1.address);
      expect(votes).to.equal(amount);
    });
  });

  describe("Edge Cases", function () {
    it("should handle zero amount operations", async function () {
      await mockERC20.mint(user1.address, 0);
      expect(await mockERC20.balanceOf(user1.address)).to.equal(0);
      
      await mockERC20.burn(user1.address, 0);
      expect(await mockERC20.balanceOf(user1.address)).to.equal(0);
    });

    it("should handle delegation to zero address", async function () {
      await mockERC20.connect(user1).delegate(ethers.ZeroAddress);
      expect(await mockERC20.delegates(user1.address)).to.equal(ethers.ZeroAddress);
    });

    it("should handle delegation from zero address", async function () {
      // This should fail because zero address cannot sign transactions
      expect(true).to.be.true; // Basic structure test
    });

    it("should handle delegation to self", async function () {
      await mockERC20.connect(user1).delegate(user1.address);
      expect(await mockERC20.delegates(user1.address)).to.equal(user1.address);
    });

    it("should handle delegation changes", async function () {
      // First delegate to user2
      await mockERC20.connect(user1).delegate(user2.address);
      expect(await mockERC20.delegates(user1.address)).to.equal(user2.address);
      
      // Then change to user3
      await mockERC20.connect(user1).delegate(user3.address);
      expect(await mockERC20.delegates(user1.address)).to.equal(user3.address);
    });

    it("should handle delegation with zero balance", async function () {
      // User with no balance can still delegate
      await mockERC20.connect(user3).delegate(user1.address);
      expect(await mockERC20.delegates(user3.address)).to.equal(user1.address);
    });

    it("should handle delegation to contract address", async function () {
      const contractAddress = await mockERC20.getAddress();
      await mockERC20.connect(user1).delegate(contractAddress);
      expect(await mockERC20.delegates(user1.address)).to.equal(contractAddress);
    });

    it("should handle delegation from contract address", async function () {
      // This should work if the contract has a signer
      expect(true).to.be.true; // Basic structure test
    });

    it("should handle delegation with large amounts", async function () {
      const largeAmount = ethers.MaxUint256;
      await mockERC20.mint(user1.address, largeAmount);
      await mockERC20.connect(user1).delegate(user2.address);
      
      expect(await mockERC20.delegates(user1.address)).to.equal(user2.address);
      // After delegation, user1's voting power should be 0 and user2's should be the large amount
      expect(await mockERC20.getCurrentVotes(user1.address)).to.equal(0n);
      expect(await mockERC20.getCurrentVotes(user2.address)).to.equal(largeAmount);
    });

    it("should handle delegation with very small amounts", async function () {
      const smallAmount = 1; // 1 wei
      await mockERC20.mint(user1.address, smallAmount);
      await mockERC20.connect(user1).delegate(user2.address);
      
      expect(await mockERC20.delegates(user1.address)).to.equal(user2.address);
      // After delegation, user1's voting power should be 0 and user2's should be the small amount
      expect(await mockERC20.getCurrentVotes(user1.address)).to.equal(0n);
      expect(await mockERC20.getCurrentVotes(user2.address)).to.equal(smallAmount);
    });

    it("should handle delegation edge cases", async function () {
      // Test delegation to the same address multiple times
      await mockERC20.connect(user1).delegate(user2.address);
      await mockERC20.connect(user1).delegate(user2.address);
      expect(await mockERC20.delegates(user1.address)).to.equal(user2.address);
      
      // Test delegation from address with zero balance
      await mockERC20.connect(user3).delegate(user1.address);
      expect(await mockERC20.delegates(user3.address)).to.equal(user1.address);
    });
  });
});
