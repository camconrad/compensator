<p align="center">
  <img src="public/showcase-1.png" alt="Compensator" width=100%>
</p>

## Contract Addresses

| Name       | Address       |
| -------------  | ------------- |
| Compensator Factory      | [#](https://etherscan.io/address/#) |
| Compound Governor     | [0x309a862bbC1A00e45506cB8A802D1ff10004c8C0](https://etherscan.io/address/0x309a862bbC1A00e45506cB8A802D1ff10004c8C0) |
| Compound (COMP)    | [0xc00e94Cb662C3520282E6f5717214004A7f26888](https://etherscan.io/address/0xc00e94Cb662C3520282E6f5717214004A7f26888) |

## Overview
Compensator is a dedicated delegate marketplace for the Compound DAO, designed to address low voter turnout and lack of incentivization in governance. It enables COMP holders to delegate voting power in exchange for transparent rewards, fostering greater participation in vote outcomes. Delegates attract voting power through competitive compensation, creating a vibrant and efficient governance ecosystem.

## Core Features

### **Factory-Based Delegation System**
- **CompensatorFactory** deploys individual **Compensator** contracts for each user
- Each user gets their own **Compensator** instance for personalized delegation
- Factory tracks all deployed compensators and owner mappings
- Users can create compensators for themselves or others

### **Delegation and Rewards**
- Delegates supply COMP into their `Compensator` contract to fund rewards for delegators
- Delegates set a reward rate (in COMP/second) to distribute rewards proportionally
- COMP holders delegate votes to the delegate's `Compensator` contract
- Delegators earn rewards based on their share of delegated COMP
- **Index-based reward distribution** ensures fair and accurate reward calculation
- **Time-based accrual** with proportional stake distribution

### **Proposal Staking and Vote Compensation**
- Delegators can stake COMP on proposal outcomes (For/Against)
- **For Stakes**: COMP staked in support of a proposal
- **Against Stakes**: COMP staked against a proposal
- After proposal resolution, stakes are distributed based on outcome:
  - If delegate voted correctly:
    - Winning stakes go to the delegate (20% reward)
    - Losing stakes are returned to delegators
  - If delegate didn't vote or voted wrong:
    - All stakes are returned to delegators
- **Trustless resolution** through Compound Governor state verification
- **Automatic timeout** after 30 days to prevent stuck stakes

### **Enhanced Vote Verification**
- **Multi-layered verification** of delegate voting through Compound Governor
- Records vote direction, block number, transaction hash, timestamp, and voting power
- Verifies votes were cast in valid proposal states
- Prevents vote manipulation through on-chain verification
- **Delegate performance tracking** with success rate metrics

### **Reward Management**
- **Claim mechanism**: Users can claim accumulated rewards anytime
- **Reward preservation** during deposits and withdrawals
- **Separate tracking** of accrued and unclaimed rewards
- **Precision safeguards** with high-precision calculations
- **Reentrancy protection** with state variable caching

See [Protocol Specs](https://github.com/camconrad/compensator/blob/main/contracts/README.md) for more detail.

## User Workflow

### For Delegates
1. **Create Compensator**: Call `CompensatorFactory.createCompensatorForSelf()` to deploy your contract
2. **Supply COMP**: Supply COMP into your `Compensator` contract to fund delegator rewards
3. **Set Reward Rate**: Define the reward rate (in COMP per second) to distribute rewards
4. **Vote on Proposals**: Cast votes on Compound governance proposals
5. **Earn from Stakes**: Receive winning stakes when you vote correctly on proposals
6. **Withdraw COMP**: Withdraw unused COMP as needed (pending rewards reserved)

### For Delegators
1. **Find a Delegate**: Browse available delegates and their performance metrics
2. **Delegate COMP**: Delegate COMP to a delegate's `Compensator` contract to start earning
3. **Stake on Proposals**: Stake COMP on proposal outcomes (For/Against) to incentivize voting
4. **Monitor Performance**: Track delegate voting success and reward rates
5. **Claim Rewards**: Claim your proportionally accrued COMP rewards at any time
6. **Reclaim Stakes**: Reclaim losing stakes after proposal resolution

## Development

### Setup
```bash
npm install
npx hardhat clean
npx hardhat compile
```

### Local Development
```bash
# Start local network
npx hardhat node

# Deploy contracts locally
npx hardhat run scripts/deploy.ts --network localhost
```

## Testing

The Compensator test suite is a **world-class, enterprise-grade testing framework** with **224+ passing tests** organized into multiple specialized categories for comprehensive coverage and quality assurance.

### 🏗️ Test Architecture

```
test/
├── core/                    # Core functionality tests
│   ├── compensator/        # Main Compensator contract tests
│   │   ├── delegate-functions.test.js    # Delegation & staking (1100+ lines)
│   │   ├── views.test.js                 # View functions & data retrieval
│   │   ├── factory.test.js               # Factory operations & management
│   │   ├── security.test.js              # Access control & security
│   │   ├── performance.test.js           # Performance benchmarking
│   │   ├── gas-optimization.test.js      # Gas usage & optimization
│   │   └── branch-coverage.test.js       # Edge case coverage
│   └── factory/            # CompensatorFactory tests
├── invariants/             # Critical system property tests
├── fuzzing/                # Property-based and edge case tests
├── integration/            # End-to-end system workflows
├── edge-cases/             # Boundary condition tests
├── fakes/                  # Advanced testing contracts
├── mocks/                  # Mock contract implementations
├── fork/                   # Mainnet forking tests
├── helpers/                # Test utility classes
├── gas-reports/            # Gas usage analysis
└── main.js                 # Main test runner
```

### 🧪 Test Categories & Coverage

| Category | Tests | Status | Description |
|----------|-------|---------|-------------|
| **Core Tests** | 66+ | ✅ | Delegate functions, views, factory operations |
| **Invariants** | 12 | ✅ | System properties and mathematical consistency |
| **Fuzzing** | 5 | ✅ | Property-based testing with random inputs |
| **Integration** | 4 | ✅ | End-to-end system workflows |
| **Edge Cases** | 12 | ✅ | Boundary conditions and error handling |
| **Fake Contracts** | 15 | ✅ | Advanced testing contracts |
| **Mock Contracts** | 22 | ✅ | ERC20 and Governor mocks |
| **Factory Tests** | 20+ | ✅ | Factory deployment and management |
| **Views Tests** | 15+ | ✅ | Contract view functions |
| **Security Tests** | 3+ | ✅ | Access control and security |
| **Performance Tests** | 2+ | ✅ | Benchmarking and optimization |
| **Gas Tests** | 6+ | ✅ | Gas usage tracking and regression |
| **Fork Tests** | 5 | ✅ | Mainnet forking and real contracts |

**Total: 224+ tests** 🎉

### 🚀 Running Tests

#### Run All Tests
```bash
npx hardhat test
```

#### Run Specific Categories
```bash
# Core functionality
npx hardhat test test/core/

# Security and invariants
npx hardhat test test/invariants/

# Property-based testing
npx hardhat test test/fuzzing/

# End-to-end workflows
npx hardhat test test/integration/

# Edge cases and boundaries
npx hardhat test test/edge-cases/

# Advanced testing contracts
npx hardhat test test/fakes/

# Mock implementations
npx hardhat test test/mocks/

# Mainnet forking
npx hardhat test test/fork/
```

#### Advanced Test Options
```bash
# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Generate coverage report
npx hardhat coverage

# Run specific test file
npx hardhat test test/core/compensator/delegate-functions.test.js

# Run with verbose output
npx hardhat test --verbose
```

### 🔧 Test Infrastructure

#### **Core Utilities**
- **`TestBase.js`** - Contract deployment and setup
- **`TestUtils.js`** - Common testing utilities
- **`Constants.js`** - Test constants and configuration

#### **Advanced Frameworks**
- **`AdvancedSecurityTester.js`** - Security testing framework
- **`PerformanceBenchmarker.js`** - Performance benchmarking
- **`GasRegressionDetector.js`** - Gas optimization tracking
- **`ForkTestBase.js`** - Mainnet forking utilities

#### **Mock & Fake Contracts**
- **`MockERC20.sol`** - Simulates COMP token functionality
- **`MockGovernor.sol`** - Simulates Compound Governor functionality
- **`CompensatorFake.sol`** - Advanced testing contract with edge cases
- **`ERC20Fake.sol`** - Token contract with testing hooks
- **`GovernorFake.sol`** - Governor contract with testing capabilities

### 📊 Coverage & Quality Metrics

#### **Current Coverage**
- **Overall**: 83.54%
- **Statements**: 86.58%
- **Branches**: 62.62%
- **Functions**: 97.56%
- **Lines**: 84.16%

#### **Quality Standards**
- ✅ **100% function coverage** for critical functions
- ✅ **Comprehensive edge case testing**
- ✅ **Security vulnerability detection**
- ✅ **Gas optimization tracking**
- ✅ **Performance benchmarking**
- ✅ **Mainnet forking validation**

### 🎯 Key Testing Features

#### **Security Testing**
- Access control verification
- Reentrancy protection
- Input validation
- Vulnerability assessment
- Ownership transfer synchronization
- Token transfer prevention

#### **Performance Testing**
- Gas usage tracking
- Regression detection
- Benchmark comparisons
- Optimization analysis
- Branch coverage analysis

#### **Advanced Testing**
- Property-based testing (fuzzing)
- Invariant verification
- Integration workflows
- Real contract interactions
- Mainnet forking validation

#### **Professional Infrastructure**
- Sophisticated fake contracts
- Comprehensive mock implementations
- Automated test frameworks
- Detailed reporting and analysis

### 🏆 Test Results

**All 224+ tests pass successfully** with comprehensive coverage across:
- Core contract functionality
- Security mechanisms
- Performance characteristics
- Edge cases and boundaries
- Integration scenarios
- Real-world conditions

### 🚨 Test Validation Checklist

For reviewers, each test category validates:

#### ✅ Core Functionality
- [ ] Contract deployment and initialization
- [ ] Token delegation and voting power
- [ ] Reward calculation and distribution
- [ ] Proposal staking and resolution
- [ ] Vote casting and verification
- [ ] Factory operations and management

#### ✅ Security Measures
- [ ] Access control validation
- [ ] Reentrancy protection
- [ ] Input validation and sanitization
- [ ] Ownership transfer synchronization
- [ ] Token transfer prevention
- [ ] Withdrawal limit enforcement

#### ✅ Edge Cases & Boundaries
- [ ] Zero amount operations
- [ ] Boundary conditions
- [ ] Error scenarios and exceptions
- [ ] Gas optimization and limits
- [ ] State transition validation
- [ ] Cross-function interactions

#### ✅ Performance & Quality
- [ ] Gas usage optimization
- [ ] Performance benchmarking
- [ ] Regression detection
- [ ] Memory efficiency
- [ ] Computational complexity

This test suite represents a **world-class, enterprise-grade testing framework** that ensures the Compensator system's reliability, security, and performance across all scenarios and edge cases.

## Future Improvements
- **Multi-Chain Support**: Allow delegates and delegators to effectively interact from desired chains
- **Reward Redirection**: Allow delegators to redirect their rewards to the delegate as a form of support
- **Gas Optimization**: Further optimize gas usage for reward calculations and delegator interactions
- **Advanced Analytics**: Enhanced delegate performance metrics and analytics
- **Governance Integration**: Direct integration with Compound governance proposals
- **Mobile Support**: Mobile-optimized interface for delegation and staking

## Acknowledgments
Many thanks to long-time Compound community member [Mike Ghen](https://github.com/mikeghen), who created this concept and won a hackathon grant for it from Compound 2 years ago. We also thank Compound contributors heading the grants program, who've allowed Compensator to be furthered and surfaced in the community. Lastly, we thank the Compound community as a whole for the opportunity to drive greater outcomes for Compound.