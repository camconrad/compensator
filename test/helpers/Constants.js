const { ethers } = require("ethers");

// Test constants
const TEST_CONSTANTS = {
  // Token amounts
  ZERO_AMOUNT: ethers.parseEther("0"),
  SMALL_AMOUNT: ethers.parseEther("0.00000001"),
  MEDIUM_AMOUNT: ethers.parseEther("100"),
  LARGE_AMOUNT: ethers.parseEther("10000"),
  VERY_LARGE_AMOUNT: ethers.parseEther("1000000"),
  
  // Time periods (in seconds)
  ONE_MINUTE: 60,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
  ONE_MONTH: 2592000,
  ONE_YEAR: 31536000,
  
  // Reward rates
  LOW_REWARD_RATE: ethers.parseEther("0.000000001"),
  MEDIUM_REWARD_RATE: ethers.parseEther("0.00000001"),
  HIGH_REWARD_RATE: ethers.parseEther("0.00000005"),
  
  // Precision and tolerance
  PRECISION: ethers.parseEther("0.000001"),
  TOLERANCE: ethers.parseEther("0.001"),
  GAS_TOLERANCE: 1000,
  
  // Test limits
  MAX_TEST_ITERATIONS: 100,
  MAX_TEST_ACCOUNTS: 20,
  MAX_TEST_AMOUNT: ethers.parseEther("10000000"),
  
  // Error messages
  ERROR_MESSAGES: {
    INSUFFICIENT_BALANCE: "ERC20: transfer amount exceeds balance",
    INSUFFICIENT_ALLOWANCE: "ERC20: insufficient allowance",
    UNAUTHORIZED: "Ownable: caller is not the owner",
    INVALID_ADDRESS: "Invalid address",
    INVALID_AMOUNT: "Invalid amount",
    ALREADY_EXISTS: "Owner already has compensator",
    NOT_FOUND: "Compensator not found",
    INSUFFICIENT_REWARDS: "Insufficient rewards",
    INVALID_TIME: "Invalid time",
    REENTRANCY: "ReentrancyGuard: reentrant call"
  }
};

// Test scenarios
const TEST_SCENARIOS = {
  // Normal operation scenarios
  NORMAL_STAKE: "normal_stake",
  NORMAL_WITHDRAW: "normal_withdraw",
  NORMAL_CLAIM: "normal_claim",
  
  // Edge cases
  ZERO_AMOUNT: "zero_amount",
  MAX_AMOUNT: "max_amount",
  MIN_AMOUNT: "min_amount",
  
  // Stress test scenarios
  MANY_USERS: "many_users",
  MANY_TRANSACTIONS: "many_transactions",
  LARGE_AMOUNTS: "large_amounts",
  
  // Security test scenarios
  UNAUTHORIZED_ACCESS: "unauthorized_access",
  REENTRANCY: "reentrancy",
  OVERFLOW: "overflow",
  UNDERFLOW: "underflow"
};

// Test data generators
const TEST_DATA = {
  // Generate random amounts within bounds
  randomAmount: (min, max) => {
    const minWei = ethers.parseEther(min.toString());
    const maxWei = ethers.parseEther(max.toString());
    const random = Math.random();
    return minWei + (maxWei - minWei) * random;
  },
  
  // Generate random time periods
  randomTime: (minSeconds, maxSeconds) => {
    return Math.floor(Math.random() * (maxSeconds - minSeconds)) + minSeconds;
  },
  
  // Generate test addresses (not real addresses, just for testing)
  generateTestAddress: () => {
    return ethers.Wallet.createRandom().address;
  },
  
  // Generate test amounts with specific characteristics
  generateTestAmounts: () => {
    return {
      zero: TEST_CONSTANTS.ZERO_AMOUNT,
      verySmall: TEST_CONSTANTS.SMALL_AMOUNT,
      small: ethers.parseEther("1"),
      medium: TEST_CONSTANTS.MEDIUM_AMOUNT,
      large: TEST_CONSTANTS.LARGE_AMOUNT,
      veryLarge: TEST_CONSTANTS.VERY_LARGE_AMOUNT
    };
  }
};

module.exports = {
  TEST_CONSTANTS,
  TEST_SCENARIOS,
  TEST_DATA
};
