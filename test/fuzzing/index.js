// Fuzzing Tests Index
require('./CompensatorFuzzingTests.js');

module.exports = {
  description: 'Property-based and fuzzing tests for Compensator contract',
  tests: [
    'CompensatorFuzzingTests.js'
  ]
};
