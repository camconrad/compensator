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

    /// @notice Default vote recorder address for new Compensator contracts
    address public immutable DEFAULT_VOTE_RECORDER;

    //////////////////////////
    // Events
    //////////////////////////

    /// @notice Emitted when a new Compensator contract is created
    /// @param delegate The address of the delegate (person who will receive COMP delegations)
    /// @param compensator The address of the newly created Compensator contract
    /// @param delegateName The name of the delegate
    event CompensatorCreated(
        address indexed delegate, 
        address indexed compensator, 
        string delegateName
    );

    //////////////////////////
    // Constructor
    //////////////////////////

    /**
     * @notice Constructor that initializes the factory with the COMP token and Compound Governor addresses
     * @param _compToken The address of the COMP token contract
     * @param _compoundGovernor The address of the Compound Governor contract
     * @param _defaultVoteRecorder The default vote recorder address
     */
    constructor(
        address _compToken, 
        address _compoundGovernor,
        address _defaultVoteRecorder
    ) {
        require(_compToken != address(0), "Invalid COMP token address");
        require(_compoundGovernor != address(0), "Invalid Compound Governor address");
        require(_defaultVoteRecorder != address(0), "Invalid vote recorder address");
        
        COMP_TOKEN = _compToken;
        COMPOUND_GOVERNOR = _compoundGovernor;
        DEFAULT_VOTE_RECORDER = _defaultVoteRecorder;
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
    function createCompensator(
        address delegate, 
        string calldata delegateName
    ) external returns (address) {
        return _createCompensator(delegate, delegateName, DEFAULT_VOTE_RECORDER);
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

    /**
     * @notice Checks if a delegate already has a Compensator contract
     * @param delegate The delegate address to check
     * @return True if the delegate has a Compensator, false otherwise
     */
    function hasCompensator(address delegate) external view returns (bool) {
        return delegateToCompensator[delegate] != address(0);
    }

    //////////////////////////
    // Internal Functions
    //////////////////////////

    /**
     * @notice Internal function to create a new Compensator contract
     * @param delegate The address of the delegate
     * @param delegateName The name of the delegate
     * @param voteRecorder The vote recorder address to use
     * @return The address of the newly created Compensator contract
     */
    function _createCompensator(
        address delegate,
        string calldata delegateName,
        address voteRecorder
    ) internal returns (address) {
        // Checks
        require(delegate != address(0), "Invalid delegate address");
        require(bytes(delegateName).length > 0, "Delegate name cannot be empty");
        require(delegateToCompensator[delegate] == address(0), "Delegate already has a Compensator");

        // Effects & Interactions
        // Deploy a new Compensator contract
        // Note: delegate becomes owner automatically in constructor
        Compensator compensator = new Compensator(
            delegate,           // delegate address
            delegateName,       // delegate name
            COMP_TOKEN,         // COMP token address
            COMPOUND_GOVERNOR,  // Governor address
            voteRecorder,       // vote recorder address
            address(this)       // FACTORY address
        );

        address compensatorAddress = address(compensator);

        // Add the new Compensator contract address to the list
        compensators.push(compensatorAddress);

        // Map the delegate to their Compensator contract address
        delegateToCompensator[delegate] = compensatorAddress;

        // Emit the CompensatorCreated event
        emit CompensatorCreated(delegate, compensatorAddress, delegateName);

        // Return the address of the newly created Compensator contract
        return compensatorAddress;
    }
}
