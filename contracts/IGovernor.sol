// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

interface IGovernor {
    enum ProposalState {
        Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    }
    
    function state(uint256 proposalId) external view returns (ProposalState);
    
    function proposals(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        uint256 eta,
        uint256 startBlock,
        uint256 endBlock,
        uint256 forVotes,
        uint256 againstVotes,
        bool canceled,
        bool executed
    );
    
    function castVote(uint proposalId, uint8 support) external;
}
