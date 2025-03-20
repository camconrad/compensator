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
- `uint256 delegationCap` - The max COMP that can be delegated to this delegate (5% of total COMP supply).
- `mapping(address => uint256) claimedRewards` - Tracks the rewards claimed by each delegator.
- `mapping(address => uint256) startRewardIndex` - Tracks the starting reward index for each delegator.
- `struct ProposalStake` - Tracks stakes for proposals by delegators:
  - `uint256 forStake` - Amount staked "For" a proposal.
  - `uint256 againstStake` - Amount staked "Against" a proposal.
- `mapping(uint256 => mapping(address => ProposalStake)) proposalStakes` - Tracks the stakes of each delegator for a specific proposal.
- `mapping(uint256 => uint256) totalStakesFor` - Total stakes "For" a specific proposal.
- `mapping(uint256 => uint256) totalStakesAgainst` - Total stakes "Against" a specific proposal.

#### Events
- `DelegateDeposit` - Emitted when the delegate deposits COMP.
- `DelegateWithdraw` - Emitted when the delegate withdraws COMP.
- `RewardRateUpdate` - Emitted when the delegate updates the reward rate.
- `DelegatorDeposit` - Emitted when a delegator deposits COMP.
- `DelegatorWithdraw` - Emitted when a delegator withdraws COMP.
- `ProposalStake` - Emitted when a delegator stakes COMP for a proposal outcome.
- `ProposalStakeDistributed` - Emitted when a delegate distributes stakes after a proposal resolves.
- `ClaimRewards` - Emitted when a delegator claims their rewards.

#### Functions
- **`initialize(address _delegate, string memory _delegateName)`**  
  Initializes the contract with the delegate's address and name.  
  - Sets the delegation cap to 5% of the total COMP supply.
  - Delegates voting power to the delegate.

- **`delegateDeposit(uint256 amount)`**  
  Allows the delegate to deposit COMP into the contract for rewards distribution.  
  - Updates the reward index before depositing.

- **`delegateWithdraw(uint256 amount)`**  
  Allows the delegate to withdraw COMP from the contract.  
  - Ensures pending rewards are accounted for before withdrawal.

- **`setRewardRate(uint256 newRate)`**  
  Allows the delegate to set the reward rate (in COMP/second).  
  - Updates the reward index before setting the new rate.

- **`delegatorDeposit(uint256 amount)`**  
  Allows a delegator to delegate COMP to the delegate's `Compensator` contract.  
  - Enforces the 5% delegation cap.  
  - Updates the delegator's starting reward index.

- **`delegatorWithdraw(uint256 amount)`**  
  Allows a delegator to withdraw COMP from the contract.  
  - Automatically claims pending rewards on withdrawal.  
  - Updates the total delegated COMP.

- **`claimRewards()`**  
  Allows a delegator to claim their pending rewards.  
  - Updates the reward index and transfers rewards to the delegator.

- **`stakeForProposal(uint256 proposalId, uint8 support, uint256 amount)`**  
  Allows a delegator to stake COMP on a proposal.  
  - `support`: 0 = Against, 1 = For.  
  - Updates the total stakes for or against the proposal.

- **`distributeStakes(uint256 proposalId, uint8 winningSupport)`**  
  Allows the delegate to distribute staked COMP after a proposal resolves.  
  - Transfers staked COMP to the delegate or back to delegators based on the outcome.  
  - Emits the `ProposalStakeDistributed` event.

- **`getPendingRewards(address delegator)`**  
  Returns the amount of pending rewards for a delegator.  
  - Calculates rewards based on the current reward index and the delegator's starting index.

- **`rewardsUntil()`**  
  Returns the timestamp until which rewards will be distributed.  
  - Calculates the timestamp based on the remaining rewards and the reward rate.

### Additional Notes
- **Transfer Function Overrides**:  
  The `transfer` and `transferFrom` functions are overridden to revert with an error message. Transfers of the Compensator token are disabled to ensure proper tracking of delegations and rewards.

- **Dynamic Delegation Cap**:  
  The delegation cap is set to 5% of the total COMP supply during initialization. If the total COMP supply changes (e.g., due to minting or burning), the delegation cap will not be updated dynamically. This should be considered a limitation unless a mechanism is added to update the cap.

- **Zero Reward Rate Handling**:  
  The `_updateRewardsIndex` function includes logic to handle cases where the reward rate is zero, preventing division by zero errors.

- **Proposal Stakes Cleanup**:  
  After distributing stakes for a proposal, the `proposalStakes` mapping updates to reflect that the stakes have been distributed.