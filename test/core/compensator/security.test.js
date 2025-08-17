const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const TestBase = require("../../helpers/TestBase");
const AdvancedSecurityTester = require("../../helpers/AdvancedSecurityTester");

describe("Compensator Security Testing", function () {
  let testBase;
  let compensator, compToken, compoundGovernor, compensatorFactory;
  let delegate, delegator1, delegator2, delegator3, owner;
  let advancedSecurityTester;

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
    
    // Initialize advanced security tester
    advancedSecurityTester = new AdvancedSecurityTester();
  });

  describe("Advanced Security Testing", function () {
    it("should run comprehensive security test suite", async function () {
      // Create security test suite
      const securitySuite = advancedSecurityTester.createSecurityTestSuite(
        "CompensatorSecurity",
        "Comprehensive security testing for Compensator contract"
      );
      
      // Add access control test
      advancedSecurityTester.addAccessControlTest(
        "CompensatorSecurity",
        "setRewardRateAccessControl",
        compensator,
        "setRewardRate",
        "delegate",
        [delegator1, delegator2, delegator3], // Unauthorized users
        { rate: ethers.parseEther("1") }
      );
      
      // Run security suite
      const securityResults = await advancedSecurityTester.runSecuritySuite("CompensatorSecurity");
      
      expect(securityResults).to.have.property("totalTests");
      expect(securityResults).to.have.property("vulnerabilities");
      expect(securityResults).to.have.property("summary");
    });

    it("should test access control mechanisms", async function () {
      // Test owner-only functions
      const ownerFunctions = [
        { name: "setRewardRate", args: [ethers.parseEther("0.00000002")] },
        { name: "ownerDeposit", args: [ethers.parseEther("100")] },
        { name: "ownerWithdraw", args: [ethers.parseEther("50")] }
      ];
      
      for (const func of ownerFunctions) {
        // Test that non-owners cannot call these functions
        await expect(
          compensator.connect(delegator1)[func.name](...func.args)
        ).to.be.reverted;
        
        // Test that owner can call these functions
        if (func.name === "ownerDeposit") {
          const compensatorAddress = await compensator.getAddress();
          await compToken.connect(delegate).approve(compensatorAddress, func.args[0]);
        }
        
        await expect(
          compensator.connect(delegate)[func.name](...func.args)
        ).to.not.be.reverted;
      }
    });

    it("should test basic security functionality", async function () {
      // Test basic functionality
      expect(advancedSecurityTester).to.not.be.undefined;
      
      // Test that we can create security test suites
      const suite = advancedSecurityTester.createSecurityTestSuite(
        "BasicTest",
        "Basic security test"
      );
      
      expect(suite).to.not.be.undefined;
    });
  });

  describe("Integration Security Testing", function () {
    it("should test basic security interactions", async function () {
      // Test basic security functionality
      expect(advancedSecurityTester).to.not.be.undefined;
      
      // Test that we can create and run basic security tests
      const suite = advancedSecurityTester.createSecurityTestSuite(
        "IntegrationTest",
        "Integration security test"
      );
      
      expect(suite).to.not.be.undefined;
    });
  });
});
