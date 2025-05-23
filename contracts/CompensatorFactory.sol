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

    /// @notice Mapping from delegate addresses to their corresponding Compensator contract addresses
    /// @dev A delegate is someone who receives COMP delegations and can earn rewards
    mapping(address delegate => address compensator) public delegateToCompensator;

    /// @notice The COMP governance token contract
    address public immutable COMP_TOKEN;

    /// @notice The Compound Governor contract
    address public immutable COMPOUND_GOVERNOR;

    //////////////////////////
    // Events
    //////////////////////////

    /// @notice Emitted when a new Compensator contract is created
    /// @param delegate The address of the delegate (person who will receive COMP delegations)
    /// @param compensator The address of the newly created Compensator contract
    event CompensatorCreated(address indexed delegate, address indexed compensator);

    //////////////////////////
    // Constructor
    //////////////////////////

    /**
     * @notice Constructor that initializes the factory with the COMP token and Compound Governor addresses
     * @param _compToken The address of the COMP token contract
     * @param _compoundGovernor The address of the Compound Governor contract
     */
    constructor(address _compToken, address _compoundGovernor) {
        require(_compToken != address(0), "Invalid COMP token address");
        require(_compoundGovernor != address(0), "Invalid Compound Governor address");
        COMP_TOKEN = _compToken;
        COMPOUND_GOVERNOR = _compoundGovernor;
    }

    //////////////////////////
    // External Functions
    //////////////////////////

    /**
     * @notice Creates a new Compensator contract for a delegate
     * @param delegate The address of the delegate (person who will receive COMP delegations)
     * @param delegateName The name of the delegate
     * @return The address of the newly created Compensator contract
     */
    function createCompensator(address delegate, string calldata delegateName) external returns (address) {
        // Checks
        require(delegateToCompensator[delegate] == address(0), "Delegate already has a Compensator");

        // Effects
        // Deploy a new Compensator contract with constructor parameters
        Compensator compensator = new Compensator(
            delegate,
            delegateName,
            COMP_TOKEN,
            COMPOUND_GOVERNOR
        );

        // Add the new Compensator contract address to the list of compensators
        compensators.push(address(compensator));

        // Map the delegate to their Compensator contract address
        delegateToCompensator[delegate] = address(compensator);

        // Emit the CompensatorCreated event
        emit CompensatorCreated(delegate, address(compensator));

        // Return the address of the newly created Compensator contract
        return address(compensator);
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
    function getCompensators(uint256 offset, uint256 limit) external view returns (address[] memory) {
        // Checks
        uint256 totalCount = compensators.length;
        require(offset < totalCount, "Offset out of bounds");
        
        // Effects
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
