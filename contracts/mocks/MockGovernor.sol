// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.30;

import {IGovernor} from "../IGovernor.sol";

/**
 * @title MockGovernor
 * @notice A mock implementation of the Compound Governor for testing purposes
 */
contract MockGovernor is IGovernor {
    mapping(uint256 => mapping(address => bool)) private _hasVoted;
    mapping(uint256 => mapping(address => uint8)) private _voteDirection;
    mapping(address => mapping(uint256 => uint256)) private _votes;
    mapping(uint256 => IGovernor.ProposalState) private _proposalStates;
    mapping(uint256 => uint256) private _proposalSnapshots;

    constructor() {
        // Initialize some default proposal states for testing
        _proposalStates[1] = IGovernor.ProposalState.Active;
        _proposalStates[2] = IGovernor.ProposalState.Active;
        _proposalSnapshots[1] = block.number;
        _proposalSnapshots[2] = block.number;
    }

    function castVote(uint256 proposalId, uint8 support) external {
        _hasVoted[proposalId][msg.sender] = true;
        _voteDirection[proposalId][msg.sender] = support;
    }

    function castVoteWithReason(uint256 proposalId, uint8 support, string calldata reason) external {
        _hasVoted[proposalId][msg.sender] = true;
        _voteDirection[proposalId][msg.sender] = support;
        // Reason is ignored in mock implementation
    }

    function hasVoted(uint256 proposalId, address account) external view returns (bool) {
        return _hasVoted[proposalId][account];
    }

    function state(uint256 proposalId) external view returns (IGovernor.ProposalState) {
        return _proposalStates[proposalId];
    }

    function proposalSnapshot(uint256 proposalId) external view returns (uint256) {
        return _proposalSnapshots[proposalId];
    }

    function proposalVotes(uint256 proposalId) external view returns (
        uint256 againstVotes,
        uint256 forVotes,
        uint256 abstainVotes
    ) {
        // Return mock vote counts
        againstVotes = 1000;
        forVotes = 2000;
        abstainVotes = 500;
    }

    function getVotes(address account, uint256 blockNumber) external view returns (uint256) {
        return _votes[account][blockNumber];
    }

    // Helper functions for testing
    function setVotingPower(address account, uint256 blockNumber, uint256 power) external {
        _votes[account][blockNumber] = power;
    }

    function setProposalState(uint256 proposalId, IGovernor.ProposalState state_) external {
        _proposalStates[proposalId] = state_;
    }

    function setProposalSnapshot(uint256 proposalId, uint256 snapshot) external {
        _proposalSnapshots[proposalId] = snapshot;
    }
}