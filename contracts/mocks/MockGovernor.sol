// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.21;

import "../IGovernor.sol";

contract MockGovernor is IGovernor {
    mapping(uint256 => ProposalState) public proposalStates;
    mapping(uint256 => uint256) public proposalSnapshots;
    mapping(uint256 => mapping(address => bool)) private _hasVoted;
    mapping(uint256 => uint256) private forVotes;
    mapping(uint256 => uint256) private againstVotes;
    mapping(uint256 => uint256) private abstainVotes;

    function setProposalState(uint256 proposalId, ProposalState newState) external {
        proposalStates[proposalId] = newState;
    }

    function setProposalSnapshot(uint256 proposalId, uint256 snapshot) external {
        proposalSnapshots[proposalId] = snapshot;
    }

    function mockHasVoted(uint256 proposalId, address account, bool voted) external {
        _hasVoted[proposalId][account] = voted;
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
        return _hasVoted[proposalId][account];
    }

    function proposalVotes(uint256 proposalId) external view override returns (
        uint256 againstVotes_,
        uint256 forVotes_,
        uint256 abstainVotes_
    ) {
        return (
            againstVotes[proposalId],
            forVotes[proposalId],
            abstainVotes[proposalId]
        );
    }

    function castVote(uint256 proposalId, uint8 support) external override {
        // Mock implementation - just mark that the contract has voted
        _hasVoted[proposalId][msg.sender] = true;
        
        // Update vote counts based on support
        if (support == 1) {
            forVotes[proposalId] += 1;
        } else if (support == 0) {
            againstVotes[proposalId] += 1;
        }
    }
} 