const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const TestBase = require("../../helpers/TestBase");
const PerformanceBenchmarker = require("../../helpers/PerformanceBenchmarker");

describe("Compensator Performance Testing", function () {
  let testBase;
  let compensator, compToken, compoundGovernor, compensatorFactory;
  let delegate, delegator1, delegator2, delegator3, owner;
  let performanceBenchmarker;

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
    
    // Initialize performance benchmarker
    performanceBenchmarker = new PerformanceBenchmarker();
  });

  describe("Performance Benchmarking", function () {
    it("should create and run performance benchmarks", async function () {
      // Create benchmark
      const benchmark = performanceBenchmarker.createBenchmark(
        "CompensatorCore",
        "Benchmark core Compensator operations"
      );
      
      // Add scenario for userDeposit
      performanceBenchmarker.addScenario(
        "CompensatorCore",
        "userDeposit",
        async () => {
          const compensatorAddress = await compensator.getAddress();
          await compToken.connect(delegator1).approve(compensatorAddress, ethers.parseEther("1000"));
          return { user: delegator1, amount: ethers.parseEther("100") };
        },
        async (context) => {
          const tx = await compensator.connect(context.user).userDeposit(context.amount);
          const receipt = await tx.wait();
          return { gasUsed: receipt.gasUsed, metadata: { success: true } };
        }
      );
      
      // Run benchmarks
      const results = await performanceBenchmarker.runScenario(
        "CompensatorCore",
        "userDeposit",
        3
      );
      
      expect(results).to.have.property("summary");
      expect(results.summary.successRate).to.be.gt(0);
    });

    it("should handle basic benchmarking operations", async function () {
      // Test basic functionality
      expect(performanceBenchmarker).to.not.be.undefined;
      
      // Create a simple benchmark
      const benchmark = performanceBenchmarker.createBenchmark(
        "SimpleTest",
        "Simple performance test"
      );
      
      expect(benchmark).to.not.be.undefined;
    });
  });
});
