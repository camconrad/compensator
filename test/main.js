// Main Test Index
// This file runs all test categories for comprehensive coverage

console.log("🧪 Starting Compensator Test Suite...\n");

// Core Tests
console.log("📋 Loading Core Tests...");
require('./core/compensator/views.test.js');
require('./core/compensator/delegate-functions.test.js');
require('./core/compensator/factory.test.js');

// Security Tests
console.log("🔒 Loading Security Tests...");
require('./core/compensator/security.test.js');

// Performance Tests
console.log("⚡ Loading Performance Tests...");
require('./core/compensator/performance.test.js');

// Gas Optimization Tests
console.log("⛽ Loading Gas Optimization Tests...");
require('./core/compensator/gas-optimization.test.js');

// Fork Tests
console.log("🔄 Loading Fork Tests...");
require('./fork/index.js');

// Invariant Tests
console.log("🧮 Loading Invariant Tests...");
require('./invariants/CompensatorInvariants.test.js');

// Fuzzing Tests
console.log("🎲 Loading Fuzzing Tests...");
require('./fuzzing/CompensatorFuzzingTests.js');

// Integration Tests
console.log("🔗 Loading Integration Tests...");
require('./integration/Integration.test.js');

// Edge Case Tests
console.log("⚠️  Loading Edge Case Tests...");
require('./edge-cases/EdgeCases.test.js');

// Fake Contract Tests (using compiled contracts from contracts/fakes/)
console.log("🎭 Fake contracts available via compiled contracts in contracts/fakes/");

// Mock Contract Tests
console.log("🎨 Loading Mock Contract Tests...");
require('./mocks/MockERC20.test.js');





console.log("✅ All test categories loaded successfully!\n");
