// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.30;

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
        address currentDelegate = delegates[msg.sender];
        uint256 currentBalance = balanceOf(msg.sender);
        
        // If currently delegated to someone, remove their voting power
        if (currentDelegate != address(0)) {
            // Only subtract if the current delegate has enough voting power
            if (votingPower[currentDelegate] >= currentBalance) {
                votingPower[currentDelegate] -= currentBalance;
            } else {
                // If they don't have enough, just set it to 0
                votingPower[currentDelegate] = 0;
            }
        }
        
        // Update delegation
        delegates[msg.sender] = delegatee;
        
        // Transfer voting power to new delegatee
        if (delegatee != address(0)) {
            votingPower[delegatee] += currentBalance;
        }
        
        // Remove voting power from delegator
        votingPower[msg.sender] = 0;
    }

    function getCurrentVotes(address account) external view returns (uint256) {
        return votingPower[account];
    }
} 