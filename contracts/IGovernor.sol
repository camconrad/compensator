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
    
    function castVote(uint256 proposalId, uint8 support) external;
    
    function hasVoted(uint256 proposalId, address account) external view returns (bool);
    
    function proposalSnapshot(uint256 proposalId) external view returns (uint256);
    
    function proposalDeadline(uint256 proposalId) external view returns (uint256);
    
    function getVotes(address account, uint256 timepoint) external view returns (uint256);
    
    function COUNTING_MODE() external pure returns (string memory);

    function proposalVotes(uint256 proposalId) external view returns (
        uint256 againstVotes,
        uint256 forVotes,
        uint256 abstainVotes
    );
}
