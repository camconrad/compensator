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
        // Initially delegate to self when minting tokens
        if (delegates[to] == address(0)) {
            delegates[to] = to;
            votingPower[to] += amount;
        } else {
            // Add voting power to current delegatee
            votingPower[delegates[to]] += amount;
        }
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
        // Remove voting power from current delegatee
        address currentDelegate = delegates[from];
        if (currentDelegate != address(0)) {
            votingPower[currentDelegate] -= amount;
        }
    }

    function delegate(address delegatee) external {
        address currentDelegate = delegates[msg.sender];
        uint256 balance = balanceOf(msg.sender);
        
        // Remove voting power from current delegatee
        if (currentDelegate != address(0)) {
            votingPower[currentDelegate] -= balance;
        }
        
        // Set new delegate
        delegates[msg.sender] = delegatee;
        
        // Add voting power to new delegatee
        if (delegatee != address(0)) {
            votingPower[delegatee] += balance;
        }
    }

    function getCurrentVotes(address account) external view returns (uint256) {
        return votingPower[account];
    }

    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        
        // Handle delegation updates for transfers (not mints/burns)
        if (from != address(0) && to != address(0)) {
            // Remove voting power from sender's delegatee
            address fromDelegate = delegates[from];
            if (fromDelegate != address(0)) {
                votingPower[fromDelegate] -= value;
            }
            
            // Add voting power to receiver's delegatee
            address toDelegate = delegates[to];
            if (toDelegate == address(0)) {
                // If receiver hasn't delegated yet, delegate to self
                delegates[to] = to;
                toDelegate = to;
            }
            votingPower[toDelegate] += value;
        }
    }
} 