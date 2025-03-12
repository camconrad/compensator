// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./Compensator.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

//  ________  ________  _____ ______   ________  ________  ___  ___  ________   ________     
// |\   ____\|\   __  \|\   _ \  _   \|\   __  \|\   __  \|\  \|\  \|\   ___  \|\   ___ \    
// \ \  \___|\ \  \|\  \ \  \\\__\ \  \ \  \|\  \ \  \|\  \ \  \\\  \ \  \\ \  \ \  \_|\ \   
//  \ \  \    \ \  \\\  \ \  \\|__| \  \ \   ____\ \  \\\  \ \  \\\  \ \  \\ \  \ \  \ \\ \  
//   \ \  \____\ \  \\\  \ \  \    \ \  \ \  \___|\ \  \\\  \ \  \\\  \ \  \\ \  \ \  \_\\ \ 
//    \ \_______\ \_______\ \__\    \ \__\ \__\    \ \_______\ \_______\ \__\\ \__\ \_______\
//     \|_______|\|_______|\|__|     \|__|\|__|     \|_______|\|_______|\|__| \|__|\|_______|

/**
 * @title CompensatorFactory
 * @notice A factory contract for deploying and managing instances of the Compensator contract.
 * This contract allows users to create new Compensator contracts for delegates and retrieve
 * existing ones.
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
    // Functions
    //////////////////////////

    /**
     * @notice Creates a new Compensator contract for a delegatee
     * @param delegatee The address of the delegatee
     * @param delegateeName The name of the delegatee
     * @return The address of the newly created Compensator contract
     */
    function createCompensator(address delegatee, string memory delegateeName) external returns (address) {
        // Deploy a new Compensator contract
        Compensator compensator = new Compensator();

        // Initialize the Compensator contract with the delegatee's address and name
        compensator.initialize(delegatee, delegateeName);

        // Add the new Compensator contract address to the list of compensators
        compensators.push(address(compensator));

        // Map the delegatee to their Compensator contract address
        delegateeToCompensator[delegatee] = address(compensator);

        // Return the address of the newly created Compensator contract
        return address(compensator);
    }

    /**
     * @notice Retrieves the Compensator contract address for a given delegatee
     * @param delegatee The address of the delegatee
     * @return The address of the Compensator contract associated with the delegatee
     */
    function getCompensator(address delegatee) external view returns (address) {
        return delegateeToCompensator[delegatee];
    }

    /**
     * @notice Retrieves the list of all deployed Compensator contract addresses
     * @return An array of all Compensator contract addresses
     */
    function getCompensators() public view returns (address[] memory) {
        return compensators;
    }
}
