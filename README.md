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
│   ├── IComp.sol             # COMP token interface
│   ├── IGovernor.sol         # Governor interface
│   └── ... other contracts
├── test/
│   └── Compensator.test.js   # Tests for Compensator contract
└── ... other files
```

## Setup and Installation

1. Clone the repository:
```bash
git clone https://github.com/camconrad/compensator.git
cd compensator
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
ALCHEMY_API_KEY=your_alchemy_api_key
PRIVATE_KEY=your_private_key_for_testing
```

## Compiling Contracts

To compile the smart contracts:

```bash
npx hardhat compile
```

This will compile all contracts in the `contracts/` directory and generate artifacts in the `artifacts/` directory.

## Running Tests

The test suite uses mock contracts to simulate the Compound Governor and COMP token, ensuring reliable and deterministic testing. To run the tests:

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/Compensator.test.js

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test
```

The test suite includes:
- Core functionality tests
- Lock period and proposal state tests
- Edge cases and error handling
- Staking function tests
- Multiple delegator interaction tests

## Test Coverage

To generate and view test coverage:

```bash
# Generate coverage report
npx hardhat coverage

# View coverage report
open coverage/index.html
```

## Hardhat Configuration

The project uses a standard Hardhat configuration. Make sure your `hardhat.config.ts` includes:

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "hardhat-gas-reporter";
import "solidity-coverage";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.21",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  }
};

export default config;
```

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
└── ... other files
```

## Development Workflow

1. **Local Development**:
   - Use `npx hardhat node` to start a local Ethereum network
   - Deploy contracts using `npx hardhat run scripts/deploy.ts --network localhost`

2. **Testing**:
   - Write tests in the `test/` directory
   - Run tests using `npx hardhat test`
   - Check coverage using `npx hardhat coverage`

3. **Deployment**:
   - Deploy to testnet: `npx hardhat run scripts/deploy.ts --network goerli`
   - Deploy to mainnet: `npx hardhat run scripts/deploy.ts --network mainnet`

## Common Issues and Solutions

1. **Test Failures**:
   - Ensure all dependencies are installed: `npm install`
   - Clear Hardhat cache: `npx hardhat clean`
   - Check test environment setup in `hardhat.config.ts`

2. **Compilation Errors**:
   - Verify Solidity version matches in all contracts
   - Check import paths are correct
   - Ensure all dependencies are installed

3. **Gas Issues**:
   - Run with gas reporting: `REPORT_GAS=true npx hardhat test`
   - Check optimizer settings in `hardhat.config.ts`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## Security Features
- **Delegation Cap**: A 5% cap ensures no single delegate can accumulate excessive voting power.
- **Pending Rewards**: Delegates cannot withdraw COMP that is reserved for pending rewards.
- **Transfer Restrictions**: The `Compensator` token cannot be transferred between users.

## Future Improvements
- **Multi-Chain Support**: Allow delegates and delegators to effectively interact from desired chains.
- **Reward Redirection**: Allow delegators to redirect their rewards to the delegate as a form of support.
- **Gas Optimization**: Further optimize gas usage for reward calculations and delegator interactions.

## Acknowledgments
Many thanks to long-time Compound community member [Mike Ghen](https://github.com/mikeghen), who created this concept and won a hackathon grant for it from Compound 2 years ago. We also thank Compound contributors heading the grants program, who've allowed Compensator to be furthered and surfaced in the community. Lastly, we thank the Compound community as a whole for the opportunity to drive greater outcomes for Compound.