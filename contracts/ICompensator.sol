// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.30;

import {IComp} from "./IComp.sol";
import {IGovernor} from "./IGovernor.sol";

/**
 * @title ICompensator
 * @notice Interface for the Compensator contract that allows COMP holders to delegate their voting power
 * and earn rewards. The contract acts as a voting proxy where the owner votes directly through it.
 */
interface ICompensator {
    //////////////////////////
    // Type Declarations
    //////////////////////////

    /// @notice Structure to track individual delegator stakes on proposals
    struct ProposalStake {
        /// @notice Amount staked in support of a proposal
        uint128 forStake;
        /// @notice Amount staked against a proposal
        uint128 againstStake;
    }

    /// @notice Possible outcomes for a proposal
    enum ProposalOutcome {
        NotResolved,
        AgainstWon,
        ForWon
    }

    /// @notice Structure to track vote information
    struct VoteInfo {
        /// @notice The direction of the vote (0 = Against, 1 = For)
        uint8 direction;
        /// @notice The block number when the vote was cast
        uint256 blockNumber;
        /// @notice The transaction hash of the vote
        bytes32 txHash;
        /// @notice The timestamp when the vote was cast
        uint256 timestamp;
        /// @notice The voting power used for this vote
        uint256 votingPower;
        /// @notice The reason for the vote (optional)
        string reason;
    }

    /// @notice Structure to track delegate performance
    struct DelegateInfo {
        /// @notice Number of successful votes
        uint256 successfulVotes;
        /// @notice Number of total votes cast
        uint256 totalVotes;
        /// @notice Total rewards earned from successful votes
        uint256 totalRewardsEarned;
        /// @notice Total voting power used across all votes
        uint256 totalVotingPowerUsed;
        /// @notice Average voting power per vote
        uint256 averageVotingPowerPerVote;
    }

    //////////////////////////
    // Events
    //////////////////////////

    /// @notice Emitted when a vote is cast
    event VoteCast(
        uint256 indexed proposalId,
        uint8 support,
        uint256 blockNumber,
        bytes32 txHash,
        uint256 votingPower,
        string reason
    );

    //////////////////////////
    // Owner Functions
    //////////////////////////

    /**
     * @notice Allows the owner to cast a vote on a proposal
     * @param proposalId The ID of the proposal to vote on
     * @param support The vote direction (0 = Against, 1 = For)
     * @param reason Optional reason for the vote
     */
    function castVote(uint256 proposalId, uint8 support, string calldata reason) external;

    /**
     * @notice Allows the owner to cast a vote on a proposal (without reason)
     * @param proposalId The ID of the proposal to vote on
     * @param support The vote direction (0 = Against, 1 = For)
     */
    function castVote(uint256 proposalId, uint8 support) external;

    //////////////////////////
    // View Functions
    //////////////////////////

    /**
     * @notice Returns the contract's current voting power
     * @return The amount of COMP delegated to this contract
     */
    function getContractVotingPower() external view returns (uint256);

    /**
     * @notice Returns the vote information for a specific proposal
     * @param proposalId The ID of the proposal
     * @return direction The vote direction (0 = Against, 1 = For)
     * @return blockNumber The block number when the vote was cast
     * @return txHash The transaction hash of the vote
     * @return timestamp The timestamp when the vote was cast
     * @return votingPower The voting power used for this vote
     * @return reason The reason for the vote
     */
    function getVoteInfo(uint256 proposalId) external view returns (
        uint8 direction,
        uint256 blockNumber,
        bytes32 txHash,
        uint256 timestamp,
        uint256 votingPower,
        string memory reason
    );

    /**
     * @notice Returns the vote information for a specific vote by index
     * @param voteIndex The index of the vote in the vote tracking array
     * @return direction The vote direction (0 = Against, 1 = For)
     * @return blockNumber The block number when the vote was cast
     * @return txHash The transaction hash of the vote
     * @return timestamp The timestamp when the vote was cast
     * @return votingPower The voting power used for this vote
     * @return reason The reason for the vote
     */
    function getVoteByIndex(uint256 voteIndex) external view returns (
        uint8 direction,
        uint256 blockNumber,
        bytes32 txHash,
        uint256 timestamp,
        uint256 votingPower,
        string memory reason
    );

    /**
     * @notice Returns the total number of votes cast by the contract
     * @return The total number of votes cast
     */
    function getTotalVotesCast() external view returns (uint256);

    /**
     * @notice Returns the delegate performance information
     * @return The delegate performance struct
     */
    function delegateInfo() external view returns (DelegateInfo memory);
} 