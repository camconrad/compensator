// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    // Mapping to track delegations
    mapping(address => address) public delegates;
    // Mapping to track voting power
    mapping(address => uint256) public votingPower;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
        // Update voting power when tokens are minted
        votingPower[to] += amount;
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
        // Update voting power when tokens are burned
        votingPower[from] -= amount;
    }

    function delegate(address delegatee) external {
        delegates[msg.sender] = delegatee;
        // Transfer voting power to delegatee
        if (delegatee != address(0)) {
            votingPower[delegatee] += balanceOf(msg.sender);
        }
    }

    function getCurrentVotes(address account) external view returns (uint256) {
        return votingPower[account];
    }
} 