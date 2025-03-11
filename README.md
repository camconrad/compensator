# Compensator

## Overview
Compensator is a dedicated delegate marketplace for the Compound DAO, designed to address low voter turnout and lack of incentivization in governance. It enables COMP holders to delegate voting power in exchange for transparent rewards, fostering greater participation in vote outcomes. Delegates attract voting power through competitive compensation, creating a vibrant and efficient governance ecosystem.

## Features

### 1. **Delegation and Rewards**
- Delegates supply COMP into the `Compensator` contract to fund rewards for delegators.
- Delegates set a reward rate (in COMP/second) to distribute rewards proportionally.
- COMP holders delegate votes to the delegate's `Compensator` contract and earn rewards based on their share of the total delegated COMP.

### 2. **Vote Compensation**
- Delegators can incentivize delegates to vote for or against specific proposals by staking COMP.
- After the delegate votes, the stake is distributed based on the outcome:
  - Delegators who staked for the winning option pass their stake to the delegate.
  - Delegators who staked for the losing option get their stake back.

### 3. **Delegation Cap**
- A 5% cap is enforced on the total COMP that can be delegated to a single delegate.
- This ensures no single delegate can accumulate excessive or malicious voting power.

## Protocol Specs

### `CompensatorFactory`

#### Variables
- `address[] public compensators` - A list of all `Compensator` contracts created by the factory.
- `mapping(address => address) public delegateeToCompensator` - A mapping of delegatees to their `Compensator` contracts.

#### Functions
- **`createCompensator(address delegatee, string memory delegateeName)`**  
  Creates a `Compensator` contract for a delegatee.  
  - Adds the contract to the `compensators` list.  
  - Maps the delegatee to their `Compensator` contract.  
  - Returns the address of the new `Compensator` contract.

- **`getCompensator(address delegatee)`**  
  Returns the `Compensator` contract address for a given delegatee.

- **`getCompensators()`**  
  Returns an array of all deployed `Compensator` contract addresses.

### `Compensator`

#### Variables
- `address delegate` - The address of the delegate.
- `string delegateName` - The name of the delegate.
- `uint256 availableRewards` - The amount of COMP available for rewards.
- `uint256 rewardRate` - The reward rate in COMP/second.
- `uint256 rewardIndex` - Tracks the distribution of rewards over time.
- `uint256 lastRewarded` - Timestamp of the last reward distribution.
- `uint256 totalDelegatedCOMP` - Total COMP delegated to this delegate.
- `uint256 delegationCap` - The maximum COMP that can be delegated to this delegate (5% of total COMP supply).
- `mapping(address => uint) claimedRewards` - Tracks the rewards claimed by each delegator.
- `mapping(address => uint) startRewardIndex` - Tracks the starting reward index for each delegator.

#### Events
- `DelegateDeposit` - Emitted when the delegate deposits COMP.
- `DelegateWithdraw` - Emitted when the delegate withdraws COMP.
- `RewardRateUpdate` - Emitted when the delegate updates the reward rate.
- `DelegatorDeposit` - Emitted when a delegator deposits COMP.
- `DelegatorWithdraw` - Emitted when a delegator withdraws COMP.
- `ClaimRewards` - Emitted when a delegator claims their rewards.

#### Functions
- **`initialize(address _delegate, string memory _delegateName)`**  
  Initializes the contract with the delegate's address and name.  
  - Sets the delegation cap to 5% of the total COMP supply.

- **`delegateDeposit(uint256 amount)`**  
  Allows the delegate to deposit COMP into the contract for rewards distribution.

- **`delegateWithdraw(uint256 amount)`**  
  Allows the delegate to withdraw COMP from the contract, ensuring pending rewards are accounted for.

- **`setRewardRate(uint256 newRate)`**  
  Allows the delegate to set the reward rate (in COMP/second).

- **`delegatorDeposit(uint256 amount)`**  
  Allows a delegator to delegate COMP to the delegate's `Compensator` contract.  
  - Enforces the 5% delegation cap.

- **`delegatorWithdraw(uint256 amount)`**  
  Allows a delegator to withdraw COMP from the contract.  
  - Automatically claims pending rewards on withdrawal.

- **`claimRewards()`**  
  Allows a delegator to claim their pending rewards.

- **`getPendingRewards(address delegator)`**  
  Returns the amount of pending rewards for a delegator.

- **`rewardsUntil()`**  
  Returns the timestamp until which rewards will be distributed.

## Workflow

### For Delegates
1. **Create Compensator**: Use the `CompensatorFactory` to create a `Compensator` contract.
2. **Supply COMP**: Supply COMP into the contract to fund rewards for delegators.
3. **Set Rate**: Define the reward rate (in COMP/second) to distribute rewards.
4. **Withdraw COMP**: Withdraw unused COMP, ensuring pending rewards are reserved.

### For Delegators
1. **Delegate COMP**: Delegate COMP to delegate's `Compensator` contract to start earning rewards.
2. **Update Delegation**: Update or withdraw COMP delegation to automatically claim any pending rewards.
3. **Claim Rewards**: Claim your earned COMP rewards at any time.

## Security Features
- **Delegation Cap**: A 5% cap ensures no single delegate can accumulate excessive voting power.
- **Pending Rewards Protection**: Delegates cannot withdraw COMP that is reserved for pending rewards.
- **Transfer Restrictions**: The `Compensator` token cannot be transferred between users, ensuring rewards are tied to the original delegator.

## Events
- **`DelegateDeposit`**: Tracks COMP deposits by the delegate.
- **`DelegateWithdraw`**: Tracks COMP withdrawals by the delegate.
- **`RewardRateUpdate`**: Tracks updates to the reward rate.
- **`DelegatorDeposit`**: Tracks COMP deposits by delegators.
- **`DelegatorWithdraw`**: Tracks COMP withdrawals by delegators.
- **`ClaimRewards`**: Tracks reward claims by delegators.

## Future Improvements
- **Multi-Chain Support**: Allow delegates and delegators to effectively interact from desired chains.
- **Reward Redirection**: Allow delegators to redirect their rewards to the delegate as a form of support.
- **Gas Optimization**: Further optimize gas usage for reward calculations and delegator interactions.

## Thanks We Owe
Many thanks to long-time Compound community member [Mike Ghen](https://github.com/mikeghen), who created this concept and won a hackathon grant for it from Compound 2 years ago. We also thank Compound contributors heading the grants program, who've allowed Compensator to be furthered and surfaced in the community. Lastly, we thank the Compound community as a whole for the opportunity to drive greater outcomes for Compound.

## License
This project is licensed under the GNU General Public License.
