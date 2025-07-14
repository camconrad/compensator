// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

/**
 * @dev Interface of the {Governor} core.
 * Only includes functions used by Compensator contract.
 */
interface IGovernor {
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }

    /**
     * @notice module:core
     * @dev Current state of a proposal, following Compound's convention
     */
    function state(uint256 proposalId) external view returns (ProposalState);

    /**
     * @notice module:core
     * @dev Timepoint used to retrieve user's votes and quorum. If using block number (as per Compound's Comp), the
     * snapshot is performed at the end of this block. Hence, voting for this proposal starts at the beginning of the
     * following block.
     */
    function proposalSnapshot(uint256 proposalId) external view returns (uint256);

    /**
     * @notice module:voting
     * @dev Returns whether `account` has cast a vote on `proposalId`.
     */
    function hasVoted(uint256 proposalId, address account) external view returns (bool);

    /**
     * @notice module:voting
     * @dev Returns the vote counts for a proposal.
     * @param proposalId The ID of the proposal
     * @return againstVotes The number of votes against the proposal
     * @return forVotes The number of votes for the proposal
     * @return abstainVotes The number of abstain votes
     */
    function proposalVotes(uint256 proposalId) external view returns (
        uint256 againstVotes,
        uint256 forVotes,
        uint256 abstainVotes
    );

    /**
     * @notice module:voting
     * @dev Cast a vote on a proposal.
     * @param proposalId The ID of the proposal
     * @param support The vote direction (0 = Against, 1 = For)
     */
    function castVote(uint256 proposalId, uint8 support) external;
}
