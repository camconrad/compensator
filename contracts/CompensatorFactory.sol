// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.30;

import {Compensator} from "./Compensator.sol";

// Custom Errors
error InvalidCompTokenAddress();
error InvalidOwnerAddress();
error OwnerAlreadyHasCompensator();
error CompensatorNotCreatedByFactory();

//  ________  ________  _____ ______   ________  ________  ___  ___  ________   ________     
// |\   ____\|\   __  \|\   _ \  _   \|\   __  \|\   __  \|\  \|\  \|\   ___  \|\   ___ \    
// \ \  \___|\ \  \|\  \ \  \\\__\ \  \ \  \|\  \ \  \|\  \ \  \\\  \ \  \\ \  \ \  \_|\ \   
//  \ \  \    \ \  \\\  \ \  \\|__| \  \ \   ____\ \  \\\  \ \  \\\  \ \  \\ \  \ \  \ \\ \  
//   \ \  \____\ \  \\\  \ \  \    \ \  \ \  \___|\ \  \\\  \ \  \\\  \ \  \\ \  \ \  \_\\ \ 
//    \ \_______\ \_______\ \__\    \ \__\ \__\    \ \_______\ \_______\ \__\\ \__\ \_______\
//     \|_______|\|_______|\|__|     \|__|\|__|     \|_______|\|_______|\|__| \|__|\|_______|

/**
 * @title CompensatorFactory
 * @notice A factory contract for deploying and retrieving Compensator instances.
 * @custom:security-contact support@compensator.io
 */
contract CompensatorFactory {
    //////////////////////////
    // State Variables
    //////////////////////////

    /// @notice Array of all deployed Compensator contract addresses
    address[] public compensators;

    /// @notice Mapping from owner addresses to their corresponding Compensator contract addresses
    mapping(address owner => address compensator) public ownerToCompensator;

    /// @notice Reverse mapping from compensator addresses to their original owner (for ownership transfer tracking)
    mapping(address compensator => address originalOwner) public compensatorToOriginalOwner;

    /// @notice The COMP governance token contract
    address public immutable COMP_TOKEN;



    //////////////////////////
    // Events
    //////////////////////////

    /// @notice Emitted when a new Compensator contract is created
    /// @param owner The address of the owner who will control the Compensator
    /// @param compensator The address of the newly created Compensator contract
    event CompensatorCreated(
        address indexed owner, 
        address indexed compensator
    );

    /// @notice Emitted when ownership of a Compensator is transferred
    /// @param compensator The address of the Compensator contract
    /// @param oldOwner The previous owner address
    /// @param newOwner The new owner address
    event CompensatorOwnershipTransferred(
        address indexed compensator,
        address indexed oldOwner,
        address indexed newOwner
    );

    //////////////////////////
    // Constructor
    //////////////////////////

    /**
     * @notice Constructor that initializes the factory with the COMP token address
     * @param _compToken The address of the COMP token contract
     */
    constructor(
        address _compToken
    ) {
        if (_compToken == address(0)) revert InvalidCompTokenAddress();
        
        COMP_TOKEN = _compToken;
    }

    //////////////////////////
    // External Functions
    //////////////////////////

    /**
     * @notice Creates a new Compensator contract for an owner
     * @param owner The address that will own and control the Compensator
     * @return The address of the newly created Compensator contract
     */
    function createCompensator(address owner) public returns (address) {
        // Checks
        if (owner == address(0)) revert InvalidOwnerAddress();
        if (ownerToCompensator[owner] != address(0)) revert OwnerAlreadyHasCompensator();

        // Effects & Interactions
        // Deploy a new Compensator contract with correct parameters
        Compensator compensator = new Compensator(
            COMP_TOKEN,         // COMP token address
            owner              // Owner address
        );

        address compensatorAddress = address(compensator);

        // Add the new Compensator contract address to the list
        compensators.push(compensatorAddress);

        // Map the owner to their Compensator contract address
        ownerToCompensator[owner] = compensatorAddress;

        // Store the original owner for ownership transfer tracking
        compensatorToOriginalOwner[compensatorAddress] = owner;

        // Emit the CompensatorCreated event
        emit CompensatorCreated(owner, compensatorAddress);

        // Return the address of the newly created Compensator contract
        return compensatorAddress;
    }

    /**
     * @notice Creates a new Compensator contract for the caller
     * @return The address of the newly created Compensator contract
     */
    function createCompensatorForSelf() external returns (address) {
        return createCompensator(msg.sender);
    }

    /**
     * @notice Called by a Compensator contract when ownership is transferred
     * @dev This function can only be called by a Compensator contract that was created by this factory
     * @param oldOwner The previous owner address
     * @param newOwner The new owner address
     */
    function onOwnershipTransferred(address oldOwner, address newOwner) external {
        // Verify this compensator was created by this factory
        if (compensatorToOriginalOwner[msg.sender] == address(0)) revert CompensatorNotCreatedByFactory();
        
        // Update the owner mapping
        ownerToCompensator[oldOwner] = address(0);
        ownerToCompensator[newOwner] = msg.sender;
        
        // Update the original owner mapping to track the new owner
        compensatorToOriginalOwner[msg.sender] = newOwner;
        
        emit CompensatorOwnershipTransferred(msg.sender, oldOwner, newOwner);
    }

    //////////////////////////
    // Public Functions
    //////////////////////////

    /**
     * @notice Retrieves the total number of deployed Compensator contracts
     * @return The total count of Compensator contracts
     */
    function getCompensatorsCount() external view returns (uint256) {
        return compensators.length;
    }

    /**
     * @notice Retrieves a paginated list of Compensator contract addresses
     * @param offset The starting index for the pagination
     * @param limit The maximum number of addresses to return
     * @return An array of Compensator contract addresses for the requested page
     */
    function getCompensators(
        uint256 offset, 
        uint256 limit
    ) external view returns (address[] memory) {
        // Checks
        uint256 totalCount = compensators.length;
        if (totalCount == 0 || offset >= totalCount) {
            return new address[](0);
        }
        
        // Calculate the actual number of items to return
        uint256 itemsToReturn = limit;
        if (offset + limit > totalCount) {
            itemsToReturn = totalCount - offset;
        }
        
        // Create the result array
        address[] memory result = new address[](itemsToReturn);
        
        // Copy the requested items
        for (uint256 i = 0; i < itemsToReturn; i++) {
            result[i] = compensators[offset + i];
        }        
        return result;
    }

    /**
     * @notice Checks if an owner already has a Compensator contract
     * @param owner The owner address to check
     * @return True if the owner has a Compensator, false otherwise
     */
    function hasCompensator(address owner) external view returns (bool) {
        return ownerToCompensator[owner] != address(0);
    }

    /**
     * @notice Gets the original owner of a Compensator contract
     * @param compensator The Compensator contract address
     * @return The original owner address, or address(0) if not found
     */
    function getOriginalOwner(address compensator) external view returns (address) {
        return compensatorToOriginalOwner[compensator];
    }
}
