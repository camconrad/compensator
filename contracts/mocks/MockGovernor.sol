// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "../IGovernor.sol";

contract MockGovernor is IGovernor {
    mapping(uint256 => ProposalState) public proposalStates;
    mapping(uint256 => uint256) public proposalSnapshots;

    function setProposalState(uint256 proposalId, ProposalState state) external {
        proposalStates[proposalId] = state;
    }

    function setProposalSnapshot(uint256 proposalId, uint256 snapshot) external {
        proposalSnapshots[proposalId] = snapshot;
    }

    function state(uint256 proposalId) external view override returns (ProposalState) {
        return proposalStates[proposalId];
    }

    function proposalSnapshot(uint256 proposalId) external view override returns (uint256) {
        return proposalSnapshots[proposalId];
    }
} 