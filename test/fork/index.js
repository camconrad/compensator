// Fork Tests Index
require('./CompensatorForkTests.js');

module.exports = {
  description: 'Fork-based integration tests against mainnet contracts',
  tests: [
    'CompensatorForkTests.js'
  ]
};
