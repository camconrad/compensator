#!/usr/bin/env node

/**
 * Fork Test Runner Script
 * Runs tests against forked mainnet for integration testing
 */

const { execSync } = require('child_process');
const path = require('path');

console.log("🔄 Starting Fork Test Runner...\n");

// Check if environment variables are set
const requiredEnvVars = ['MAINNET_RPC_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log("⚠️  Missing required environment variables:");
  missingVars.forEach(varName => console.log(`   - ${varName}`));
  console.log("\n📝 Please set them in your .env file:");
  console.log("   MAINNET_RPC_URL=https://eth.llamarpc.com");
  console.log("   FORK_BLOCK_NUMBER=19000000 (optional)\n");
  process.exit(1);
}

console.log("✅ Environment variables configured:");
console.log(`   MAINNET_RPC_URL: ${process.env.MAINNET_RPC_URL}`);
console.log(`   FORK_BLOCK_NUMBER: ${process.env.FORK_BLOCK_NUMBER || 'Latest'}\n`);

// Enable forking in hardhat config temporarily
console.log("🔧 Configuring Hardhat for forking...");

try {
  // Run fork tests
  console.log("🧪 Running fork tests...\n");
  
  const testCommand = `npx hardhat test test/fork/ --network hardhat`;
  console.log(`Executing: ${testCommand}\n`);
  
  execSync(testCommand, { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log("\n✅ Fork tests completed successfully!");
  
} catch (error) {
  console.error("\n❌ Fork tests failed:", error.message);
  process.exit(1);
}
