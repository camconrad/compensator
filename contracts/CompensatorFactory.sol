// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {Compensator} from "./Compensator.sol";

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

    /// @notice The COMP governance token contract
    address public immutable COMP_TOKEN;

    /// @notice The Compound Governor contract
    address public immutable COMPOUND_GOVERNOR;

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

    //////////////////////////
    // Constructor
    //////////////////////////

    /**
     * @notice Constructor that initializes the factory with the COMP token and Compound Governor addresses
     * @param _compToken The address of the COMP token contract
     * @param _compoundGovernor The address of the Compound Governor contract
     */
    constructor(
        address _compToken, 
        address _compoundGovernor
    ) {
        require(_compToken != address(0), "Invalid COMP token address");
        require(_compoundGovernor != address(0), "Invalid Compound Governor address");
        
        COMP_TOKEN = _compToken;
        COMPOUND_GOVERNOR = _compoundGovernor;
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
        require(owner != address(0), "Invalid owner address");
        require(ownerToCompensator[owner] == address(0), "Owner already has a Compensator");

        // Effects & Interactions
        // Deploy a new Compensator contract with correct parameters
        Compensator compensator = new Compensator(
            COMP_TOKEN,         // COMP token address
            COMPOUND_GOVERNOR,  // Governor address  
            owner              // Owner address
        );

        address compensatorAddress = address(compensator);

        // Add the new Compensator contract address to the list
        compensators.push(compensatorAddress);

        // Map the owner to their Compensator contract address
        ownerToCompensator[owner] = compensatorAddress;

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

    //////////////////////////
    // Public Functions
    //////////////////////////

    /**
     * @notice Retrieves the total number of deployed Compensator contracts
     * @return The total count of Compensator contracts
     */
    function getCompensatorsCount() public view returns (uint256) {
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
     * @notice Gets the Compensator contract address for a given owner
     * @param owner The owner address
     * @return The Compensator contract address, or address(0) if none exists
     */
    function getCompensator(address owner) external view returns (address) {
        return ownerToCompensator[owner];
    }
}
