// Core Tests Index
require('./compensator/index.js');
require('./factory/index.js');

module.exports = {
  description: 'Core functionality tests for Compensator and CompensatorFactory contracts',
  tests: [
    'compensator/',
    'factory/'
  ]
};
