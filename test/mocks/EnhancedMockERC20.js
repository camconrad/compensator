const { ethers } = require("hardhat");

class EnhancedMockERC20 {
  constructor(name, symbol, decimals = 18) {
    this.name = name;
    this.symbol = symbol;
    this.decimals = decimals;
    this.contract = null;
  }

  async deploy() {
    const MockToken = await ethers.getContractFactory("MockERC20");
    this.contract = await MockToken.deploy(this.name, this.symbol);
    await this.contract.waitForDeployment();
    return this.contract;
  }

  async mint(to, amount) {
    if (!this.contract) throw new Error("Contract not deployed");
    return await this.contract.mint(to, amount);
  }

  async burn(from, amount) {
    if (!this.contract) throw new Error("Contract not deployed");
    return await this.contract.burn(from, amount);
  }

  async transfer(to, amount) {
    if (!this.contract) throw new Error("Contract not deployed");
    return await this.contract.transfer(to, amount);
  }

  async transferFrom(from, to, amount) {
    if (!this.contract) throw new Error("Contract not deployed");
    return await this.contract.transferFrom(from, to, amount);
  }

  async approve(spender, amount) {
    if (!this.contract) throw new Error("Contract not deployed");
    return await this.contract.approve(spender, amount);
  }

  async balanceOf(address) {
    if (!this.contract) throw new Error("Contract not deployed");
    return await this.contract.balanceOf(address);
  }

  async allowance(owner, spender) {
    if (!this.contract) throw new Error("Contract not deployed");
    return await this.contract.allowance(owner, spender);
  }

  async totalSupply() {
    if (!this.contract) throw new Error("Contract not deployed");
    return await this.contract.totalSupply();
  }

  async getAddress() {
    if (!this.contract) throw new Error("Contract not deployed");
    return await this.contract.getAddress();
  }

  // Enhanced testing methods
  async mintToMultiple(recipients, amounts) {
    if (!this.contract) throw new Error("Contract not deployed");
    const txs = [];
    for (let i = 0; i < recipients.length; i++) {
      txs.push(await this.contract.mint(recipients[i], amounts[i]));
    }
    return txs;
  }

  async setBalance(address, amount) {
    if (!this.contract) throw new Error("Contract not deployed");
    // This would require a custom implementation in the mock contract
    // For now, we'll mint the required amount
    const currentBalance = await this.contract.balanceOf(address);
    if (currentBalance < amount) {
      await this.contract.mint(address, amount - currentBalance);
    } else if (currentBalance > amount) {
      await this.contract.burn(address, currentBalance - amount);
    }
  }

  async getBalances(addresses) {
    if (!this.contract) throw new Error("Contract not deployed");
    const balances = {};
    for (const address of addresses) {
      balances[address] = await this.contract.balanceOf(address);
    }
    return balances;
  }

  async simulateTransferFailure(from, to, amount) {
    if (!this.contract) throw new Error("Contract not deployed");
    // This would require a custom implementation in the mock contract
    // For now, we'll just return a promise that will fail
    return Promise.reject(new Error("Transfer simulation failed"));
  }

  // Utility methods for testing
  async getContractInfo() {
    if (!this.contract) throw new Error("Contract not deployed");
    return {
      name: await this.contract.name(),
      symbol: await this.contract.symbol(),
      decimals: await this.contract.decimals(),
      totalSupply: await this.contract.totalSupply(),
      address: await this.contract.getAddress()
    };
  }

  async logBalances(addresses, label = "Balances") {
    if (!this.contract) throw new Error("Contract not deployed");
    console.log(`\n=== ${label} ===`);
    for (const address of addresses) {
      const balance = await this.contract.balanceOf(address);
      console.log(`${address}: ${ethers.formatEther(balance)} ${this.symbol}`);
    }
    console.log("==================\n");
  }
}

module.exports = EnhancedMockERC20;
