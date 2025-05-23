// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import "../IGovernor.sol";

contract MockGovernor is IGovernor {
    mapping(uint256 => ProposalState) public proposalStates;
    mapping(uint256 => uint256) public proposalSnapshots;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => uint256) public forVotes;
    mapping(uint256 => uint256) public againstVotes;
    mapping(uint256 => uint256) public abstainVotes;

    function setProposalState(uint256 proposalId, ProposalState state) external {
        proposalStates[proposalId] = state;
    }

    function setProposalSnapshot(uint256 proposalId, uint256 snapshot) external {
        proposalSnapshots[proposalId] = snapshot;
    }

    function mockHasVoted(uint256 proposalId, address account, bool voted) external {
        hasVoted[proposalId][account] = voted;
    }

    function mockProposalVotes(
        uint256 proposalId,
        uint256 _forVotes,
        uint256 _againstVotes,
        uint256 _abstainVotes
    ) external {
        forVotes[proposalId] = _forVotes;
        againstVotes[proposalId] = _againstVotes;
        abstainVotes[proposalId] = _abstainVotes;
    }

    function state(uint256 proposalId) external view override returns (ProposalState) {
        return proposalStates[proposalId];
    }

    function proposalSnapshot(uint256 proposalId) external view override returns (uint256) {
        return proposalSnapshots[proposalId];
    }

    function hasVoted(uint256 proposalId, address account) external view override returns (bool) {
        return hasVoted[proposalId][account];
    }

    function proposalVotes(uint256 proposalId) external view override returns (
        uint256 againstVotes,
        uint256 forVotes,
        uint256 abstainVotes
    ) {
        return (
            againstVotes[proposalId],
            forVotes[proposalId],
            abstainVotes[proposalId]
        );
    }
} 