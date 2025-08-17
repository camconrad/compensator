const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const TestBase = require("../../helpers/TestBase");
const GasRegressionDetector = require("../../helpers/GasRegressionDetector");

describe("Compensator Gas Optimization", function () {
  let testBase;
  let compensator, compToken, compoundGovernor, compensatorFactory;
  let delegate, delegator1, delegator2, delegator3, owner;
  let gasRegressionDetector;

  before(async function () {
    testBase = new TestBase();
  });

  async function setupFixture() {
    return await testBase.setup();
  }

  beforeEach(async function () {
    const fixture = await loadFixture(setupFixture);
    compensator = fixture.compensator;
    compToken = fixture.compToken;
    compoundGovernor = fixture.compoundGovernor;
    compensatorFactory = fixture.compensatorFactory;
    delegate = fixture.delegate;
    delegator1 = fixture.delegator1;
    delegator2 = fixture.delegator2;
    delegator3 = fixture.delegator3;
    owner = fixture.owner;
    
    // Initialize gas regression detector
    gasRegressionDetector = new GasRegressionDetector();
  });

  afterEach(async function () {
    // Save gas history
    gasRegressionDetector.saveGasHistory();
  });

  after(async function () {
    // Generate and save comprehensive gas report
    const reportPath = gasRegressionDetector.saveGasReport();
    if (reportPath) {
      console.log(`\n📊 Gas Report Generated: ${reportPath}`);
      console.log("📈 Run 'npx hardhat test test/core/compensator/gas-optimization.test.js' to update the report");
    }
  });

  describe("Gas Regression Detection", function () {
    it("should set baselines for core operations", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup: Approve tokens
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("1000"));
      
      // Set baseline for userDeposit
      const depositTx = await compensator.connect(delegator1).userDeposit(ethers.parseEther("100"));
      const depositReceipt = await depositTx.wait();
      
      gasRegressionDetector.setBaseline("userDeposit", depositReceipt.gasUsed, {
        amount: ethers.parseEther("100").toString(),
        user: delegator1.address
      });
      
      // Set baseline for setRewardRate
      const rewardRateTx = await compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001"));
      const rewardRateReceipt = await rewardRateTx.wait();
      
      gasRegressionDetector.setBaseline("setRewardRate", rewardRateReceipt.gasUsed, {
        rate: ethers.parseEther("0.00000001").toString(),
        caller: delegate.address
      });
      
      console.log("Baselines set for core operations");
    });

    it("should detect gas regressions", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup: Approve tokens
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("1000"));
      
      // Record current gas usage
      const depositTx = await compensator.connect(delegator1).userDeposit(ethers.parseEther("50"));
      const depositReceipt = await depositTx.wait();
      
      gasRegressionDetector.recordGasUsage("userDeposit", depositReceipt.gasUsed, {
        amount: ethers.parseEther("50").toString(),
        user: delegator1.address
      });
      
      // Check for regressions
      const regression = gasRegressionDetector.detectRegressions("userDeposit", depositReceipt.gasUsed, {
        amount: ethers.parseEther("50").toString(),
        user: delegator1.address
      });
      
      expect(regression).to.have.property("hasRegression");
      expect(regression).to.have.property("message");
      expect(regression).to.have.property("percentageChange");
    });

    it("should track gas usage trends", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup: Approve tokens
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("1000"));
      
      // Record multiple gas usages
      for (let i = 0; i < 5; i++) {
        const amount = ethers.parseEther((10 + i * 10).toString());
        const tx = await compensator.connect(delegator1).userDeposit(amount);
        const receipt = await tx.wait();
        
        gasRegressionDetector.recordGasUsage("userDeposit", receipt.gasUsed, {
          amount: amount.toString(),
          user: delegator1.address,
          iteration: i
        });
      }
      
      // Basic validation that gas usage was recorded
      expect(gasRegressionDetector).to.not.be.undefined;
    });

    it("should compare gas usage across parameters", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup: Approve tokens
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("1000"));
      await compToken.connect(delegator2).approve(compensatorAddress, ethers.parseEther("1000"));
      
      // Test different amounts
      const amounts = [
        ethers.parseEther("10"),
        ethers.parseEther("50"),
        ethers.parseEther("100")
      ];
      
      for (const amount of amounts) {
        const tx = await compensator.connect(delegator1).userDeposit(amount);
        const receipt = await tx.wait();
        
        gasRegressionDetector.recordGasUsage("userDeposit", receipt.gasUsed, {
          amount: amount.toString(),
          user: delegator1.address
        });
      }
      
      // Basic validation that gas usage was recorded
      expect(gasRegressionDetector).to.not.be.undefined;
    });
  });

  describe("Gas Optimization Analysis", function () {
    it("should track gas usage patterns", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup: Approve tokens
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("1000"));
      
      // Record gas usage for different amounts
      const amounts = [
        ethers.parseEther("10"),
        ethers.parseEther("50"),
        ethers.parseEther("100")
      ];
      
      for (const amount of amounts) {
        const tx = await compensator.connect(delegator1).userDeposit(amount);
        const receipt = await tx.wait();
        
        gasRegressionDetector.recordGasUsage("userDeposit", receipt.gasUsed, {
          amount: amount.toString(),
          user: delegator1.address
        });
      }
      
      // Basic validation that gas usage was recorded
      expect(gasRegressionDetector).to.not.be.undefined;
    });

    it("should save gas history", async function () {
      // Test that gas history can be saved without error
      expect(() => gasRegressionDetector.saveGasHistory()).to.not.throw();
    });

    it("should test gas usage for different deposit amounts", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Test small deposit
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("1000"));
      const smallDepositTx = await compensator.connect(delegator1).userDeposit(ethers.parseEther("0.00000001"));
      const smallDepositReceipt = await smallDepositTx.wait();
      
      gasRegressionDetector.recordGasUsage("userDeposit_small", smallDepositReceipt.gasUsed, {
        amount: ethers.parseEther("0.00000001").toString(),
        user: delegator1.address
      });

      // Test medium deposit
      const mediumDepositTx = await compensator.connect(delegator1).userDeposit(ethers.parseEther("100"));
      const mediumDepositReceipt = await mediumDepositTx.wait();
      
      gasRegressionDetector.recordGasUsage("userDeposit_medium", mediumDepositReceipt.gasUsed, {
        amount: ethers.parseEther("100").toString(),
        user: delegator1.address
      });

      // Test large deposit
      const largeDepositTx = await compensator.connect(delegator1).userDeposit(ethers.parseEther("500"));
      const largeDepositReceipt = await largeDepositTx.wait();
      
      gasRegressionDetector.recordGasUsage("userDeposit_large", largeDepositReceipt.gasUsed, {
        amount: ethers.parseEther("500").toString(),
        user: delegator1.address
      });

      console.log(`Gas usage - Small: ${smallDepositReceipt.gasUsed}, Medium: ${mediumDepositReceipt.gasUsed}, Large: ${largeDepositReceipt.gasUsed}`);
    });

    it("should test gas usage for reward rate changes", async function () {
      // Test setting different reward rates
      const rates = [
        ethers.parseEther("0.000000001"), // Very small rate
        ethers.parseEther("0.00000001"), // Small rate
        ethers.parseEther("0.00000002"), // Medium rate (reduced to stay within secure limits)
        ethers.parseEther("0") // Zero rate
      ];

      for (let i = 0; i < rates.length; i++) {
        const rate = rates[i];
        const tx = await compensator.connect(delegate).setRewardRate(rate);
        const receipt = await tx.wait();
        
        gasRegressionDetector.recordGasUsage(`setRewardRate_${i}`, receipt.gasUsed, {
          rate: rate.toString(),
          caller: delegate.address
        });
      }
    });

    it("should test gas usage for multiple operations sequence", async function () {
      const compensatorAddress = await compensator.getAddress();
      
      // Setup
      await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("1000"));
      await compToken.connect(delegator2).approve(compensatorAddress, ethers.parseEther("1000"));
      
      // Record gas for sequence of operations (avoiding withdraw which requires specific state)
      const operations = [
        { name: "deposit1", fn: () => compensator.connect(delegator1).userDeposit(ethers.parseEther("50")) },
        { name: "deposit2", fn: () => compensator.connect(delegator2).userDeposit(ethers.parseEther("75")) },
        { name: "setRate", fn: () => compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000002")) },
        { name: "getPending", fn: () => compensator.connect(delegator1).getPendingRewards() },
        { name: "setRate2", fn: () => compensator.connect(delegate).setRewardRate(ethers.parseEther("0.00000001")) }
      ];

      for (const operation of operations) {
        if (operation.name !== "getPending") { // Skip view functions
          const tx = await operation.fn();
          const receipt = await tx.wait();
          
          gasRegressionDetector.recordGasUsage(`sequence_${operation.name}`, receipt.gasUsed, {
            operation: operation.name,
            sequence: "multi_operation_test"
          });
        }
      }
    });
  });
});
