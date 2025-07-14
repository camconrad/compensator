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
│   ├── Compensator.sol       # Main contract with delegation and staking
│   ├── CompensatorFactory.sol # Factory for deploying Compensator instances
│   ├── IComp.sol            # COMP token interface
│   ├── IGovernor.sol        # Governor interface
│   └── mocks/               # Mock contracts for testing
│       ├── MockERC20.sol    # Mock COMP token
│       └── MockGovernor.sol # Mock Compound Governor
├── test/
│   ├── Compensator.test.js  # Main test suite
│   └── CompensatorFactory.test.js
├── scripts/
│   └── deploy.js           # Deployment scripts
└── ... other files
```

## Development Workflow

1. **Setup**:
   ```bash
   # Install dependencies
   npm install
   
   # Install additional test dependencies
   npm install --save-dev @nomicfoundation/hardhat-network-helpers
   ```

2. **Local Development**:
   ```bash
   # Start local Ethereum network
   npx hardhat node
   
   # Deploy contracts locally
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. **Testing**:
   ```bash
   # Run all tests
   npx hardhat test
   
   # Run tests with gas reporting
   REPORT_GAS=true npx hardhat test
   
   # Run specific test file
   npx hardhat test test/Compensator.test.js
   
   # Check test coverage
   npx hardhat coverage
   ```

4. **Deployment**:
   ```bash
   # Deploy to testnet
   npx hardhat run scripts/deploy.js --network goerli
   
   # Deploy to mainnet
   npx hardhat run scripts/deploy.js --network mainnet
   ```

5. **Verification**:
   ```bash
   # Verify contract on Etherscan
   npx hardhat verify --network <network> <contract-address> <constructor-args>
   ```

## Common Issues and Solutions

1. **Test Failures**:
   - Ensure all dependencies are installed: `npm install`
   - Clear Hardhat cache: `npx hardhat clean`
   - Check test environment setup in `hardhat.config.js`
   - Verify mock contracts are properly deployed
   - Check for proper signer setup in tests

2. **Compilation Errors**:
   - Verify Solidity version matches in all contracts (0.8.21)
   - Check import paths are correct
   - Ensure all dependencies are installed
   - Clear Hardhat cache if needed: `npx hardhat clean`

3. **Gas Issues**:
   - Run with gas reporting: `REPORT_GAS=true npx hardhat test`
   - Check optimizer settings in `hardhat.config.js`
   - Review gas optimization in contract code
   - Monitor gas usage in tests

4. **Network Issues**:
   - Ensure proper network configuration in `hardhat.config.js`
   - Check RPC endpoint availability
   - Verify network connection: `npx hardhat node`
   - Check for proper network selection in deployment scripts

5. **Deployment Issues**:
   - Verify constructor arguments match contract requirements
   - Check for sufficient gas and ETH on deployment account
   - Ensure proper network configuration
   - Verify contract verification parameters

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
- **Timeout protection**: Proposals auto-resolve after 30 days to prevent stuck stakes

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