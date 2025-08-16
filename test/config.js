module.exports = {
  // Test execution configuration
  execution: {
    timeout: 120000, // 2 minutes per test
    parallel: false, // Run tests sequentially for stability
    verbose: false,  // Verbose output
    gasReporting: true, // Include gas reporting
    coverage: true,  // Include coverage reporting
  },

  // Test data configuration
  testData: {
    // User counts for scalability tests
    userCounts: {
      small: 5,
      medium: 20,
      large: 100,
      stress: 500
    },

    // Amount ranges for different test scenarios
    amounts: {
      zero: "0",
      verySmall: "0.000001",
      small: "0.1",
      medium: "100",
      large: "10000",
      veryLarge: "1000000",
      max: "10000000"
    },

    // Time periods for testing
    timePeriods: {
      short: 60,      // 1 minute
      medium: 3600,   // 1 hour
      long: 86400,    // 1 day
      veryLong: 2592000 // 30 days
    },

    // Reward rates for testing
    rewardRates: {
      zero: "0",
      low: "0.1",
      medium: "1",
      high: "10",
      veryHigh: "100"
    }
  },

  // Gas optimization configuration
  gas: {
    // Gas limits for different operations
    limits: {
      userDeposit: 200000,
      userWithdraw: 150000,
      ownerDeposit: 150000,
      setRewardRate: 100000,
      claimRewards: 200000,
      pendingRewards: 50000,
      userBalance: 30000,
      totalStaked: 30000
    },

    // Gas tolerance for assertions
    tolerance: 1000,

    // Gas reporting thresholds
    reporting: {
      warning: 100000,  // Warning above this gas usage
      critical: 500000  // Critical above this gas usage
    }
  },

  // Security testing configuration
  security: {
    // Test scenarios to include
    scenarios: {
      accessControl: true,
      reentrancy: true,
      overflow: true,
      underflow: true,
      inputValidation: true,
      stateConsistency: true,
      frontRunning: true,
      dos: true,
      economicAttacks: true,
      gasLimitAttacks: true
    },

    // Attack vectors to test
    attackVectors: {
      flashLoans: true,
      sandwichAttacks: true,
      griefing: true,
      timeManipulation: true,
      balanceManipulation: true
    }
  },

  // Edge case testing configuration
  edgeCases: {
    // Boundary conditions to test
    boundaries: {
      zeroAmounts: true,
      maxAmounts: true,
      precision: true,
      timeBoundaries: true,
      addressBoundaries: true
    },

    // Stress test configurations
    stress: {
      maxUsers: 1000,
      maxTransactions: 1000,
      maxAmount: "1000000000",
      maxTime: 31536000 // 1 year
    }
  },

  // Integration testing configuration
  integration: {
    // Workflow scenarios to test
    workflows: {
      completeStakingCycle: true,
      multipleRewardCycles: true,
      dynamicRewardRates: true,
      userJoiningLeaving: true,
      emergencyScenarios: true
    },

    // Multi-user scenarios
    multiUser: {
      simultaneousStaking: true,
      concurrentOperations: true,
      differentStakeAmounts: true,
      userLifecycle: true
    }
  },

  // Performance testing configuration
  performance: {
    // Scalability tests
    scalability: {
      userScaling: true,
      transactionScaling: true,
      amountScaling: true,
      timeScaling: true
    },

    // Benchmark configurations
    benchmarks: {
      gasEfficiency: true,
      memoryUsage: true,
      executionTime: true,
      throughput: true
    }
  },

  // Mock contract configuration
  mocks: {
    // ERC20 token configuration
    erc20: {
      name: "Mock COMP",
      symbol: "COMP",
      decimals: 18,
      initialSupply: "1000000000"
    },

    // Governor configuration
    governor: {
      proposalCount: 10,
      votingPeriod: 86400,
      quorumPercentage: 4
    }
  },

  // Test environment configuration
  environment: {
    // Network configuration
    network: {
      chainId: 31337, // Hardhat default
      blockTime: 12,  // 12 seconds per block
      gasLimit: 30000000
    },

    // Account configuration
    accounts: {
      defaultCount: 20,
      mnemonic: "test test test test test test test test test test test junk"
    }
  },

  // Reporting configuration
  reporting: {
    // Output formats
    formats: {
      console: true,
      json: false,
      html: false,
      markdown: false
    },

    // Report locations
    output: {
      gasReports: "./test/gas-reports",
      coverageReports: "./test/coverage",
      testResults: "./test/results"
    }
  },

  // Debug configuration
  debug: {
    // Debug flags
    flags: {
      verboseLogging: false,
      gasTracking: true,
      stateTracking: false,
      eventTracking: false
    },

    // Log levels
    logLevel: "info", // debug, info, warn, error
  }
};
