// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import "./Compensator.sol";

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
    // Variables
    //////////////////////////

    /// @notice Array of all deployed Compensator contract addresses
    address[] public compensators;

    /// @notice Mapping from delegatee addresses to their corresponding Compensator contract addresses
    mapping(address => address) public delegateeToCompensator;

    //////////////////////////
    // Events
    //////////////////////////

    /// @notice Emitted when a new Compensator contract is created
    /// @param delegatee The address of the delegatee for whom the Compensator is created
    /// @param compensator The address of the newly created Compensator contract
    event CompensatorCreated(address indexed delegatee, address indexed compensator);

    //////////////////////////
    // Functions
    //////////////////////////

    /**
     * @notice Creates a new Compensator contract for a delegatee
     * @param delegatee The address of the delegatee
     * @param delegateeName The name of the delegatee
     * @return The address of the newly created Compensator contract
     */
    function createCompensator(address delegatee, string memory delegateeName) external returns (address) {
        // Check if contract has already been created
        require(delegateeToCompensator[delegatee] == address(0), "Delegatee already has a Compensator");

        // Deploy a new Compensator contract with constructor parameters
        Compensator compensator = new Compensator(delegatee, delegateeName);

        // Add the new Compensator contract address to the list of compensators
        compensators.push(address(compensator));

        // Map the delegatee to their Compensator contract address
        delegateeToCompensator[delegatee] = address(compensator);

        // Emit the CompensatorCreated event
        emit CompensatorCreated(delegatee, address(compensator));

        // Return the address of the newly created Compensator contract
        return address(compensator);
    }

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
    function getCompensators(uint256 offset, uint256 limit) public view returns (address[] memory) {
        uint256 totalCount = compensators.length;
        
        // Validate pagination parameters
        require(offset < totalCount, "Offset out of bounds");
        
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
}
