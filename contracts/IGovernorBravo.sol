// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

interface IGovernorBravo {
    function castVote(uint proposalId, uint8 support) external;
}
