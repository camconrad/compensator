<p align="center">
  <img src="public/showcase-1.png" alt="Compensator" width=100%>
</p>

## Factory Address

| Network | Address |
|---------|---------|
| Mainnet | [#](https://etherscan.io/address/#) |

## Overview
Compensator is a dedicated delegate marketplace for the Compound DAO, designed to address low voter turnout and lack of incentivization in governance. It enables COMP holders to delegate voting power in exchange for transparent rewards, fostering greater participation in vote outcomes. Delegates attract voting power through competitive compensation, creating a vibrant and efficient governance ecosystem.

## Core Features

### 1. **Delegation and Rewards**
- Delegates supply COMP into the `Compensator` contract to fund rewards for delegators.
- Delegates set a reward rate (in COMP/second) to distribute rewards proportionally.
- COMP holders delegate votes to the delegate's `Compensator` contract.
- Delegators earn rewards based on their share of delegated COMP.

### 2. **Vote Compensation**
- Delegators can incentivize delegates to vote for or against proposals by staking COMP.
- After the delegate votes, the stake is distributed based on the outcome:
  - If delegate voted correctly:
    - Delegators who staked for the winning option pass their stake to the delegate
    - Delegators who staked for the losing option get their stake back
  - If delegate didn't vote or voted wrong:
    - All delegators get their stakes back
- The system verifies delegate voting through the Compound Governor contract:
  - Checks if the delegate has voted on the proposal
  - Verifies vote direction through on-chain transaction records
  - Only distributes winning stakes if delegate voted in the winning direction
  - Automatically resolves proposals after 30 days if not resolved

See [Protocol Specs](https://github.com/camconrad/compensator/blob/main/contracts/README.md) for more detail.

## User Workflow

### For Delegates
1. **Create Compensator**: The `CompensatorFactory` creates a `Compensator` contract.
2. **Supply COMP**: Supply COMP into the `Compensator` contract to fund delegator rewards.
3. **Set Reward**: Define the reward rate (in COMP per second) to distribute rewards.
4. **Withdraw COMP**: Withdraw unused COMP as needed (pending rewards reserved).

### For Delegators
1. **Delegate COMP**: Delegate COMP to a delegate's `Compensator` contract to start earning.
2. **Stake COMP**: Stake COMP to trade on potential vote outcomes such as for or against.
3. **Update Delegation**: Update or withdraw COMP delegation to claim pending rewards.
4. **Claim Rewards**: Claim your proportionally accrued COMP rewards at any time.

## Project Structure

```
├── contracts/
│   ├── Compensator.sol       # Main contract
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
- **Proposal Tracking**: Active and pending proposals are tracked to ensure participation.
- **Trustless Resolution**: Proposal outcomes are determined by the Compound Governor's state.
- **Delegation Cap**: A 5% cap ensures no single delegate can accumulate excessive voting power.
- **Pending Rewards**: Delegates cannot withdraw COMP that is reserved for pending rewards.
- **Transfer Restrictions**: The `Compensator` token cannot be transferred between users.
- **Reward Preservation**: Rewards are preserved during deposits and withdrawals, ensuring fair distribution.
- **Vote Verification**: System verifies delegate voting through on-chain transaction records.
- **Vote Direction Check**: Ensures delegate voted in the winning direction before distributing stakes.
- **Auto-Resolution**: Proposals automatically resolve after 30 days, preventing stuck stakes.
- **State Tracking**: Comprehensive tracking of proposal states and delegate voting status.
- **Timeout Protection**: Proposals auto-resolve after 30 days to prevent stuck stakes.
- **Vote Verification**: Delegates must vote correctly to receive winning stakes.
- **Lock Period**: A minimum 7-day lock period prevents gaming withdrawals.
- **Precision Safeguards**: Uses consistent precision in calculations.

## Future Improvements
- **Multi-Chain Support**: Allow delegates and delegators to effectively interact from desired chains.
- **Reward Redirection**: Allow delegators to redirect their rewards to the delegate as a form of support.
- **Gas Optimization**: Further optimize gas usage for reward calculations and delegator interactions.

## Acknowledgments
Many thanks to long-time Compound community member [Mike Ghen](https://github.com/mikeghen), who created this concept and won a hackathon grant for it from Compound 2 years ago. We also thank Compound contributors heading the grants program, who've allowed Compensator to be furthered and surfaced in the community. Lastly, we thank the Compound community as a whole for the opportunity to drive greater outcomes for Compound.