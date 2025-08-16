// Compensator Core Tests Index
require('./views.test.js');
require('./delegate-functions.test.js');
require('./gas-optimization.test.js');
require('./performance.test.js');
require('./security.test.js');

module.exports = {
  description: 'Core Compensator contract functionality tests',
  tests: [
    'views.test.js',
    'delegate-functions.test.js',
    'gas-optimization.test.js',
    'performance.test.js',
    'security.test.js'
  ]
};
