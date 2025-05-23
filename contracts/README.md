# Protocol Specs

## CompensatorFactory

### Variables
- `address[] public compensators` - A list of all `Compensator` contracts created by the factory.
- `mapping(address delegatee => address compensator) public delegateeToCompensator` - A mapping of delegatees to their `Compensator` contracts.

### Functions
- **`createCompensator(address delegatee, string memory delegateeName)`**  
  Creates a `Compensator` contract for a delegatee.  
  - Adds the contract to the `compensators` list.  
  - Maps the delegatee to their `Compensator` contract.  
  - Returns the address of the new `Compensator` contract.

- **`getCompensatorsCount()`**  
  Returns the total number of deployed Compensator contracts.

- **`getCompensators(uint256 offset, uint256 limit)`**  
  Returns a paginated list of Compensator contract addresses.

## Compensator

### Variables
- `address delegate` - The address of the delegate.
- `string delegateName` - The name of the delegate.
- `uint256 availableRewards` - The amount of COMP available for rewards.
- `uint256 rewardRate` - The reward rate in COMP/second.
- `uint256 rewardIndex` - Tracks the distribution of rewards over time.
- `uint256 lastRewarded` - Timestamp of the last reward distribution.
- `uint256 totalDelegatedCOMP` - Total COMP delegated to this delegate.
- `uint256 delegationCap` - The max COMP that can be delegated to this delegate (5% of total COMP supply).
- `uint256 totalPendingRewards` - Total pending rewards for all delegators that have been accrued but not yet claimed.
- `uint256 rewardsDeficit` - Tracks the total rewards deficit when availableRewards was insufficient.
- `uint256 constant MIN_LOCK_PERIOD` - Minimum lock period for delegated COMP (7 days).
- `mapping(address delegator => uint256 timestamp) public unlockTime` - Tracks when each delegator's COMP will be unlocked.
- `uint256 latestProposalId` - Latest proposal ID that has been seen.
- `mapping(uint256 proposalId => bool isActive) public activeProposals` - Tracks active proposals.
- `mapping(uint256 proposalId => bool isPending) public pendingProposals` - Tracks proposals that are about to start (within 1 day).
- `mapping(address delegator => uint256 amount) public unclaimedRewards` - Tracks previously accrued but unclaimed rewards for each delegator.
- `mapping(address delegator => uint256 index) public startRewardIndex` - Tracks the starting reward index for each delegator to calculate pending rewards.
- `mapping(uint256 proposalId => uint256 timestamp) public proposalCreationTime` - Tracks when each proposal was created.
- `uint256 constant MAX_PROPOSAL_RESOLUTION_TIME` - Maximum time a proposal can remain unresolved (30 days).
- `mapping(uint256 proposalId => bool hasVoted) public delegateVoted` - Tracks whether the delegate has voted on a proposal.
- `mapping(uint256 proposalId => uint8 direction) public delegateVoteDirection` - Tracks the delegate's vote direction on a proposal.
- `struct ProposalStake` - Structure to track individual delegator stakes on proposals:
  - `uint256 forStake` - Amount staked in support of a proposal.
  - `uint256 againstStake` - Amount staked against a proposal.
- `mapping(uint256 proposalId => mapping(address delegator => ProposalStake stake)) public proposalStakes` - Mapping to track stakes for each proposal by each delegator.
- `mapping(uint256 proposalId => uint256 amount) public totalStakesFor` - Total stakes "For" each proposal.
- `mapping(uint256 proposalId => uint256 amount) public totalStakesAgainst` - Total stakes "Against" each proposal.
- `mapping(uint256 proposalId => uint8 outcome) public proposalOutcomes` - Tracks the outcome of each proposal (0 = not resolved, 1 = For won, 2 = Against won).

### Events
- `DelegateDeposit(address indexed delegate, uint256 amount)` - Emitted when the delegate deposits COMP.
- `DelegateWithdraw(address indexed delegate, uint256 amount)` - Emitted when the delegate withdraws COMP.
- `RewardRateUpdate(address indexed delegate, uint256 newRate)` - Emitted when the delegate updates the reward rate.
- `DelegatorDeposit(address indexed delegator, uint256 amount)` - Emitted when a delegator deposits COMP.
- `DelegatorWithdraw(address indexed delegator, uint256 amount)` - Emitted when a delegator withdraws COMP.
- `ProposalStaked(address indexed staker, uint256 proposalId, uint8 support, uint256 amount)` - Emitted when a delegator stakes COMP for a proposal outcome.
- `ProposalStakeDistributed(uint256 proposalId, uint8 winningSupport)` - Emitted when stakes are distributed after a proposal resolves.
- `ClaimRewards(address indexed delegator, uint256 amount)` - Emitted when a delegator claims their rewards.
- `LosingStakeReclaimed(address indexed delegator, uint256 proposalId, uint256 amount)` - Emitted when a delegator reclaims their losing stake after a proposal is resolved.
- `COMPLocked(address indexed delegator, uint256 unlockTime)` - Emitted when a delegator's COMP is locked.
- `NewProposalDetected(uint256 indexed proposalId)` - Emitted when a new proposal is detected.
- `ProposalActivated(uint256 indexed proposalId)` - Emitted when a proposal is marked as active.
- `ProposalDeactivated(uint256 indexed proposalId)` - Emitted when a proposal is marked as inactive.
- `ProposalAutoResolved(uint256 indexed proposalId, uint8 winningSupport)` - Emitted when a proposal is automatically resolved after timeout.
- `DelegateVotingVerified(uint256 indexed proposalId, bool hasVoted, uint8 voteDirection)` - Emitted when delegate voting status is verified.
- `UserRewardsUpdated(address indexed delegator, uint256 newRewards, uint256 totalUnclaimed)` - Emitted when a user's rewards are updated.
- `RewardIndexUpdated(uint256 newRewardIndex, uint256 rewardsAccrued, uint256 rewardsDeficit)` - Emitted when the global reward index is updated.

### Functions
- **`constructor(address _delegate, string memory _delegateName)`**  
  Initializes the contract with the delegate's address and name.  
  - Sets the delegation cap to 5% of the total COMP supply.
  - Delegates voting power to the delegate.
  - Initializes the reward index at 1e18.
  - Sets the delegate and delegateName as immutable variables.

- **`delegateDeposit(uint256 amount)`**  
  Allows the delegate to deposit COMP into the contract for rewards distribution.  
  - Requires amount to be greater than 0.
  - Transfers COMP from the delegate to the contract.
  - Updates available rewards.
  - Updates the reward index.
  - Emits a `DelegateDeposit` event.

- **`delegateWithdraw(uint256 amount)`**  
  Allows the delegate to withdraw COMP from the contract.  
  - Requires amount to be greater than 0.
  - Updates the reward index before withdrawal.
  - Ensures that the withdrawable amount is sufficient (availableRewards - totalPendingRewards).
  - Transfers COMP to the delegate.
  - Emits a `DelegateWithdraw` event.

- **`setRewardRate(uint256 newRate)`**  
  Allows the delegate to set the reward rate (in COMP/second).  
  - Requires new rate to be non-negative.
  - Requires new rate to be different from current rate.
  - Updates the reward index before setting the new rate.
  - Emits a `RewardRateUpdate` event.

- **`delegatorDeposit(uint256 amount)`**  
  Allows a delegator to delegate COMP to the delegate's `Compensator` contract.  
  - Requires amount to be greater than 0.
  - Enforces the delegation cap (totalDelegatedCOMP + amount <= delegationCap).
  - Updates the global reward index.
  - Updates the user's reward state to preserve existing rewards.
  - Transfers COMP from the delegator to the contract.
  - Mints Compensator tokens to the delegator.
  - Updates totalDelegatedCOMP.
  - Sets the user's starting reward index.
  - Sets unlock time based on active/pending proposals:
    - Base: current timestamp + MIN_LOCK_PERIOD
    - If active/pending proposals exist: current timestamp + MIN_LOCK_PERIOD + 3 days
  - Emits a `DelegatorDeposit` event.
  - Emits a `COMPLocked` event with the unlock time.

- **`delegatorWithdraw(uint256 amount)`**  
  Allows a delegator to withdraw COMP from the contract.  
  - Requires amount to be greater than 0.
  - Requires current timestamp >= unlockTime[delegator].
  - Requires no active or pending proposals.
  - Updates the reward index.
  - Updates the user's rewards before processing the withdrawal.
  - Burns Compensator tokens from the delegator.
  - Transfers COMP to the delegator.
  - Updates totalDelegatedCOMP.
  - Updates the user's starting reward index.
  - Emits a `DelegatorWithdraw` event.

- **`claimRewards()`**  
  Allows a delegator to claim their pending rewards.  
  - Updates the global and user-specific reward state.
  - Requires that the user has rewards to claim.
  - Resets the user's unclaimed rewards to zero.
  - Updates the user's starting reward index.
  - Transfers rewards to the delegator.
  - Emits a `ClaimRewards` event.

- **`stakeForProposal(uint256 proposalId, uint8 support, uint256 amount)`**  
  Allows a delegator to stake COMP on a proposal.  
  - Requires support to be 0 (Against) or 1 (For).
  - Requires amount to be greater than 0.
  - Requires the proposal to not already be resolved.
  - Requires the proposal to be in an Active state in the Governor contract.
  - Updates latest proposal ID and tracks proposal state.
  - Records proposal creation time if not already set.
  - Transfers COMP from the delegator to the contract.
  - Updates the delegator's proposal stakes and total stakes.
  - Emits a `ProposalStaked` event.

- **`resolveProposal(uint256 proposalId)`**  
  Allows anyone to resolve a proposal and distribute stakes based on the actual outcome.  
  - Requires the proposal to not already be resolved.
  - Requires the proposal to be in a resolved state in the Compound Governor.
  - Verifies if the delegate has voted and their vote direction.
  - Determines the winning support based on the proposal's actual outcome.
  - Records the proposal outcome.
  - Transfers winning stakes to the delegate if they voted correctly.
  - Emits a `ProposalStakeDistributed` event.
  - Emits a `DelegateVotingVerified` event.

- **`reclaimLosingStake(uint256 proposalId)`**  
  Allows delegators to reclaim their losing stake after a proposal is resolved.  
  - Checks if the proposal needs to be auto-resolved due to timeout.
  - Requires the proposal to be resolved.
  - Determines the winning side and the amount to return.
  - Updates the delegator's proposal stakes and total stakes.
  - Transfers the losing stake back to the delegator.
  - Emits a `LosingStakeReclaimed` event.

- **`getPendingRewards(address delegator)`**  
  Returns the amount of pending rewards for a delegator.  
  - Includes both stored unclaimed rewards and newly accrued rewards.
  - For previously accrued rewards, uses the stored unclaimedRewards value.
  - For newly accrued rewards, calculates based on the current reward index and the delegator's starting index.
  - Returns the total pending rewards.

- **`rewardsUntil()`**  
  Returns the timestamp until which rewards will be distributed.  
  - If reward rate is 0, returns the lastRewarded timestamp.
  - Otherwise, calculates the total time needed to distribute:
    - Current available rewards (if any)
    - Any accumulated rewards deficit
  - Returns lastRewarded + time needed for all rewards

### Internal Functions
- **`_updateUserRewards(address delegator)`**  
  Internal function to checkpoint a user's rewards.  
  - Calculates newly accrued rewards since the last checkpoint.
  - Adds these rewards to the user's unclaimed rewards balance.
  - Called before any action that changes a user's stake or reward state.

- **`_updateRewardsIndex()`**  
  Internal function to update the global reward state.  
  - Early returns if no delegators exist or insufficient rewards are available.
  - Calculates new rewards based on time elapsed and reward rate.
  - Handles potential overflow by capping rewards to available funds.
  - Updates the global reward index, total pending rewards, and last rewarded timestamp.
  - Tracks rewards deficit when available rewards are insufficient.

- **`_getCurrentRewardsIndex()`**  
  Internal view function that returns the current rewards index.  
  - If available rewards are insufficient, returns the stored reward index.
  - Otherwise, calculates the current reward index including unaccrued rewards.
  - Caps the rewards to the available balance.
  - Returns the calculated reward index.

- **`_updateLatestProposalId(uint256 proposalId)`**  
  Internal function to update and track proposal states.  
  - Updates latestProposalId if new proposal is higher.
  - Checks proposal state using Compound Governor.
  - Updates activeProposals and pendingProposals mappings.
  - Emits appropriate events for proposal state changes.

- **`_hasActiveOrPendingProposals()`**  
  Internal function to check for active or pending proposals.  
  - Checks the last 10 proposals for active or pending status.
  - Returns true if any active or pending proposals are found.

- **`_autoResolveProposal(uint256 proposalId)`**  
  Internal function to automatically resolve a proposal after timeout.  
  - Called when a proposal exceeds MAX_PROPOSAL_RESOLUTION_TIME.
  - Verifies delegate voting status and direction.
  - Determines outcome based on proposal state.
  - Transfers winning stakes if delegate voted correctly.
  - Emits appropriate events.

### ERC20 Overrides
- **`transfer(address to, uint256 amount)`**  
  Overridden to prevent transfers of Compensator tokens.  
  - Always reverts with "Transfers are disabled".

- **`transferFrom(address from, address to, uint256 amount)`**  
  Overridden to prevent transfers of Compensator tokens.  
  - Always reverts with "Transfers are disabled".

## Additional Notes

- **Lock Period Mechanism**:  
  The contract enforces a minimum lock period of 7 days for all delegated COMP. This period is extended by 3 days if there are active or pending proposals, preventing users from gaming the reward system by withdrawing before proposals start.

- **Proposal State Tracking**:  
  The contract tracks both active and pending proposals to ensure proper lock period enforcement. It checks the last 10 proposals to determine if any are active or pending, and extends lock periods accordingly.

- **Trustless Proposal Resolution**:  
  The contract implements a trustless proposal resolution mechanism where:
  - Anyone can trigger resolution through `resolveProposal`
  - Outcomes are determined by the Compound Governor's state
  - Delegate voting is verified automatically
  - Winning stakes are only transferred if the delegate voted correctly
  - A 30-day timeout ensures proposals can't be stuck indefinitely

- **Rewards Distribution Mechanism**:  
  The contract uses an index-based reward distribution mechanism that accrues rewards based on each delegator's stake proportional to the total delegated COMP. This mechanism ensures fair reward distribution and proper accounting even when delegators deposit or withdraw at different times.

- **Reward Preservation During Deposits**:  
  The implementation properly preserves rewards when delegators increase their deposits, ensuring no reward loss during deposit operations.

- **Separate Reward Tracking**:  
  By separating the tracking of accrued rewards (unclaimedRewards) from the reward index (startRewardIndex), the contract ensures accurate reward accounting across all user interactions.

- **Proposal Staking Mechanism**:  
  The contract allows delegators to stake on proposal outcomes, and these stakes can be either claimed by the delegate (if they win and voted correctly) or reclaimed by the delegator (if they lose).

- **Dynamic Delegation Cap**:  
  The delegation cap is set to 5% of the total COMP supply during initialization. If the total COMP supply changes (e.g., due to minting or burning), the delegation cap will not be updated dynamically.

- **Zero Supply and Reward Rate Handling**:  
  The contract includes robust handling for edge cases such as zero token supply, zero reward rate, or insufficient rewards to distribute.

- **Gas Optimization**:  
  The contract includes early returns in the `_updateRewardsIndex` function to save gas when no action is needed (e.g., when no delegators exist or when there are insufficient rewards).

- **Security Features**:  
  - Lock periods prevent reward exploitation
  - Proposal state tracking ensures governance participation
  - Delegation cap prevents excessive voting power
  - Non-transferable tokens prevent unauthorized transfers
  - Proper reward accounting prevents double-counting
  - Trustless proposal resolution prevents delegate manipulation
  - Automatic timeout mechanism prevents stuck proposals
  - Delegate voting verification ensures proper stake distribution