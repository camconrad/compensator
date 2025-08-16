// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev An ERC20 token that allows for public minting and burning for use in tests.
/// This fake contract provides more realistic testing scenarios than simple mocks.
contract ERC20Fake is ERC20 {
    /// @dev Emitted when tokens are minted
    event TokensMinted(address indexed to, uint256 amount);
    
    /// @dev Emitted when tokens are burned
    event TokensBurned(address indexed from, uint256 amount);
    
    /// @dev Emitted when minting is paused/unpaused
    event MintingPaused(address indexed by, bool paused);
    
    /// @dev Emitted when burning is paused/unpaused
    event BurningPaused(address indexed by, bool paused);

    /// @dev Whether minting is currently paused
    bool public mintingPaused;
    
    /// @dev Whether burning is currently paused
    bool public burningPaused;
    
    /// @dev Address that can pause/unpause operations
    address public immutable pauser;
    
    /// @dev Maximum supply cap (0 = unlimited)
    uint256 public maxSupply;
    
    /// @dev Current total supply
    uint256 public override totalSupply;

    /// @dev Constructor
    /// @param name Token name
    /// @param symbol Token symbol
    /// @param _maxSupply Maximum supply cap (0 = unlimited)
    /// @param _pauser Address that can pause operations
    constructor(
        string memory name,
        string memory symbol,
        uint256 _maxSupply,
        address _pauser
    ) ERC20(name, symbol) {
        maxSupply = _maxSupply;
        pauser = _pauser;
    }

    /// @dev Public mint function useful for testing
    /// @param to Address to mint tokens to
    /// @param amount Amount of tokens to mint
    function mint(address to, uint256 amount) public {
        require(!mintingPaused, "Minting is paused");
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Cannot mint zero tokens");
        
        if (maxSupply > 0) {
            require(totalSupply + amount <= maxSupply, "Would exceed max supply");
        }
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /// @dev Public burn function useful for testing
    /// @param from Address to burn tokens from
    /// @param amount Amount of tokens to burn
    function burn(address from, uint256 amount) public {
        require(!burningPaused, "Burning is paused");
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Cannot burn zero tokens");
        require(balanceOf(from) >= amount, "Insufficient balance to burn");
        
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }

    /// @dev Pause or unpause minting
    /// @param paused Whether to pause minting
    function setMintingPaused(bool paused) public {
        require(msg.sender == pauser, "Only pauser can pause minting");
        mintingPaused = paused;
        emit MintingPaused(msg.sender, paused);
    }

    /// @dev Pause or unpause burning
    /// @param paused Whether to pause burning
    function setBurningPaused(bool paused) public {
        require(msg.sender == pauser, "Only pauser can pause burning");
        burningPaused = paused;
        emit BurningPaused(msg.sender, paused);
    }

    /// @dev Override _mint to track total supply
    function _mint(address account, uint256 amount) internal virtual override {
        super._mint(account, amount);
        totalSupply += amount;
    }

    /// @dev Override _burn to track total supply
    function _burn(address account, uint256 amount) internal virtual override {
        super._burn(account, amount);
        totalSupply -= amount;
    }

    /// @dev Function to simulate transfer failures for testing
    /// @param to Recipient address
    /// @param amount Amount to transfer
    /// @param shouldFail Whether the transfer should fail
    function transferWithFailure(address to, uint256 amount, bool shouldFail) public returns (bool) {
        if (shouldFail) {
            return false;
        }
        return transfer(to, amount);
    }

    /// @dev Function to simulate approval failures for testing
    /// @param spender Spender address
    /// @param amount Amount to approve
    /// @param shouldFail Whether the approval should fail
    function approveWithFailure(address spender, uint256 amount, bool shouldFail) public returns (bool) {
        if (shouldFail) {
            return false;
        }
        return approve(spender, amount);
    }
}
