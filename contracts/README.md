# Protocol Specs

## CompensatorFactory

### Variables
- `address[] public compensators` - A list of all `Compensator` contracts created by the factory.
- `mapping(address owner => address compensator) public ownerToCompensator` - A mapping of owners to their `Compensator` contracts.
- `mapping(address compensator => address originalOwner) public compensatorToOriginalOwner` - Reverse mapping from compensator addresses to their original owner (for ownership transfer tracking).
- `address public immutable COMP_TOKEN` - The COMP governance token contract.
- `address public immutable COMPOUND_GOVERNOR` - The Compound Governor contract.

### Events
- `CompensatorCreated(address indexed owner, address indexed compensator)` - Emitted when a new Compensator contract is created.
- `CompensatorOwnershipTransferred(address indexed compensator, address indexed oldOwner, address indexed newOwner)` - Emitted when ownership of a Compensator is transferred.

### Functions
- **`constructor(address _compToken, address _compoundGovernor)`**  
  Initializes the factory with the COMP token and Compound Governor addresses.  
  - Validates that both addresses are non-zero.
  - Sets the addresses as immutable variables.

- **`createCompensator(address owner)`**  
  Creates a `Compensator` contract for an owner.  
  - Adds the contract to the `compensators` list.  
  - Maps the owner to their `Compensator` contract.  
  - Stores the original owner for ownership transfer tracking.
  - Passes the COMP token, Compound Governor, and owner addresses to the new contract.
  - Returns the address of the new `Compensator` contract.

- **`createCompensatorForSelf()`**  
  Creates a `Compensator` contract for the caller.
  - Calls `createCompensator(msg.sender)`.
  - Returns the address of the new `Compensator` contract.

- **`onOwnershipTransferred(address oldOwner, address newOwner)`**  
  Called by a Compensator contract when ownership is transferred.
  - Updates the owner mapping in the factory.
  - Updates the original owner mapping.
  - Emits ownership transfer event.

- **`getCompensatorsCount()`**  
  Returns the total number of deployed Compensator contracts.

- **`getCompensators(uint256 offset, uint256 limit)`**  
  Returns a paginated list of Compensator contract addresses.

- **`hasCompensator(address owner)`**  
  Checks if an owner already has a Compensator contract.
  - Returns true if the owner has a Compensator, false otherwise.

- **`getOriginalOwner(address compensator)`**  
  Gets the original owner of a Compensator contract.
  - Returns the original owner address, or address(0) if not found.

## Compensator

### Variables
- `address owner` - The address of the delegate who owns the contract.
- `uint256 availableRewards` - The amount of COMP available for rewards.
- `uint256 rewardRate` - The reward rate in COMP/second.
- `uint256 rewardIndex` - Tracks the distribution of rewards over time.
- `uint256 lastRewarded` - Timestamp of the last reward distribution.
- `uint256 totalDelegatedCOMP` - Total COMP delegated to this contract.
- `uint256 delegationCap` - The max COMP that can be delegated to this contract (5% of total COMP supply).
- `uint256 totalPendingRewards` - Total pending rewards for all delegators that have been accrued but not yet claimed.
- `uint256 constant MIN_LOCK_PERIOD` - Minimum lock period for delegated COMP (7 days).
- `uint256 constant ACTIVE_PROPOSAL_LOCK_EXTENSION` - Additional lock period extension when active proposals exist (3 days).
- `mapping(address delegator => uint256 timestamp) public unlockTime` - Tracks when each delegator's COMP will be unlocked.
- `uint256 latestProposalId` - Latest proposal ID that has been seen.
- `mapping(uint256 proposalId => bool isActive) public activeProposals` - Tracks active proposals.
- `mapping(uint256 proposalId => bool isPending) public pendingProposals` - Tracks proposals that are about to start (within 1 day).
- `mapping(address delegator => uint256 amount) public unclaimedRewards` - Tracks previously accrued but unclaimed rewards for each delegator.
- `mapping(address delegator => uint256 index) public startRewardIndex` - Tracks the starting reward index for each delegator to calculate pending rewards.
- `mapping(uint256 proposalId => uint256 timestamp) public proposalCreationTime` - Tracks when each proposal was created.
- `uint256 constant MAX_PROPOSAL_RESOLUTION_TIME` - Maximum time a proposal can remain unresolved (30 days).
- `mapping(uint256 proposalId => bool hasVoted) public contractVoted` - Tracks whether the contract has voted on a proposal.
- `mapping(uint256 proposalId => uint8 direction) public contractVoteDirection` - Tracks the contract's vote direction on a proposal.
- `uint256 constant REWARD_PRECISION` - Precision factor for reward calculations (18 decimals).
- `uint256 constant BASIS_POINTS` - Percentage basis points (100% = 10000).
- `uint256 constant DELEGATION_CAP_PERCENT` - Delegation cap percentage in basis points (500 = 5%).
- `uint256 constant RECENT_PROPOSALS_CHECK_COUNT` - Number of recent proposals to check for active status (10).
- `uint256 constant PROPOSAL_CHECK_GAS_LIMIT` - Gas limit for proposal status checking (50000).
- `uint256 constant MAX_BLOCKS_PER_DAY` - Maximum blocks per day limit for validation (50000).
- `uint256 public blocksPerDay` - Number of blocks per day for proposal timing calculations (default: 6500 for mainnet).
- `address public immutable FACTORY` - The factory contract that created this Compensator.
- `IComp public immutable COMP_TOKEN` - The COMP governance token contract.
- `IGovernor public immutable COMPOUND_GOVERNOR` - The Compound Governor contract.

### Structs
- `struct VoteInfo` - Structure to track vote information:
  - `uint8 direction` - The direction of the vote (0 = Against, 1 = For)
  - `uint256 blockNumber` - The block number when the vote was cast
  - `bytes32 txHash` - The transaction hash of the vote
  - `uint256 timestamp` - The timestamp when the vote was cast
  - `uint256 votingPower` - The voting power used for this vote
  - `string reason` - The reason for the vote (optional)
- `struct DelegateInfo` - Structure to track delegate performance:
  - `uint256 successfulVotes` - Number of successful votes
  - `uint256 totalVotes` - Number of total votes cast
  - `uint256 totalRewardsEarned` - Total rewards earned from successful votes
  - `uint256 totalVotingPowerUsed` - Total voting power used across all votes
  - `uint256 averageVotingPowerPerVote` - Average voting power per vote
- `struct ProposalStake` - Gas-optimized structure to track individual delegator stakes on proposals:
  - `uint128 forStake` - Amount staked in support of a proposal (sufficient for COMP amounts)
  - `uint128 againstStake` - Amount staked against a proposal (sufficient for COMP amounts)

### Mappings
- `mapping(uint256 proposalId => VoteInfo voteInfo) public voteInfo` - Mapping to track vote information for each proposal.
- `mapping(uint256 voteIndex => uint256 proposalId) public voteIndexToProposalId` - Mapping to track proposal IDs by vote index (for enumeration).
- `uint256 public voteCount` - Total number of votes cast by the contract.
- `DelegateInfo public delegateInfo` - Tracks delegate performance metrics.
- `mapping(uint256 proposalId => mapping(address delegator => ProposalStake stake)) public proposalStakes` - Mapping to track stakes for each proposal by each delegator.
- `mapping(uint256 proposalId => uint256 amount) public totalStakesFor` - Total stakes "For" each proposal.
- `mapping(uint256 proposalId => uint256 amount) public totalStakesAgainst` - Total stakes "Against" each proposal.
- `mapping(uint256 proposalId => ProposalOutcome outcome) public proposalOutcomes` - Tracks the outcome of each proposal.

### Enums
- `enum ProposalOutcome` - Type-safe enum for proposal outcomes:
  - `NotResolved`
  - `AgainstWon`
  - `ForWon`

### Events
- `UserDeposit(address indexed user, uint256 amount)` - Emitted when a user deposits COMP.
- `UserWithdraw(address indexed user, uint256 amount)` - Emitted when a user withdraws COMP.
- `ProposalStaked(address indexed user, uint256 proposalId, uint8 support, uint256 amount)` - Emitted when a user stakes COMP for a proposal outcome.
- `ProposalStakeDistributed(uint256 indexed proposalId, uint8 indexed winningSupport)` - Emitted when stakes are distributed after a proposal resolves.
- `ClaimRewards(address indexed user, uint256 amount)` - Emitted when a user claims their rewards.
- `StakeReclaimed(address indexed user, uint256 proposalId, uint256 amount)` - Emitted when a user reclaims their losing stake after a proposal is resolved.
- `COMPLocked(address indexed user, uint256 unlockTime)` - Emitted when a user's COMP is locked.
- `NewProposalDetected(uint256 indexed proposalId)` - Emitted when a new proposal is detected.
- `ProposalActivated(uint256 indexed proposalId)` - Emitted when a proposal is marked as active.
- `ProposalDeactivated(uint256 indexed proposalId)` - Emitted when a proposal is marked as inactive.
- `ProposalAutoResolved(uint256 indexed proposalId, uint8 winningSupport)` - Emitted when a proposal is automatically resolved after timeout.
- `VoteCast(uint256 indexed proposalId, uint8 support, uint256 blockNumber, bytes32 txHash, uint256 votingPower, string reason)` - Emitted when the contract casts a vote.
- `UserRewardsUpdated(address indexed user, uint256 newRewards, uint256 totalUnclaimed)` - Emitted when a user's rewards are updated.
- `RewardIndexUpdated(uint256 newRewardIndex, uint256 rewardsAccrued)` - Emitted when the global reward index is updated.
- `DelegatePerformanceUpdated(uint256 successfulVotes, uint256 totalVotes, uint256 totalRewardsEarned)` - Emitted when delegate performance metrics are updated.
- `OwnerDeposit(address indexed owner, uint256 amount)` - Emitted when the owner deposits COMP.
- `OwnerWithdraw(address indexed owner, uint256 amount)` - Emitted when the owner withdraws COMP.
- `RewardRateUpdate(address indexed owner, uint256 newRate)` - Emitted when the reward rate is updated.
- `ProposalStateChanged(uint256 indexed proposalId, IGovernor.ProposalState oldState, IGovernor.ProposalState newState)` - Emitted when a proposal's state changes.
- `DelegationCapUpdated(uint256 oldCap, uint256 newCap, uint256 totalSupply)` - Emitted when the delegation cap is updated.
- `RewardsDistributed(uint256 totalRewards, uint256 rewardIndex, uint256 timestamp)` - Emitted when rewards are distributed to users.

### Functions

#### Constructor
- **`constructor(address _compToken, address _compoundGovernor, address _owner)`**  
  Initializes the contract with the COMP token, Compound Governor, and owner addresses.  
  - Sets the delegation cap to 5% of the total COMP supply.
  - Initializes the reward index at 1e18.
  - Sets the compToken, compoundGovernor, and factory as immutable variables.
  - Sets the owner using Ownable.
  - Validates that all addresses are non-zero.

#### View Functions
- **`rewardsUntil()`**  
  Calculates the timestamp until which rewards will be distributed.
  - Returns lastRewarded timestamp if no rewards are being distributed.
  - Uses high precision calculations to avoid rounding errors.

- **`getPendingRewards(address delegator)`**  
  Returns the amount of pending rewards for a delegator.
  - Accounts for both claimed and unclaimed rewards.

- **`getContractVotingPower()`**  
  Returns the contract's current voting power.
  - Returns the amount of COMP delegated to this contract.

- **`getContractVotingPowerAt(uint256)`**  
  Returns the contract's voting power at a specific block.
  - Returns the amount of COMP delegated to this contract at that block.

- **`getVoteInfo(uint256 proposalId)`**  
  Returns the vote information for a specific proposal.
  - Returns direction, blockNumber, txHash, timestamp, votingPower, and reason.

- **`getVoteByIndex(uint256 voteIndex)`**  
  Returns the vote information for a specific vote by index.
  - Returns direction, blockNumber, txHash, timestamp, votingPower, and reason.

- **`getProposalStake(uint256 proposalId, address delegator)`**  
  Returns a delegator's stakes for a specific proposal.
  - Returns forStake and againstStake amounts.

#### Owner Functions
- **`ownerDeposit(uint256 amount)`**  
  Allows the owner to deposit COMP into the contract for rewards distribution.  
  - Requires amount to be greater than 0.
  - Transfers COMP from the owner to the contract.
  - Updates available rewards.
  - Updates the reward index.
  - Emits an `OwnerDeposit` event.

- **`ownerWithdraw(uint256 amount)`**  
  Allows the owner to withdraw COMP from the contract.  
  - Requires amount to be greater than 0.
  - Updates the reward index before withdrawal.
  - Ensures that the withdrawable amount is sufficient (availableRewards - totalPendingRewards).
  - Transfers COMP to the owner.
  - Emits an `OwnerWithdraw` event.

- **`setRewardRate(uint256 newRate)`**  
  Allows the owner to set the reward rate (in COMP/second).  
  - Requires new rate to be non-negative.
  - Requires new rate to be different from current rate.
  - Updates the reward index before setting the new rate.
  - Emits a `RewardRateUpdate` event.

- **`castVote(uint256 proposalId, uint8 support, string calldata reason)`**  
  Allows the owner to cast a vote on a proposal with a reason.
  - Requires caller to be the owner.
  - Requires support to be 0 (Against) or 1 (For).
  - Requires the proposal to be in a valid voting state.
  - Records vote information including block number, transaction hash, timestamp, and voting power.
  - Casts the vote through the Compound Governor.
  - Updates delegate performance metrics.
  - Emits a `VoteCast` event.

- **`castVote(uint256 proposalId, uint8 support)`**  
  Allows the owner to cast a vote on a proposal without a reason.
  - Same functionality as above but without reason parameter.

- **`setBlocksPerDay(uint256 _blocksPerDay)`**  
  Updates the number of blocks per day for proposal timing calculations.
  - Can be called by owner to adjust for different networks.
  - Validates the new value is within acceptable range.

#### Delegator Functions
- **`userDeposit(uint256 amount)`**  
  Allows a user to deposit COMP into the contract.
  - Delegates voting power to the contract itself.
  - Sets unlock time based on active proposals.
  - Updates reward accounting.
  - Emits a `UserDeposit` event.

- **`userWithdraw(uint256 amount)`**  
  Allows a user to withdraw COMP from the contract.
  - Claims pending rewards before processing withdrawal.
  - Requires lock period to have expired.
  - Requires no active proposals.
  - Emits a `UserWithdraw` event.

- **`claimRewards()`**  
  Allows delegators to claim their accumulated rewards.
  - Updates rewards first, then transfers COMP to the delegator.
  - Requires the delegator to have pending rewards.
  - Resets unclaimed rewards before transfer to prevent reentrancy.
  - Emits a `ClaimRewards` event.

#### Proposal Functions
- **`stakeForProposal(uint256 proposalId, uint8 support, uint256 amount)`**  
  Allows a delegator to stake COMP on a proposal.
  - Only active proposals can be staked on.
  - Updates proposal tracking.
  - Records stakes for the specified direction.
  - Emits a `ProposalStaked` event.

- **`resolveProposal(uint256 proposalId)`**  
  Allows anyone to resolve a proposal and distribute stakes based on the actual outcome.
  - Requires the proposal to not already be resolved.
  - Requires the proposal to be in a resolved state in the Compound Governor.
  - Verifies if the contract has voted and their vote direction.
  - Determines the winning support based on the proposal's actual outcome.
  - Records the proposal outcome.
  - Transfers winning stakes to the contract if they voted correctly.
  - Updates delegate performance metrics.
  - Emits a `ProposalStakeDistributed` event.

- **`reclaimStake(uint256 proposalId)`**  
  Allows delegators to reclaim their losing stake after a proposal is resolved.
  - Checks if the proposal needs to be auto-resolved due to timeout.
  - Requires the proposal to be resolved.
  - Determines the winning side and the amount to return.
  - Updates the delegator's proposal stakes and total stakes.
  - Transfers the losing stake back to the delegator.
  - Emits a `StakeReclaimed` event.

#### Internal Functions
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
  - Includes gas limit protection to prevent excessive gas usage.
  - Breaks loop if gas limit exceeded (50,000 gas).
  - Returns true if any active or pending proposals are found.

- **`_autoResolveProposal(uint256 proposalId)`**  
  Internal function to automatically resolve a proposal after timeout.
  - Called when a proposal exceeds MAX_PROPOSAL_RESOLUTION_TIME.
  - Uses ProposalOutcome enum for clear outcome states.
  - Verifies contract voting status and direction.
  - Determines outcome based on proposal state.
  - Transfers winning stakes if contract voted correctly.
  - Emits appropriate events.

- **`_resolveProposalInternal(uint256 proposalId, uint8 winningSupport, bool isAutoResolved)`**  
  Internal function to resolve a proposal and distribute stakes.
  - Records the proposal outcome.
  - Verifies if the delegate voted correctly.
  - Distributes winning stakes to delegate if they voted correctly.
  - Updates delegate performance metrics.
  - Emits appropriate events.

- **`_castVote(uint256 proposalId, uint8 support, string memory reason)`**  
  Internal function to cast a vote on a proposal.
  - Validates proposal state and voting parameters.
  - Records comprehensive vote information.
  - Updates delegate performance metrics.
  - Casts vote through Compound Governor.
  - Emits vote events.

- **`verifyVote(uint256 proposalId)`**  
  Verifies if a vote was cast correctly.
  - Checks if the vote was cast in a valid state.
  - Verifies the transaction hash matches.
  - Verifies the contract has voted.
  - Verifies vote direction consistency.
  - Returns true if all verifications pass.

#### ERC20 Overrides
- **`transfer(address to, uint256 amount)`**  
  Overridden to prevent transfers of Compensator tokens.
  - Always reverts with "CompensatorTokensNotTransferable".

- **`transferFrom(address from, address to, uint256 amount)`**  
  Overridden to prevent transfers of Compensator tokens.
  - Always reverts with "CompensatorTokensNotTransferable".

- **`approve(address spender, uint256 amount)`**  
  Overridden to prevent token approvals.
  - Always reverts with "CompensatorTokensNotTransferable".

#### Ownership Transfer Override
- **`transferOwnership(address newOwner)`**  
  Override transferOwnership to notify the factory when ownership changes.
  - This ensures the factory's ownerToCompensator mapping stays synchronized.
  - Calls the parent transferOwnership function.
  - Notifies the factory about the ownership change.
  - Gracefully handles factory notification failures.

## System Architecture

### Factory Pattern
The system uses a factory pattern where:
1. **CompensatorFactory** deploys individual **Compensator** contracts
2. Each user gets their own **Compensator** instance
3. The factory tracks all deployed compensators and owner mappings
4. Users can create compensators for themselves or others
5. Ownership transfers are automatically synchronized with the factory

### Delegation Flow
1. User calls `CompensatorFactory.createCompensatorForSelf()`
2. Factory deploys a new `Compensator` contract with the user as owner
3. User can then deposit COMP and start earning rewards
4. User can stake on proposals and participate in governance

### Staking System
The system allows users to stake COMP on proposal outcomes:
1. **For Stakes**: COMP staked in support of a proposal
2. **Against Stakes**: COMP staked against a proposal
3. **Resolution**: After proposal ends, winning stakes go to the delegate (if they voted correctly)
4. **Reclamation**: Losing stakes are returned to delegators

### Reward System
The system distributes rewards based on:
1. **Time-based accrual**: Rewards accumulate based on time and rate
2. **Stake-based distribution**: Rewards distributed proportionally to stake
3. **Index-based calculation**: Uses reward indices for accurate accounting
4. **Claim mechanism**: Users can claim accumulated rewards anytime

## Additional Notes

- **Lock Period Mechanism**:  
  The contract enforces a minimum lock period of 7 days for all delegated COMP. This period is extended by 3 days if there are active or pending proposals, preventing users from gaming the reward system by withdrawing before proposals start.

- **Proposal State Tracking**:  
  The contract tracks both active and pending proposals to ensure proper lock period enforcement. It checks the last 10 proposals to determine if any are active or pending, and extends lock periods accordingly.

- **Trustless Proposal Resolution**:  
  The contract implements a trustless proposal resolution mechanism where:
  - Anyone can trigger resolution through `resolveProposal`
  - Outcomes are determined by the Compound Governor's state
  - Contract voting is verified automatically
  - Winning stakes are only transferred if the contract voted correctly
  - A 30-day timeout ensures proposals can't be stuck indefinitely

- **Rewards Distribution Mechanism**:  
  The contract uses an index-based reward distribution mechanism that accrues rewards based on each delegator's stake proportional to the total delegated COMP. This mechanism ensures fair reward distribution and proper accounting even when delegators deposit or withdraw at different times.

- **Reward Preservation During Deposits**:  
  The implementation properly preserves rewards when delegators increase their deposits, ensuring no reward loss during deposit operations.

- **Separate Reward Tracking**:  
  By separating the tracking of accrued rewards (unclaimedRewards) from the reward index (startRewardIndex), the contract ensures accurate reward accounting across all user interactions.

- **Proposal Staking Mechanism**:  
  The contract allows delegators to stake on proposal outcomes, and these stakes can be either claimed by the contract (if they win and voted correctly) or reclaimed by the delegator (if they lose).

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
  - Trustless proposal resolution prevents contract manipulation
  - Automatic timeout mechanism prevents stuck proposals
  - Contract voting verification ensures proper stake distribution
  - Custom errors provide clear failure messages
  - ReentrancyGuard protection on all critical functions

- **Vote Verification System**:  
  The contract implements a robust vote verification system that:
  - Records vote direction, block number, transaction hash, timestamp, and voting power in the `VoteInfo` struct
  - Verifies votes through multiple checks:
    1. Valid proposal state (Active or Pending)
    2. Transaction hash validation
    3. Contract voting status in Governor
    4. Vote direction consistency
  - Ensures votes were cast in valid proposal states
  - Prevents vote manipulation through on-chain verification
  - Uses block hash verification for transaction authenticity

- **Proposal Tracking System**:  
  The contract implements comprehensive proposal tracking:
  - Monitors proposal states through the Compound Governor
  - Tracks active and pending proposals
  - Records proposal creation times
  - Handles proposal timeouts (30-day maximum)
  - Updates proposal states atomically
  - Emits events for state changes:
    - `NewProposalDetected`
    - `ProposalActivated`
    - `ProposalDeactivated`
    - `ProposalStateChanged`
    - `ProposalAutoResolved`

- **Reward Distribution System**:  
  The contract implements a precise reward distribution mechanism:
  - Uses an index-based reward calculation
  - Caches state variables to prevent reentrancy
  - Caps rewards to available funds
  - Handles edge cases:
    - Zero token supply
    - Zero reward rate
    - Insufficient rewards
  - Updates reward indices atomically
  - Emits detailed events:
    - `RewardIndexUpdated`
    - `RewardsDistributed`
    - `UserRewardsUpdated`

- **Delegate Performance Tracking**:  
  The contract tracks delegate performance metrics:
  - Number of successful votes
  - Total votes cast
  - Total rewards earned from successful votes
  - Total voting power used
  - Average voting power per vote
  - Performance metrics are updated on each vote and resolution

- **Ownership Transfer Synchronization**:  
  The contract implements automatic synchronization with the factory when ownership is transferred:
  - Overrides the `transferOwnership` function
  - Notifies the factory of ownership changes
  - Maintains data integrity in the factory's mappings
  - Gracefully handles factory notification failures
  - Emits events for transparency

- **Key Functions**:  
  - **Vote Verification**:
    ```solidity
    function verifyVote(uint256 proposalId) internal view returns (bool)
    ```
    - Verifies vote integrity through multiple checks
    - Ensures vote was cast in valid state
    - Validates transaction hash
    - Confirms contract voting status
    - Verifies vote direction consistency
  - **Proposal Tracking**:
    ```solidity
    function _updateLatestProposalId(uint256 proposalId) internal
    ```
    - Updates latest proposal ID
    - Tracks proposal states
    - Records creation times
    - Handles timeouts
    - Emits state change events
  - **Reward Distribution**:
    ```solidity
    function _updateRewardsIndex() private
    function _getCurrentRewardsIndex() private view returns (uint256)
    ```
    - Calculates rewards based on time and rate
    - Caps rewards to available funds
    - Updates reward indices
    - Handles edge cases
    - Emits distribution events

- **Security Features**:  
  - **Vote Verification**: Multiple checks ensure vote integrity
  - **Proposal Tracking**: Comprehensive state management
  - **Reward Distribution**: Precise calculations with safety checks
  - **Reentrancy Protection**: State variable caching
  - **Timeout Protection**: 30-day maximum for proposals
  - **Precision Safeguards**: High precision calculations
  - **Event Tracking**: Detailed event emission
  - **State Validation**: Multiple validation checks
  - **Custom Errors**: Clear and specific error messages
  - **Ownership Synchronization**: Automatic factory updates

- **Gas Optimization**:  
  - State variable caching
  - Early returns for edge cases
  - Efficient data structures
  - Optimized event parameters
  - Gas-efficient calculations

- **Error Handling**:  
  - Comprehensive custom errors
  - Clear error messages
  - State validation checks
  - Timeout handling
  - Proposal state verification

- **Frontend Integration**:  
  The contract includes several view functions to help with frontend development:
  - `getProposalStake`: Get a delegator's stakes for a specific proposal
  - `getPendingRewards`: Get a delegator's pending rewards
  - `rewardsUntil`: Calculate when rewards will be distributed
  - `getCompensator`: Get a user's compensator address from the factory
  - `getVoteInfo`: Get detailed vote information for a proposal
  - `getVoteByIndex`: Get vote information by vote index
  - `getContractVotingPower`: Get the contract's current voting power
  - These functions help reduce the need for complex off-chain calculations