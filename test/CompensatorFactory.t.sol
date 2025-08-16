// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test, console2} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {CompensatorFactory} from "contracts/CompensatorFactory.sol";
import {Compensator} from "contracts/Compensator.sol";
import {MockERC20} from "contracts/mocks/MockERC20.sol";
import {MockGovernor} from "contracts/mocks/MockGovernor.sol";

// Import custom errors from CompensatorFactory
error InvalidCompTokenAddress();
error InvalidCompoundGovernorAddress();
error InvalidOwnerAddress();
error OwnerAlreadyHasCompensator();
error CompensatorNotCreatedByFactory();

contract CompensatorFactoryTest is Test {
    CompensatorFactory public compensatorFactory;
    MockERC20 public compToken;
    MockGovernor public compoundGovernor;
    address public admin;

    function setUp() public virtual {
        admin = makeAddr("admin");

        // Deploy mock contracts for testing
        compToken = new MockERC20("Compound", "COMP");
        compoundGovernor = new MockGovernor();

        // Create a supply for Mock COMP
        compToken.mint(admin, 1000000000000000000000000000000000000000);

        // Deploy the main contract
        compensatorFactory = new CompensatorFactory(
            address(compToken),
            address(compoundGovernor)
        );
    }

    function _assumeSafeAddress(address _address) internal pure {
        vm.assume(_address != address(0));
        // Basic exclusions src:withtally/staker
        address _console = 0x000000000000000000636F6e736F6c652e6c6f67;
        vm.assume(_address != _console);
        vm.assume(_address != address(vm) && _address != address(_console));
    }
}

contract Constructor is CompensatorFactoryTest {
    function test_SetsCompTokenAddress() public view {
        assertEq(compensatorFactory.COMP_TOKEN(), address(compToken));
    }

    function test_SetsCompoundGovernorAddress() public view {
        assertEq(compensatorFactory.COMPOUND_GOVERNOR(), address(compoundGovernor));
    }

    function test_InitializesEmptyCompensatorsArray() public view {
        assertEq(compensatorFactory.getCompensatorsCount(), 0);
    }

    function testFuzz_SetsConfigurationParametersToArbitraryValues(
        address _compToken,
        address _compoundGovernor
    ) public {
        _assumeSafeAddress(_compToken);
        _assumeSafeAddress(_compoundGovernor);

        CompensatorFactory _factory = new CompensatorFactory(_compToken, _compoundGovernor);

        assertEq(_factory.COMP_TOKEN(), _compToken);
        assertEq(_factory.COMPOUND_GOVERNOR(), _compoundGovernor);
    }

    function testFuzz_RevertIf_CompTokenAddressIsZero(address _compoundGovernor) public {
        _assumeSafeAddress(_compoundGovernor);

        vm.expectRevert(InvalidCompTokenAddress.selector);
        new CompensatorFactory(address(0), _compoundGovernor);
    }

    function testFuzz_RevertIf_CompoundGovernorAddressIsZero(address _compToken) public {
        _assumeSafeAddress(_compToken);

        vm.expectRevert(InvalidCompoundGovernorAddress.selector);
        new CompensatorFactory(_compToken, address(0));
    }
}

contract CreateCompensator is CompensatorFactoryTest {
    function testFuzz_CreatesNewCompensatorWithArbitraryOwner(address _owner) public {
        _assumeSafeAddress(_owner);

        address compensatorAddress = compensatorFactory.createCompensator(_owner);

        assertTrue(compensatorAddress != address(0));
        assertEq(compensatorFactory.ownerToCompensator(_owner), compensatorAddress);
        assertEq(compensatorFactory.compensatorToOriginalOwner(compensatorAddress), _owner);
        assertEq(Compensator(compensatorAddress).owner(), _owner);
    }

    function testFuzz_AddsCompensatorToArray(address _owner) public {
        _assumeSafeAddress(_owner);

        uint256 initialCount = compensatorFactory.getCompensatorsCount();
        address compensatorAddress = compensatorFactory.createCompensator(_owner);

        assertEq(compensatorFactory.getCompensatorsCount(), initialCount + 1);
        assertEq(compensatorFactory.compensators(initialCount), compensatorAddress);
    }

    function testFuzz_EmitsCompensatorCreatedEvent(address _owner) public {
        _assumeSafeAddress(_owner);

        // Record logs to capture the actual emitted event
        vm.recordLogs();
        
        address compensatorAddress = compensatorFactory.createCompensator(_owner);
        
        // Get the recorded logs
        Vm.Log[] memory logs = vm.getRecordedLogs();
        
        // Find the CompensatorCreated event (should be the last log)
        Vm.Log memory compensatorCreatedLog = logs[logs.length - 1];
        
        // Verify it's the CompensatorCreated event
        assertEq(compensatorCreatedLog.topics[0], keccak256("CompensatorCreated(address,address)"));
        
        // Verify the owner (first indexed parameter)
        assertEq(address(uint160(uint256(compensatorCreatedLog.topics[1]))), _owner);
        
        // Verify the compensator address (second indexed parameter)
        assertEq(address(uint160(uint256(compensatorCreatedLog.topics[2]))), compensatorAddress);
    }

    function testFuzz_RevertIf_OwnerIsZeroAddress() public {
        vm.expectRevert(InvalidOwnerAddress.selector);
        compensatorFactory.createCompensator(address(0));
    }

    function testFuzz_RevertIf_OwnerAlreadyHasCompensator(address _owner) public {
        _assumeSafeAddress(_owner);

        compensatorFactory.createCompensator(_owner);

        vm.expectRevert(OwnerAlreadyHasCompensator.selector);
        compensatorFactory.createCompensator(_owner);
    }

    function testFuzz_CreatesMultipleCompensatorsForDifferentOwners(uint256 _numOwners) public {
        // Bound number of owners between 10-1000
        _numOwners = bound(_numOwners, 10, 100);
        
        address[] memory owners = new address[](_numOwners);
        address[] memory compensators = new address[](_numOwners);

        // Create unique owners and their compensators
        for (uint256 i = 0; i < _numOwners; i++) {
            owners[i] = makeAddr(string(abi.encodePacked("owner", i)));
            compensators[i] = compensatorFactory.createCompensator(owners[i]);
        }

        // Verify total count
        assertEq(compensatorFactory.getCompensatorsCount(), _numOwners);

        // Verify all compensators are unique
        for (uint256 i = 0; i < _numOwners; i++) {
            for (uint256 j = i + 1; j < _numOwners; j++) {
                assertTrue(compensators[i] != compensators[j]);
            }
        }

        // Verify all mappings are correct
        for (uint256 i = 0; i < _numOwners; i++) {
            assertEq(compensatorFactory.ownerToCompensator(owners[i]), compensators[i]);
        }
    }
}

contract CreateCompensatorForSelf is CompensatorFactoryTest {
    function test_CreatesCompensatorForCaller() public {
        address caller = makeAddr("caller");
        
        vm.prank(caller);
        address compensatorAddress = compensatorFactory.createCompensatorForSelf();

        assertEq(compensatorFactory.ownerToCompensator(caller), compensatorAddress);
        assertEq(Compensator(compensatorAddress).owner(), caller);
    }

    function testFuzz_EmitsCompensatorCreatedEventForCaller(address _caller) public {
        _assumeSafeAddress(_caller);

        // Record logs to capture the actual emitted event
        vm.recordLogs();
        
        vm.prank(_caller);
        address compensatorAddress = compensatorFactory.createCompensatorForSelf();
        
        // Get the recorded logs
        Vm.Log[] memory logs = vm.getRecordedLogs();
        
        // Find the CompensatorCreated event (should be the last log)
        Vm.Log memory compensatorCreatedLog = logs[logs.length - 1];
        
        // Verify it's the CompensatorCreated event
        assertEq(compensatorCreatedLog.topics[0], keccak256("CompensatorCreated(address,address)"));
        
        // Verify the owner (first indexed parameter)
        assertEq(address(uint160(uint256(compensatorCreatedLog.topics[1]))), _caller);
        
        // Verify the compensator address (second indexed parameter)
        assertEq(address(uint160(uint256(compensatorCreatedLog.topics[2]))), compensatorAddress);
    }

    function testFuzz_RevertIf_CallerAlreadyHasCompensator(address _caller) public {
        _assumeSafeAddress(_caller);

        vm.prank(_caller);
        compensatorFactory.createCompensatorForSelf();

        vm.prank(_caller);
        vm.expectRevert(OwnerAlreadyHasCompensator.selector);
        compensatorFactory.createCompensatorForSelf();
    }
}

contract OnOwnershipTransferred is CompensatorFactoryTest {
    address owner1;
    address owner2;
    address compensatorAddress;

    function setUp() public override {
        super.setUp();
        owner1 = makeAddr("owner1");
        owner2 = makeAddr("owner2");
        compensatorAddress = compensatorFactory.createCompensator(owner1);
    }

    function test_UpdatesOwnerMappings() public {
        vm.prank(compensatorAddress);
        compensatorFactory.onOwnershipTransferred(owner1, owner2);

        assertEq(compensatorFactory.ownerToCompensator(owner1), address(0));
        assertEq(compensatorFactory.ownerToCompensator(owner2), compensatorAddress);
        assertEq(compensatorFactory.compensatorToOriginalOwner(compensatorAddress), owner2);
    }

    function test_EmitsCompensatorOwnershipTransferredEvent() public {
        vm.expectEmit(true, true, true, false);
        emit CompensatorFactory.CompensatorOwnershipTransferred(compensatorAddress, owner1, owner2);

        vm.prank(compensatorAddress);
        compensatorFactory.onOwnershipTransferred(owner1, owner2);
    }

    function testFuzz_RevertIf_CallerNotCreatedByFactory(address _notCompensator) public {
        vm.assume(_notCompensator != compensatorAddress);
        _assumeSafeAddress(_notCompensator);

        vm.prank(_notCompensator);
        vm.expectRevert(CompensatorNotCreatedByFactory.selector);
        compensatorFactory.onOwnershipTransferred(owner1, owner2);
    }

    function testFuzz_UpdatesOwnerMappingsWithArbitraryAddresses(
        address _oldOwner,
        address _newOwner
    ) public {
        _assumeSafeAddress(_oldOwner);
        _assumeSafeAddress(_newOwner);
        vm.assume(_oldOwner != _newOwner);

        vm.prank(compensatorAddress);
        compensatorFactory.onOwnershipTransferred(_oldOwner, _newOwner);

        assertEq(compensatorFactory.ownerToCompensator(_oldOwner), address(0));
        assertEq(compensatorFactory.ownerToCompensator(_newOwner), compensatorAddress);
        assertEq(compensatorFactory.compensatorToOriginalOwner(compensatorAddress), _newOwner);
    }
}

contract GetCompensatorsCount is CompensatorFactoryTest {
    function test_ReturnsZeroInitially() public view {
        assertEq(compensatorFactory.getCompensatorsCount(), 0);
    }

    function test_IncrementsWithEachNewCompensator() public {
        address owner1 = makeAddr("owner1");
        address owner2 = makeAddr("owner2");
        address owner3 = makeAddr("owner3");

        assertEq(compensatorFactory.getCompensatorsCount(), 0);

        compensatorFactory.createCompensator(owner1);
        assertEq(compensatorFactory.getCompensatorsCount(), 1);

        compensatorFactory.createCompensator(owner2);
        assertEq(compensatorFactory.getCompensatorsCount(), 2);

        compensatorFactory.createCompensator(owner3);
        assertEq(compensatorFactory.getCompensatorsCount(), 3);
    }

    function testFuzz_ReturnsCorrectCountAfterMultipleDeployments(uint8 _count) public {
        _count = uint8(bound(_count, 1, 10)); // Limit to reasonable number for gas

        for (uint256 i = 0; i < _count; i++) {
            address owner = address(uint160(i + 1000)); // Use different addresses
            compensatorFactory.createCompensator(owner);
        }

        assertEq(compensatorFactory.getCompensatorsCount(), _count);
    }
}

contract GetCompensators is CompensatorFactoryTest {
    address[] compensators;

    function setUp() public override {
        super.setUp();
        
        // Create 5 compensators for testing
        for (uint256 i = 0; i < 5; i++) {
            address owner = address(uint160(i + 1000));
            address compensator = compensatorFactory.createCompensator(owner);
            compensators.push(compensator);
        }
    }

    function test_ReturnsEmptyArrayWhenNoCompensators() public {
        CompensatorFactory emptyFactory = new CompensatorFactory(
            address(compToken),
            address(compoundGovernor)
        );

        address[] memory result = emptyFactory.getCompensators(0, 10);
        assertEq(result.length, 0);
    }

    function test_ReturnsEmptyArrayWhenOffsetExceedsTotalCount() public view {
        address[] memory result = compensatorFactory.getCompensators(10, 5);
        assertEq(result.length, 0);
    }

    function test_ReturnsAllCompensatorsWhenLimitExceedsCount() public view {
        address[] memory result = compensatorFactory.getCompensators(0, 10);
        assertEq(result.length, 5);
        
        for (uint256 i = 0; i < 5; i++) {
            assertEq(result[i], compensators[i]);
        }
    }

    function test_ReturnsCorrectSubsetWithOffsetAndLimit() public view {
        address[] memory result = compensatorFactory.getCompensators(1, 3);
        assertEq(result.length, 3);
        
        assertEq(result[0], compensators[1]);
        assertEq(result[1], compensators[2]);
        assertEq(result[2], compensators[3]);
    }

    function test_ReturnsPartialArrayWhenLimitExceedsRemainingItems() public view {
        address[] memory result = compensatorFactory.getCompensators(3, 5);
        assertEq(result.length, 2);
        
        assertEq(result[0], compensators[3]);
        assertEq(result[1], compensators[4]);
    }

    function testFuzz_ReturnsCorrectPaginationResults(
        uint256 _offset,
        uint256 _limit
    ) public view {
        _offset = bound(_offset, 0, 10);
        _limit = bound(_limit, 0, 10);

        address[] memory result = compensatorFactory.getCompensators(_offset, _limit);

        if (_offset >= compensators.length) {
            assertEq(result.length, 0);
        } else {
            uint256 expectedLength = _offset + _limit > compensators.length 
                ? compensators.length - _offset 
                : _limit;
            assertEq(result.length, expectedLength);
            
            for (uint256 i = 0; i < result.length; i++) {
                assertEq(result[i], compensators[_offset + i]);
            }
        }
    }
}

contract HasCompensator is CompensatorFactoryTest {
    function test_ReturnsFalseForAddressWithoutCompensator() public view {
        address owner = address(0x1234);
        assertFalse(compensatorFactory.hasCompensator(owner));
    }

    function test_ReturnsTrueForAddressWithCompensator() public {
        address owner = makeAddr("owner");
        compensatorFactory.createCompensator(owner);
        assertTrue(compensatorFactory.hasCompensator(owner));
    }

    function testFuzz_ReturnsFalseForArbitraryAddressWithoutCompensator(address _owner) public view {
        _assumeSafeAddress(_owner);
        assertFalse(compensatorFactory.hasCompensator(_owner));
    }

    function testFuzz_ReturnsTrueForArbitraryAddressWithCompensator(address _owner) public {
        _assumeSafeAddress(_owner);
        compensatorFactory.createCompensator(_owner);
        assertTrue(compensatorFactory.hasCompensator(_owner));
    }

    function test_ReturnsFalseAfterOwnershipTransfer() public {
        address owner1 = makeAddr("owner1");
        address owner2 = makeAddr("owner2");
        
        address compensatorAddress = compensatorFactory.createCompensator(owner1);
        assertTrue(compensatorFactory.hasCompensator(owner1));
        
        vm.prank(compensatorAddress);
        compensatorFactory.onOwnershipTransferred(owner1, owner2);
        
        assertFalse(compensatorFactory.hasCompensator(owner1));
        assertTrue(compensatorFactory.hasCompensator(owner2));
    }
}

contract GetOriginalOwner is CompensatorFactoryTest {
    function test_ReturnsZeroAddressForNonExistentCompensator() public view {
        address fakeCompensator = address(0x1234);
        assertEq(compensatorFactory.getOriginalOwner(fakeCompensator), address(0));
    }

    function test_ReturnsOriginalOwnerForValidCompensator() public {
        address owner = makeAddr("owner");
        address compensatorAddress = compensatorFactory.createCompensator(owner);
        
        assertEq(compensatorFactory.getOriginalOwner(compensatorAddress), owner);
    }

    function testFuzz_ReturnsOriginalOwnerForArbitraryOwner(address _owner) public {
        _assumeSafeAddress(_owner);
        
        address compensatorAddress = compensatorFactory.createCompensator(_owner);
        assertEq(compensatorFactory.getOriginalOwner(compensatorAddress), _owner);
    }

    function test_ReturnsUpdatedOwnerAfterTransfer() public {
        address owner1 = makeAddr("owner1");
        address owner2 = makeAddr("owner2");
        
        address compensatorAddress = compensatorFactory.createCompensator(owner1);
        assertEq(compensatorFactory.getOriginalOwner(compensatorAddress), owner1);
        
        vm.prank(compensatorAddress);
        compensatorFactory.onOwnershipTransferred(owner1, owner2);
        
        assertEq(compensatorFactory.getOriginalOwner(compensatorAddress), owner2);
    }

    function testFuzz_ReturnsZeroAddressForArbitraryNonExistentAddress(address _fakeAddress) public view {
        _assumeSafeAddress(_fakeAddress);
        assertEq(compensatorFactory.getOriginalOwner(_fakeAddress), address(0));
    }
}
