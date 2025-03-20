<p align="center">
  <img src="public/showcase.png" alt="Compensator" width=100%>
</p>

## Factory Address

| Network | Address |
|---------|---------|
| Mainnet | [0xE76632FF20e31ac970CEBA307375C5A4f89a32fC](https://etherscan.io/address/0xE76632FF20e31ac970CEBA307375C5A4f89a32fC) |

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