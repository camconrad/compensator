<p align="center">
  <img src="public/showcase-1.png" alt="Compensator" width=100%>
</p>

## Factory Address

| Network | Address |
|---------|---------|
| Mainnet | [#](https://etherscan.io/address/#) |

## Overview
Compensator is a dedicated delegate marketplace for the Compound DAO, designed to address low voter turnout and lack of incentivization in governance. It enables COMP holders to delegate voting power in exchange for transparent rewards, fostering greater participation in vote outcomes. Delegates attract voting power through competitive compensation, creating a vibrant and efficient governance ecosystem.

## Features

### 1. **Delegation and Rewards**
- Delegates supply COMP into the `Compensator` contract to fund rewards for delegators.
- Delegates set a reward rate (in COMP/second) to distribute rewards proportionally.
- COMP holders delegate votes to the delegate's `Compensator` contract.
- Delegators earn rewards based on their share of delegated COMP.

### 2. **Vote Compensation**
- Delegators can incentivize delegates to vote for or against specific proposals by staking COMP.
- After the delegate votes, the stake is distributed based on the outcome:
  - Delegators who staked for the winning option pass their stake to the delegate.
  - Delegators who staked for the losing option get their stake back.

### 3. **Delegation Cap**
- A 5% cap is enforced on the total COMP that can be delegated to a single delegate.
- This ensures no single delegate can accumulate excessive or malicious voting power.

See [Protocol Specs](https://github.com/camconrad/compensator/blob/main/contracts/README.md) for more detail.

## Workflow

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
│   └── deploy.ts           # Deployment scripts
└── ... other files
```

## Development Workflow

1. **Local Development**:
   - Use `npx hardhat node` to start a local Ethereum network
   - Deploy contracts using `npx hardhat run scripts/deploy.js --network localhost`

2. **Testing**:
   - Write tests in the `test/` directory
   - Run tests using `npx hardhat test`
   - Check coverage using `npx hardhat coverage`

3. **Deployment**:
   - Deploy to testnet: `npx hardhat run scripts/deploy.js --network goerli`
   - Deploy to mainnet: `npx hardhat run scripts/deploy.js --network mainnet`

## Common Issues and Solutions

1. **Test Failures**:
   - Ensure all dependencies are installed: `npm install`
   - Clear Hardhat cache: `npx hardhat clean`
   - Check test environment setup in `hardhat.config.js`

2. **Compilation Errors**:
   - Verify Solidity version matches in all contracts
   - Check import paths are correct
   - Ensure all dependencies are installed

3. **Gas Issues**:
   - Run with gas reporting: `REPORT_GAS=true npx hardhat test`
   - Check optimizer settings in `hardhat.config.js`

## Security Features
- **Proposal Tracking**: Active and pending proposals are tracked to ensure participation.
- **Delegation Cap**: A 5% cap ensures no single delegate can accumulate excessive voting power.
- **Pending Rewards**: Delegates cannot withdraw COMP that is reserved for pending rewards.
- **Transfer Restrictions**: The `Compensator` token cannot be transferred between users.
- **Lock Period**: A minimum 7-day lock period prevents early withdraw.

## Future Improvements
- **Multi-Chain Support**: Allow delegates and delegators to effectively interact from desired chains.
- **Reward Redirection**: Allow delegators to redirect their rewards to the delegate as a form of support.
- **Gas Optimization**: Further optimize gas usage for reward calculations and delegator interactions.

## Acknowledgments
Many thanks to long-time Compound community member [Mike Ghen](https://github.com/mikeghen), who created this concept and won a hackathon grant for it from Compound 2 years ago. We also thank Compound contributors heading the grants program, who've allowed Compensator to be furthered and surfaced in the community. Lastly, we thank the Compound community as a whole for the opportunity to drive greater outcomes for Compound.