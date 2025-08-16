const { ethers } = require("ethers");
const { expect } = require("chai");

class TestUtils {
  // Gas measurement utilities
  static async measureGas(txPromise) {
    const tx = await txPromise;
    const receipt = await tx.wait();
    return receipt.gasUsed;
  }

  static async expectGasUsage(txPromise, expectedGas, tolerance = 1000) {
    const gasUsed = await this.measureGas(txPromise);
    expect(gasUsed).to.be.closeTo(expectedGas, tolerance);
    return gasUsed;
  }

  // Time manipulation utilities
  static async timeTravel(provider, seconds) {
    await provider.send("evm_increaseTime", [seconds]);
    await provider.send("evm_mine");
  }

  static async setNextBlockTimestamp(provider, timestamp) {
    await provider.send("evm_setNextBlockTimestamp", [timestamp]);
  }

  static async mineBlock(provider) {
    await provider.send("evm_mine");
  }

  // Balance checking utilities
  static async expectBalanceChange(token, address, expectedChange, tolerance = 0) {
    const balanceBefore = await token.balanceOf(address);
    return {
      before: balanceBefore,
      expectAfter: balanceBefore + expectedChange,
      checkAfter: async () => {
        const balanceAfter = await token.balanceOf(address);
        if (tolerance === 0) {
          expect(balanceAfter).to.equal(balanceBefore + expectedChange);
        } else {
          expect(balanceAfter).to.be.closeTo(balanceBefore + expectedChange, tolerance);
        }
        return balanceAfter;
      }
    };
  }

  // Event assertion utilities
  static async expectEvent(txPromise, eventName, expectedArgs = {}) {
    const tx = await txPromise;
    const receipt = await tx.wait();
    
    const event = receipt.logs.find(log => {
      try {
        const parsed = tx.interface.parseLog(log);
        return parsed.name === eventName;
      } catch {
        return false;
      }
    });
    
    expect(event).to.not.be.undefined;
    
    if (Object.keys(expectedArgs).length > 0) {
      const parsed = tx.interface.parseLog(event);
      for (const [key, value] of Object.entries(expectedArgs)) {
        expect(parsed.args[key]).to.equal(value);
      }
    }
    
    return event;
  }

  static async expectNoEvent(txPromise, eventName) {
    const tx = await txPromise;
    const receipt = await tx.wait();
    
    const event = receipt.logs.find(log => {
      try {
        const parsed = tx.interface.parseLog(log);
        return parsed.name === eventName;
      } catch {
        return false;
      }
    });
    
    expect(event).to.be.undefined;
  }

  // Revert assertion utilities
  static async expectRevert(txPromise, expectedError) {
    if (typeof expectedError === 'string') {
      await expect(txPromise).to.be.revertedWith(expectedError);
    } else if (expectedError.customError) {
      await expect(txPromise).to.be.revertedWithCustomError(
        expectedError.contract, 
        expectedError.errorName
      );
    } else {
      await expect(txPromise).to.be.reverted;
    }
  }

  // State checking utilities
  static async expectStateChange(contract, stateFunction, expectedValue, tolerance = 0) {
    const stateBefore = await contract[stateFunction]();
    return {
      before: stateBefore,
      expectAfter: expectedValue,
      checkAfter: async () => {
        const stateAfter = await contract[stateFunction]();
        if (tolerance === 0) {
          expect(stateAfter).to.equal(expectedValue);
        } else {
          expect(stateAfter).to.be.closeTo(expectedValue, tolerance);
        }
        return stateAfter;
      }
    };
  }

  // Random data generation utilities
  static randomAddress() {
    return ethers.Wallet.createRandom().address;
  }

  static randomAmount(min, max) {
    const minWei = ethers.parseEther(min.toString());
    const maxWei = ethers.parseEther(max.toString());
    const random = Math.random();
    return minWei + (maxWei - minWei) * random;
  }

  static randomTime(minSeconds, maxSeconds) {
    return Math.floor(Math.random() * (maxSeconds - minSeconds)) + minSeconds;
  }

  // Array and batch testing utilities
  static async batchOperation(accounts, operation, ...args) {
    const results = [];
    for (const account of accounts) {
      try {
        const result = await operation(account, ...args);
        results.push({ account, success: true, result });
      } catch (error) {
        results.push({ account, success: false, error: error.message });
      }
    }
    return results;
  }

  static async stressTest(operation, iterations = 100, ...args) {
    const results = [];
    for (let i = 0; i < iterations; i++) {
      try {
        const result = await operation(...args);
        results.push({ iteration: i, success: true, result });
      } catch (error) {
        results.push({ iteration: i, success: false, error: error.message });
      }
    }
    return results;
  }

  // Validation utilities
  static isValidAddress(address) {
    try {
      ethers.getAddress(address);
      return true;
    } catch {
      return false;
    }
  }

  static isValidAmount(amount) {
    return amount >= 0 && amount <= ethers.MaxUint256;
  }

  // Logging utilities for debugging
  static logTestInfo(testName, ...args) {
    console.log(`\n=== ${testName} ===`);
    args.forEach((arg, index) => {
      console.log(`Arg ${index + 1}:`, arg);
    });
    console.log("==================\n");
  }

  static logGasUsage(operation, gasUsed) {
    console.log(`Gas used for ${operation}: ${gasUsed.toString()}`);
  }

  static async logBalanceChange(token, address, balanceBefore, balanceAfter) {
    const change = balanceAfter - balanceBefore;
    const symbol = await token.symbol();
    console.log(`Balance change for ${address}: ${ethers.formatEther(change)} ${symbol}`);
  }
}

module.exports = TestUtils;
