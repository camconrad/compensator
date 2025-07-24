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

## Project Structure

```
├── contracts/
│   ├── Compensator.sol              # Main contract with delegation and staking
│   ├── CompensatorFactory.sol       # Factory for deploying instances
│   ├── IComp.sol                    # COMP token interface
│   ├── IGovernor.sol                # Governor interface
│   ├── ICompensator.sol             # Compensator interface
│   └── mocks/                       # Mock contracts for testing
├── test/
│   ├── Compensator.test.js          # Core contract functionality tests
│   ├── CompensatorFactory.test.js   # Factory deployment and management
├── scripts/
│   ├── deploy.ts                    # Main deployment script
│   └── verify-compensators.ts       # Contract verification script
└── ... other files
```

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

The test suite is organized into multiple layers for comprehensive coverage. Each test layer can be run independently for focused review:

### Test Layers

#### 1. Core Contract Tests (`Compensator.test.js`)
Tests the main Compensator contract functionality:
```bash
npx hardhat test test/Compensator.test.js
```
**Covers**: Token delegation, reward distribution, proposal staking, vote verification, access control

#### 2. Factory Tests (`CompensatorFactory.test.js`)
Tests the CompensatorFactory deployment and management:
```bash
npx hardhat test test/CompensatorFactory.test.js
```
**Covers**: Factory deployment, compensator creation, owner mapping, pagination

#### 3. Ownership Transfer Tests (`OwnershipTransfer.test.js`)
Tests the ownership transfer security fix:
```bash
npx hardhat test test/OwnershipTransfer.test.js
```
**Covers**: Factory synchronization, callback mechanism, event emission, edge cases

#### 4. Security Fixes Tests (`SecurityFixes.test.js`)
Tests specific security vulnerability fixes:
```bash
npx hardhat test test/SecurityFixes.test.js
```
**Covers**: Token transfer prevention, withdrawal limits, reentrancy protection

### Setup for Independent Testing

#### Prerequisites
```bash
# Install dependencies
npm install

# Install test dependencies
npm install --save-dev @nomicfoundation/hardhat-network-helpers
npm install --save-dev @nomicfoundation/hardhat-chai-matchers
npm install --save-dev chai
```

#### Environment Setup
```bash
# Clear cache and compile
npx hardhat clean
npx hardhat compile
```

### Running Tests

```bash
# Run all tests
npx hardhat test

# Run specific test layer
npx hardhat test test/Compensator.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Generate coverage report
npx hardhat coverage
```

### Test Validation Checklist

For reviewers, each test layer validates:

#### ✅ Core Functionality
- [ ] Contract deployment and initialization
- [ ] Token delegation and voting power
- [ ] Reward calculation and distribution
- [ ] Proposal staking and resolution
- [ ] Vote casting and verification

#### ✅ Security Measures
- [ ] Ownership transfer synchronization
- [ ] Token transfer prevention
- [ ] Reentrancy protection
- [ ] Access control validation
- [ ] Withdrawal limit enforcement

#### ✅ Edge Cases
- [ ] Zero amount operations
- [ ] Boundary conditions
- [ ] Error scenarios
- [ ] Gas optimization

### Mock Contracts
- **MockERC20.sol**: Simulates COMP token functionality
- **MockGovernor.sol**: Simulates Compound Governor functionality

### Deployment
```bash
# Deploy to testnet/mainnet
npx hardhat run scripts/deploy.ts --network <network>

# Verify contracts
npx hardhat verify --network <network> <contract-address> <constructor-args>
```

## Troubleshooting

### Common Issues
- **Test Failures**: Clear cache with `npx hardhat clean` and reinstall dependencies
- **Compilation Errors**: Verify Solidity version (0.8.21) and import paths
- **Gas Issues**: Run `REPORT_GAS=true npx hardhat test` for detailed analysis
- **Network Issues**: Check RPC endpoints and network configuration
- **Deployment Issues**: Verify constructor arguments and account balance

## Security Features

### **Factory Pattern Security**
- **Isolated instances**: Each user gets their own Compensator contract
- **Owner verification**: Factory validates owner addresses before deployment
- **Duplicate prevention**: Users can only have one Compensator instance

### **Proposal and Voting Security**
- **Proposal tracking**: Active and pending proposals are tracked to ensure participation
- **Trustless resolution**: Proposal outcomes are determined by the Compound Governor's state
- **Vote verification**: Multi-layered verification through on-chain transaction records
- **Vote direction check**: Ensures delegate voted in the winning direction before distributing stakes
- **Auto-resolution**: Proposals automatically resolve after 30 days, preventing stuck stakes
- **State tracking**: Comprehensive tracking of proposal states and delegate voting status

### **Delegation and Reward Security**
- **Delegation cap**: A 5% cap ensures no single delegate can accumulate excessive voting power
- **Pending rewards protection**: Delegates cannot withdraw COMP that is reserved for pending rewards
- **Transfer restrictions**: The `Compensator` token cannot be transferred between users
- **Reward preservation**: Rewards are preserved during deposits and withdrawals, ensuring fair distribution
- **Lock period**: A minimum 7-day lock period prevents gaming withdrawals
- **Precision safeguards**: Uses consistent precision in calculations

### **Staking and Distribution Security**
- **Reentrancy protection**: State variable caching prevents reentrancy attacks
- **Stake validation**: Only active proposals can be staked on
- **Outcome verification**: Stakes are distributed based on verified proposal outcomes
- **Delegate performance tracking**: Transparent tracking of voting success rates
- **Gas optimization**: Early returns and efficient data structures prevent excessive gas usage

### **Additional Security Measures**
- **Ownable pattern**: Uses OpenZeppelin's Ownable for access control
- **SafeERC20**: Uses OpenZeppelin's SafeERC20 for safe token transfers
- **ReentrancyGuard**: Prevents reentrancy attacks on critical functions
- **Event tracking**: Comprehensive event emission for transparency
- **State validation**: Multiple validation checks ensure contract integrity

## Future Improvements
- **Multi-Chain Support**: Allow delegates and delegators to effectively interact from desired chains
- **Reward Redirection**: Allow delegators to redirect their rewards to the delegate as a form of support
- **Gas Optimization**: Further optimize gas usage for reward calculations and delegator interactions
- **Advanced Analytics**: Enhanced delegate performance metrics and analytics
- **Governance Integration**: Direct integration with Compound governance proposals
- **Mobile Support**: Mobile-optimized interface for delegation and staking

## Acknowledgments
Many thanks to long-time Compound community member [Mike Ghen](https://github.com/mikeghen), who created this concept and won a hackathon grant for it from Compound 2 years ago. We also thank Compound contributors heading the grants program, who've allowed Compensator to be furthered and surfaced in the community. Lastly, we thank the Compound community as a whole for the opportunity to drive greater outcomes for Compound.