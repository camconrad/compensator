// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test, console2} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {Compensator} from "contracts/Compensator.sol";
import {CompensatorFactory} from "contracts/CompensatorFactory.sol";
import {MockERC20} from "contracts/mocks/MockERC20.sol";
import {MockGovernor} from "contracts/mocks/MockGovernor.sol";
import {IComp} from "contracts/IComp.sol";
import {IGovernor} from "contracts/IGovernor.sol";
import {Ownable} from "lib/openzeppelin-contracts/contracts/access/Ownable.sol";


contract CompensatorTest is Test {
    Compensator public compensator;
    CompensatorFactory public factory;
    MockERC20 public compToken;
    MockGovernor public compoundGovernor;
    address public owner;
    address public user1;
    address public user2;
    
    // Constants for testing
    uint256 public constant INITIAL_COMP_SUPPLY = 10_000_000e18; // 10M COMP
    uint256 public constant DELEGATION_CAP_PERCENT = 500; // 5% in basis points
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant REWARD_PRECISION = 1e18;
    uint256 public constant MIN_LOCK_PERIOD = 7 days;
    uint256 public constant ACTIVE_PROPOSAL_LOCK_EXTENSION = 3 days;
    uint256 public constant MAX_PROPOSAL_RESOLUTION_TIME = 30 days;
    uint256 public constant MAX_BLOCKS_PER_DAY = 50000;

    function setUp() public virtual {
        owner = makeAddr("owner");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        // Deploy mock contracts
        compToken = new MockERC20("Compound", "COMP");
        compoundGovernor = new MockGovernor();

        // Set initial COMP supply
        compToken.mint(address(this), INITIAL_COMP_SUPPLY);

        // Deploy factory
        factory = new CompensatorFactory(address(compToken), address(compoundGovernor));

        // Deploy compensator through factory
        vm.prank(owner);
        address compensatorAddress = factory.createCompensator(owner);
        compensator = Compensator(compensatorAddress);

        // Distribute some COMP to test users
        compToken.transfer(owner, 1_000_000e18);
        compToken.transfer(user1, 500_000e18);
        compToken.transfer(user2, 500_000e18);

        // Set block timestamp to non-zero value
        vm.warp(1000);
    }

    function _assumeSafeAddress(address _address) internal pure {
        vm.assume(_address != address(0));
        address _console = 0x000000000000000000636F6e736F6c652e6c6f67;
        vm.assume(_address != _console);
        vm.assume(_address != address(vm) && _address != address(_console));
    }

    function _boundToReasonableAmount(uint256 _amount) internal pure returns (uint256) {
        return bound(_amount, 1, 500_000e18);
    }

    function _boundToReasonableRewardRate(uint256 _rate) internal pure returns (uint256) {
        return bound(_rate, 0, 1e18); // 0 to 1 COMP per second
    }

    function _boundToReasonableTime(uint256 _time) internal pure returns (uint256) {
        return bound(_time, 1, 365 days);
    }

    function _boundToSafeTime(uint256 _time) internal pure returns (uint256) {
        return bound(_time, 1, 1e40);
    }

    function _boundToValidSupport(uint8 _support) internal pure returns (uint8) {
        return uint8(bound(_support, 0, 1));
    }

    function _setupInitialDeposits() internal {
        // Owner deposits some COMP for rewards
        vm.startPrank(owner);
        compToken.approve(address(compensator), 100_000e18);
        compensator.ownerDeposit(100_000e18);
        vm.stopPrank();

        // Users deposit COMP
        vm.startPrank(user1);
        compToken.approve(address(compensator), 10_000e18);
        compensator.userDeposit(10_000e18);
        vm.stopPrank();

        vm.startPrank(user2);
        compToken.approve(address(compensator), 20_000e18);
        compensator.userDeposit(20_000e18);
        vm.stopPrank();
    }

    function _setupRewardRate() internal {
        vm.prank(owner);
        compensator.setRewardRate(1e16); // 0.01 COMP per second
    }

    function _createActiveProposal() internal returns (uint256 proposalId) {
        proposalId = 1;
        compoundGovernor.setState(proposalId, IGovernor.ProposalState.Active);
        compoundGovernor.setProposalSnapshot(proposalId, block.number + 100);
        // Register the proposal by staking on it
        vm.startPrank(user1);
        compToken.approve(address(compensator), 1e18);
        compensator.stakeForProposal(proposalId, 1, 1e18);
        vm.stopPrank();
        return proposalId;
    }

    function _createSucceededProposal() internal returns (uint256 proposalId) {
        proposalId = 2;
        // First set it as Active so we can register it
        compoundGovernor.setState(proposalId, IGovernor.ProposalState.Active);
        compoundGovernor.setProposalSnapshot(proposalId, block.number + 100);
        // Register the proposal by staking on it
        vm.startPrank(user1);
        compToken.approve(address(compensator), 1e18);
        compensator.stakeForProposal(proposalId, 1, 1e18);
        vm.stopPrank();
        // Now change state to Succeeded
        compoundGovernor.setState(proposalId, IGovernor.ProposalState.Succeeded);
        return proposalId;
    }

    function _createDefeatedProposal() internal returns (uint256 proposalId) {
        proposalId = 3;
        // First set it as Active so we can register it
        compoundGovernor.setState(proposalId, IGovernor.ProposalState.Active);
        compoundGovernor.setProposalSnapshot(proposalId, block.number + 100);
        // Register the proposal by staking on it (ensure user1 has tokens and approval)
        vm.startPrank(user1);
        compToken.approve(address(compensator), 1e18);
        compensator.stakeForProposal(proposalId, 1, 1e18);
        vm.stopPrank();
        // Now change state to Defeated
        compoundGovernor.setState(proposalId, IGovernor.ProposalState.Defeated);
        return proposalId;
    }
}

contract Constructor is CompensatorTest {
    function test_SetsCorrectTokenAddresses() public view {
        assertEq(address(compensator.COMP_TOKEN()), address(compToken));
        assertEq(address(compensator.COMPOUND_GOVERNOR()), address(compoundGovernor));
    }

    function test_SetsCorrectOwner() public view {
        assertEq(compensator.owner(), owner);
    }

    function test_SetsCorrectFactory() public view {
        assertEq(compensator.FACTORY(), address(factory));
    }

    function test_InitializesRewardIndex() public view {
        assertEq(compensator.rewardIndex(), REWARD_PRECISION);
    }

    function test_CalculatesDelegationCap() public view {
        uint256 expectedCap = (INITIAL_COMP_SUPPLY * DELEGATION_CAP_PERCENT) / BASIS_POINTS;
        assertEq(compensator.delegationCap(), expectedCap);
    }

    function test_InitializesConstants() public view {
        assertEq(compensator.DELEGATION_CAP_PERCENT(), 500);
        assertEq(compensator.BASIS_POINTS(), 10000);
        assertEq(compensator.REWARD_PRECISION(), 1e18);
        assertEq(compensator.MIN_LOCK_PERIOD(), 7 days);
        assertEq(compensator.ACTIVE_PROPOSAL_LOCK_EXTENSION(), 3 days);
        assertEq(compensator.MAX_PROPOSAL_RESOLUTION_TIME(), 30 days);
        assertEq(compensator.MAX_BLOCKS_PER_DAY(), 50000);
    }

    function test_InitializesBlocksPerDay() public view {
        assertEq(compensator.blocksPerDay(), 6500);
    }

    function testFuzz_SetsCorrectConfigurationParametersWithArbitraryAddresses(
        address _compToken,
        address _compoundGovernor,
        address _owner
    ) public {
        _assumeSafeAddress(_compToken);
        _assumeSafeAddress(_compoundGovernor);
        _assumeSafeAddress(_owner);

        MockERC20 _comp = new MockERC20("Test", "TEST");
        _comp.mint(address(this), INITIAL_COMP_SUPPLY);
        MockGovernor _gov = new MockGovernor();

        CompensatorFactory _factory = new CompensatorFactory(address(_comp), address(_gov));
        
        vm.prank(_owner);
        address compensatorAddr = _factory.createCompensator(_owner);
        Compensator _compensator = Compensator(compensatorAddr);

        assertEq(address(_compensator.COMP_TOKEN()), address(_comp));
        assertEq(address(_compensator.COMPOUND_GOVERNOR()), address(_gov));
        assertEq(_compensator.owner(), _owner);
        assertEq(_compensator.FACTORY(), address(_factory));
    }

    function test_EmitsDelegationCapUpdatedEvent(address _newOwner) public {
        _assumeSafeAddress(_newOwner);

        vm.expectEmit();
        emit Compensator.DelegationCapUpdated(0, (INITIAL_COMP_SUPPLY * DELEGATION_CAP_PERCENT) / BASIS_POINTS, INITIAL_COMP_SUPPLY);
        
        vm.prank(owner);
        factory.createCompensator(_newOwner);
    }

    function testFuzz_RevertIf_CompTokenAddressIsZero(address _compoundGovernor, address _owner) public {
        _assumeSafeAddress(_compoundGovernor);
        _assumeSafeAddress(_owner);

        vm.expectRevert(Compensator.InvalidCompTokenAddress.selector);
        new Compensator(address(0), _compoundGovernor, _owner);
    }

    function testFuzz_RevertIf_CompoundGovernorAddressIsZero(address _compToken, address _owner) public {
        _assumeSafeAddress(_compToken);
        _assumeSafeAddress(_owner);

        vm.expectRevert(Compensator.InvalidCompoundGovernorAddress.selector);
        new Compensator(_compToken, address(0), _owner);
    }

    function testFuzz_RevertIf_OwnerAddressIsZero(address _compToken, address _compoundGovernor) public {
        _assumeSafeAddress(_compToken);
        _assumeSafeAddress(_compoundGovernor);

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));
        new Compensator(_compToken, _compoundGovernor, address(0));
    }

    function test_RevertIf_CompTokenHasZeroTotalSupply() public {
        MockERC20 zeroSupplyToken = new MockERC20("Zero", "ZERO");
        MockGovernor gov = new MockGovernor();
        
        vm.expectRevert(Compensator.InvalidCompTotalSupply.selector);
        new Compensator(address(zeroSupplyToken), address(gov), owner);
    }

    function test_RevertIf_DelegationCapIsZero() public {
        MockERC20 tinySupplyToken = new MockERC20("Tiny", "TINY");
        tinySupplyToken.mint(address(this), 1); // Very small supply that would result in zero cap
        MockGovernor gov = new MockGovernor();
        
        vm.expectRevert(Compensator.DelegationCapTooSmall.selector);
        new Compensator(address(tinySupplyToken), address(gov), owner);
    }
}

contract OwnerDeposit is CompensatorTest {
    function testFuzz_DepositsCompForRewards(uint256 _amount) public {
        _amount = _boundToReasonableAmount(_amount);
        
        vm.startPrank(owner);
        compToken.approve(address(compensator), _amount);
        compensator.ownerDeposit(_amount);
        vm.stopPrank();

        assertEq(compensator.availableRewards(), _amount);
        assertEq(compToken.balanceOf(address(compensator)), _amount);
    }

    function testFuzz_EmitsOwnerDepositEvent(uint256 _amount) public {
        _amount = _boundToReasonableAmount(_amount);
        
        vm.startPrank(owner);
        compToken.approve(address(compensator), _amount);
        
        vm.expectEmit();
        emit Compensator.OwnerDeposit(owner, _amount);
        compensator.ownerDeposit(_amount);
        vm.stopPrank();
    }

    function testFuzz_IncreasesAvailableRewardsOnMultipleDeposits(uint256 _amount1, uint256 _amount2) public {
        _amount1 = _boundToReasonableAmount(_amount1);
        _amount2 = _boundToReasonableAmount(_amount2);
        
        vm.startPrank(owner);
        compToken.approve(address(compensator), _amount1 + _amount2);
        
        compensator.ownerDeposit(_amount1);
        uint256 afterFirst = compensator.availableRewards();
        
        compensator.ownerDeposit(_amount2);
        uint256 afterSecond = compensator.availableRewards();
        
        vm.stopPrank();

        assertEq(afterFirst, _amount1);
        assertEq(afterSecond, _amount1 + _amount2);
    }

    function testFuzz_RevertIf_AmountIsZero() public {
        vm.prank(owner);
        vm.expectRevert(Compensator.AmountMustBeGreaterThanZero.selector);
        compensator.ownerDeposit(0);
    }

    function testFuzz_RevertIf_CallerIsNotOwner(address _caller, uint256 _amount) public {
        vm.assume(_caller != owner);
        _assumeSafeAddress(_caller);
        _amount = _boundToReasonableAmount(_amount);

        vm.prank(_caller);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, _caller));
        compensator.ownerDeposit(_amount);
    }
}

contract OwnerWithdraw is CompensatorTest {
    function setUp() public override {
        super.setUp();
        _setupInitialDeposits();
    }

    function testFuzz_WithdrawsAvailableRewards(uint256 _withdrawAmount) public {
        uint256 availableRewards = compensator.availableRewards();
        _withdrawAmount = bound(_withdrawAmount, 1, availableRewards);
        
        uint256 ownerBalanceBefore = compToken.balanceOf(owner);
        
        vm.prank(owner);
        compensator.ownerWithdraw(_withdrawAmount);

        assertEq(compensator.availableRewards(), availableRewards - _withdrawAmount);
        assertEq(compToken.balanceOf(owner), ownerBalanceBefore + _withdrawAmount);
    }

    function testFuzz_EmitsOwnerWithdrawEvent(uint256 _withdrawAmount) public {
        uint256 availableRewards = compensator.availableRewards();
        _withdrawAmount = bound(_withdrawAmount, 1, availableRewards);
        
        vm.prank(owner);
        vm.expectEmit();
        emit Compensator.OwnerWithdraw(owner, _withdrawAmount);
        compensator.ownerWithdraw(_withdrawAmount);
    }

    function testFuzz_RevertIf_AmountExceedsAvailableRewards(uint256 _excessAmount) public {
        uint256 availableRewards = compensator.availableRewards();
        _excessAmount = bound(_excessAmount, availableRewards + 1, availableRewards + 1_000_000e18);
        
        vm.prank(owner);
        vm.expectRevert(Compensator.AmountExceedsAvailableRewards.selector);
        compensator.ownerWithdraw(_excessAmount);
    }

    function testFuzz_RevertIf_CallerIsNotOwner(address _caller, uint256 _amount) public {
        vm.assume(_caller != owner);
        _assumeSafeAddress(_caller);
        _amount = _boundToReasonableAmount(_amount);

        vm.prank(_caller);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, _caller));
        compensator.ownerWithdraw(_amount);
    }
    function testFuzz_CannotWithdrawPendingRewards(uint256 _timePassed) public {
        // Set reward rate and let time pass to accumulate pending rewards
        _setupRewardRate();
        _timePassed = bound(_timePassed, 1, 365 days); // Reasonable time range
        vm.warp(block.timestamp + _timePassed);
        
        uint256 pendingRewards = compensator.totalPendingRewards();
        uint256 availableRewards = compensator.availableRewards();
        uint256 withdrawableAmount = availableRewards - pendingRewards;
        
        // Try to withdraw more than withdrawable amount
        vm.prank(owner);
        vm.expectRevert(Compensator.AmountExceedsAvailableRewards.selector);
        compensator.ownerWithdraw(withdrawableAmount + 1);
    }
}

contract SetRewardRate is CompensatorTest {
    function testFuzz_SetsNewRewardRate(uint256 _newRate) public {
        _newRate = _boundToReasonableRewardRate(_newRate);
        vm.assume(_newRate != compensator.rewardRate());
        
        vm.prank(owner);
        compensator.setRewardRate(_newRate);
        
        assertEq(compensator.rewardRate(), _newRate);
    }

    function testFuzz_EmitsRewardRateUpdateEvent(uint256 _newRate) public {
        _newRate = _boundToReasonableRewardRate(_newRate);
        vm.assume(_newRate != compensator.rewardRate());
        
        vm.prank(owner);
        vm.expectEmit();
        emit Compensator.RewardRateUpdate(owner, _newRate);
        compensator.setRewardRate(_newRate);
    }

    function testFuzz_RevertIf_NewRateIsSameAsCurrent(uint256 _currentRate) public {
        _currentRate = _boundToReasonableRewardRate(_currentRate);
        
        // Skip if the rate is already the same as initial (0)
        vm.assume(_currentRate != compensator.rewardRate());
        
        vm.prank(owner);
        compensator.setRewardRate(_currentRate);
        
        vm.prank(owner);
        vm.expectRevert(Compensator.NewRateMustBeDifferent.selector);
        compensator.setRewardRate(_currentRate);
    }

    function testFuzz_RevertIf_CallerIsNotOwner(address _caller, uint256 _newRate) public {
        vm.assume(_caller != owner);
        _assumeSafeAddress(_caller);
        _newRate = _boundToReasonableRewardRate(_newRate);

        vm.prank(_caller);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, _caller));
        compensator.setRewardRate(_newRate);
    }

    function testFuzz_UpdatesRewardsIndexBeforeChangingRate(uint256 _timePassed, uint256 _newRate) public {
        _setupInitialDeposits();
        _setupRewardRate();
        
        _newRate = _boundToReasonableRewardRate(_newRate);
        vm.assume(_newRate != compensator.rewardRate());
        
        // Use safe time bounds to prevent overflow in calculations
        _timePassed = _boundToSafeTime(_timePassed);
        vm.warp(block.timestamp + _timePassed);
        
        uint256 rewardIndexBefore = compensator.rewardIndex();
        
        vm.prank(owner);
        compensator.setRewardRate(_newRate);
        
        uint256 rewardIndexAfter = compensator.rewardIndex();
        assertTrue(rewardIndexAfter > rewardIndexBefore);
    }
}

contract CastVote is CompensatorTest {
    uint256 proposalId;

    function setUp() public override {
        super.setUp();
        _setupInitialDeposits();
        proposalId = _createActiveProposal();
    }

    function testFuzz_CastsVoteWithReason(uint8 _support, string memory _reason) public {
        _support = _boundToValidSupport(_support);
        
        vm.prank(owner);
        compensator.castVote(proposalId, _support, _reason);
        
        assertTrue(compensator.contractVoted(proposalId));
        assertEq(compensator.contractVoteDirection(proposalId), _support);
        assertEq(compensator.voteCount(), 1);
    }

    function testFuzz_CastsVoteWithoutReason(uint8 _support) public {
        _support = _boundToValidSupport(_support);
        
        vm.prank(owner);
        compensator.castVote(proposalId, _support);
        
        assertTrue(compensator.contractVoted(proposalId));
        assertEq(compensator.contractVoteDirection(proposalId), _support);
    }

        function testFuzz_StoresVoteInformation(uint8 _support, string memory _reason) public {
        _support = _boundToValidSupport(_support);
        uint256 expectedVotingPower = compToken.getCurrentVotes(address(compensator));
        
        vm.prank(owner);
        compensator.castVote(proposalId, _support, _reason);
        
        (uint8 direction, uint256 blockNumber, bytes32 txHash, uint256 timestamp, uint256 votingPower, string memory reason) = 
            compensator.getVoteInfo(proposalId);
        
        assertEq(direction, _support);
        assertEq(blockNumber, block.number);
        assertEq(timestamp, block.timestamp);
        assertEq(votingPower, expectedVotingPower);
        assertEq(reason, _reason);
    }

    function testFuzz_UpdatesDelegatePerformanceMetrics(uint8 _support) public {
        _support = _boundToValidSupport(_support);
        uint256 expectedVotingPower = compToken.getCurrentVotes(address(compensator));
        
        vm.prank(owner);
        compensator.castVote(proposalId, _support);
        
        (,, uint256 totalRewardsEarned, uint256 totalVotingPowerUsed, uint256 averageVotingPowerPerVote) = 
            compensator.delegateInfo();
        
        assertEq(totalVotingPowerUsed, expectedVotingPower);
        assertEq(averageVotingPowerPerVote, expectedVotingPower);
    }

    function testFuzz_EmitsVoteCastEvent(uint8 _support, string memory _reason) public {
        _support = _boundToValidSupport(_support);
        uint256 expectedVotingPower = compToken.getCurrentVotes(address(compensator));
        
        vm.prank(owner);
        vm.expectEmit();
        emit Compensator.VoteCast(proposalId, _support, block.number, blockhash(block.number - 1), expectedVotingPower, _reason);
        compensator.castVote(proposalId, _support, _reason);
    }

    function testFuzz_EmitsVoteCastEventWithoutReason(uint8 _support) public {
        _support = _boundToValidSupport(_support);
        uint256 expectedVotingPower = compToken.getCurrentVotes(address(compensator));
        
        vm.prank(owner);
        vm.expectEmit();
        emit Compensator.VoteCast(proposalId, _support, block.number, blockhash(block.number - 1), expectedVotingPower, "");
        compensator.castVote(proposalId, _support);
    }

    function testFuzz_RevertIf_SupportValueIsInvalid(uint8 _invalidSupport) public {
        vm.assume(_invalidSupport > 1);
        
        vm.prank(owner);
        vm.expectRevert(Compensator.InvalidSupportValue.selector);
        compensator.castVote(proposalId, _invalidSupport);
    }

    function testFuzz_RevertIf_AlreadyVotedOnProposal(uint8 _support) public {
        _support = _boundToValidSupport(_support);
        
        vm.startPrank(owner);
        compensator.castVote(proposalId, _support);
        
        vm.expectRevert(Compensator.AlreadyVotedOnProposal.selector);
        compensator.castVote(proposalId, _support);
        vm.stopPrank();
    }

    function testFuzz_RevertIf_ProposalStateIsInvalid(uint256 _inactiveProposalId, uint8 _support) public {
        _support = _boundToValidSupport(_support);
        vm.assume(_inactiveProposalId != proposalId);
        compoundGovernor.setState(_inactiveProposalId, IGovernor.ProposalState.Defeated);
        
        vm.prank(owner);
        vm.expectRevert(Compensator.InvalidProposalState.selector);
        compensator.castVote(_inactiveProposalId, _support);
    }

    function testFuzz_RevertIf_CallerIsNotOwner(address _caller, uint8 _support) public {
        vm.assume(_caller != owner);
        _assumeSafeAddress(_caller);
        _support = _boundToValidSupport(_support);

        vm.prank(_caller);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, _caller));
        compensator.castVote(proposalId, _support);
    }
}

contract UserDeposit is CompensatorTest {
    function testFuzz_DepositsCompAndMintsTokens(uint256 _amount) public {
        _amount = _boundToReasonableAmount(_amount);
        uint256 delegationCap = compensator.delegationCap();
        _amount = bound(_amount, 1, delegationCap);
        
        vm.startPrank(user1);
        compToken.approve(address(compensator), _amount);
        compensator.userDeposit(_amount);
        vm.stopPrank();

        assertEq(compensator.balanceOf(user1), _amount);
        assertEq(compensator.totalDelegatedCOMP(), _amount);
        assertEq(compToken.balanceOf(address(compensator)), _amount);
    }

    function testFuzz_SetsUnlockTime(uint256 _amount) public {
        _amount = _boundToReasonableAmount(_amount);
        uint256 delegationCap = compensator.delegationCap();
        _amount = bound(_amount, 1, delegationCap);
        
        uint256 expectedUnlockTime = block.timestamp + MIN_LOCK_PERIOD;
        
        vm.startPrank(user1);
        compToken.approve(address(compensator), _amount);
        compensator.userDeposit(_amount);
        vm.stopPrank();

        assertEq(compensator.unlockTime(user1), expectedUnlockTime);
    }

    function testFuzz_EmitsUserDepositEvent(uint256 _amount) public {
        _amount = _boundToReasonableAmount(_amount);
        uint256 delegationCap = compensator.delegationCap();
        _amount = bound(_amount, 1, delegationCap);
        
        vm.startPrank(user1);
        compToken.approve(address(compensator), _amount);
        
        vm.expectEmit();
        emit Compensator.UserDeposit(user1, _amount);
        compensator.userDeposit(_amount);
        vm.stopPrank();
    }

    function testFuzz_EmitsCOMPLockedEvent(uint256 _amount) public {
        _amount = _boundToReasonableAmount(_amount);
        uint256 delegationCap = compensator.delegationCap();
        _amount = bound(_amount, 1, delegationCap);
        
        uint256 expectedUnlockTime = block.timestamp + MIN_LOCK_PERIOD;
        
        vm.startPrank(user1);
        compToken.approve(address(compensator), _amount);
        
        vm.expectEmit();
        emit Compensator.COMPLocked(user1, expectedUnlockTime);
        compensator.userDeposit(_amount);
        vm.stopPrank();
    }

    function testFuzz_DelegatesVotingPowerToContract(uint256 _amount) public {
        _amount = _boundToReasonableAmount(_amount);
        uint256 delegationCap = compensator.delegationCap();
        _amount = bound(_amount, 1, delegationCap);
        
        uint256 votingPowerBefore = compToken.getCurrentVotes(address(compensator));
        
        vm.startPrank(user1);
        compToken.approve(address(compensator), _amount);
        compensator.userDeposit(_amount);
        vm.stopPrank();

        uint256 votingPowerAfter = compToken.getCurrentVotes(address(compensator));
        assertEq(votingPowerAfter, votingPowerBefore + _amount);
    }

    function testFuzz_RevertIf_AmountIsZero() public {
        vm.prank(user1);
        vm.expectRevert(Compensator.AmountMustBeGreaterThanZero.selector);
        compensator.userDeposit(0);
    }

    function testFuzz_RevertIf_ExceedsDelegationCap(uint256 _excessAmount) public {
        uint256 delegationCap = compensator.delegationCap();
        _excessAmount = bound(_excessAmount, delegationCap + 1, delegationCap + 1_000_000e18);
        
        // Mint enough tokens for the test
        compToken.mint(user1, _excessAmount);
        
        vm.startPrank(user1);
        compToken.approve(address(compensator), _excessAmount);
        vm.expectRevert(Compensator.DelegationCapExceeded.selector);
        compensator.userDeposit(_excessAmount);
        vm.stopPrank();
    }

    function testFuzz_ExtendsUnlockTimeWithActiveProposals(uint256 _amount) public {
        // Create an active proposal first
        uint256 activeProposalId = _createActiveProposal();
        
        // Note: _createActiveProposal() already used 1e18 tokens from user1, so user1 has 499,999e18 left
        uint256 delegationCap = compensator.delegationCap();
        uint256 userMaxAmount = 499_999e18; // user1 balance after _createActiveProposal
        _amount = bound(_amount, 1, delegationCap < userMaxAmount ? delegationCap : userMaxAmount);
        
        // Make the contract aware of the active proposal by staking on it
        // This triggers _updateLatestProposalId which updates the contract's tracking
        vm.startPrank(user2);
        compToken.approve(address(compensator), 1e18);
        compensator.stakeForProposal(activeProposalId, 1, 1e18);
        vm.stopPrank();
        
        uint256 expectedUnlockTime = block.timestamp + MIN_LOCK_PERIOD + ACTIVE_PROPOSAL_LOCK_EXTENSION;
        
        vm.startPrank(user1);
        compToken.approve(address(compensator), _amount);
        compensator.userDeposit(_amount);
        vm.stopPrank();

        assertEq(compensator.unlockTime(user1), expectedUnlockTime);
    }
}

contract UserWithdraw is CompensatorTest {
    function setUp() public override {
        super.setUp();
        _setupInitialDeposits();
        
        // Warp past lock period
        vm.warp(block.timestamp + MIN_LOCK_PERIOD + 1);
    }

    function testFuzz_WithdrawsCompAndBurnsTokens(uint256 _withdrawAmount) public {
        uint256 userBalance = compensator.balanceOf(user1);
        _withdrawAmount = bound(_withdrawAmount, 1, userBalance);
        
        uint256 compBalanceBefore = compToken.balanceOf(user1);
        uint256 totalDelegatedBefore = compensator.totalDelegatedCOMP();
        
        vm.prank(user1);
        compensator.userWithdraw(_withdrawAmount);

        assertEq(compensator.balanceOf(user1), userBalance - _withdrawAmount);
        assertEq(compensator.totalDelegatedCOMP(), totalDelegatedBefore - _withdrawAmount);
        assertEq(compToken.balanceOf(user1), compBalanceBefore + _withdrawAmount);
    }

    function testFuzz_EmitsUserWithdrawEvent(uint256 _withdrawAmount) public {
        uint256 userBalance = compensator.balanceOf(user1);
        _withdrawAmount = bound(_withdrawAmount, 1, userBalance);
        
        vm.prank(user1);
        vm.expectEmit();
        emit Compensator.UserWithdraw(user1, _withdrawAmount);
        compensator.userWithdraw(_withdrawAmount);
    }

    function testFuzz_RevertIf_AmountIsZero() public {
        vm.prank(user1);
        vm.expectRevert(Compensator.AmountMustBeGreaterThanZero.selector);
        compensator.userWithdraw(0);
    }

    function testFuzz_RevertIf_CompIsLocked() public {
        // Deposit after lock period started
        vm.warp(1000);
        vm.startPrank(user1);
        compToken.approve(address(compensator), 1000e18);
        compensator.userDeposit(1000e18);
        
        // Try to withdraw before unlock time
        vm.expectRevert(Compensator.CompIsLocked.selector);
        compensator.userWithdraw(500e18);
        vm.stopPrank();
    }

    function testFuzz_RevertIf_InsufficientBalance(uint256 _excessAmount) public {
        uint256 userBalance = compensator.balanceOf(user1);
        _excessAmount = bound(_excessAmount, userBalance + 1, userBalance + 1_000_000e18);
        
        vm.prank(user1);
        vm.expectRevert(Compensator.InsufficientBalance.selector);
        compensator.userWithdraw(_excessAmount);
    }

    function test_RevertIf_ActiveProposalsExist() public {
        // Create an active proposal
        uint256 activeProposalId = _createActiveProposal();
        
        // Make the contract aware of the active proposal by staking on it
        vm.startPrank(user2);
        compToken.approve(address(compensator), 1e18);
        compensator.stakeForProposal(activeProposalId, 1, 1e18);
        vm.stopPrank();
        
        vm.prank(user1);
        vm.expectRevert(Compensator.CannotWithdrawDuringActiveProposals.selector);
        compensator.userWithdraw(1000e18);
    }
}

contract ClaimRewards is CompensatorTest {
    function setUp() public override {
        super.setUp();
        _setupInitialDeposits();
        _setupRewardRate();
        
        // Let time pass to accumulate rewards
        vm.warp(block.timestamp + 1000);
    }

    function testFuzz_ClaimsAccumulatedRewards(uint256 _timeElapsed) public {
        _timeElapsed = bound(_timeElapsed, 1000, 365 days);
        vm.warp(block.timestamp + _timeElapsed);

        uint256 compBalanceBefore = compToken.balanceOf(user1);
        uint256 pendingRewards = compensator.getPendingRewards(user1);
        
        vm.prank(user1);
        compensator.claimRewards();
        
        uint256 compBalanceAfter = compToken.balanceOf(user1);
        assertEq(compBalanceAfter, compBalanceBefore + pendingRewards);
        assertEq(compensator.unclaimedRewards(user1), 0);
    }

    function testFuzz_EmitsClaimRewardsEvent(uint256 _timeElapsed) public {
        _timeElapsed = bound(_timeElapsed, 1000, 365 days);
        vm.warp(block.timestamp + _timeElapsed);

        uint256 pendingRewards = compensator.getPendingRewards(user1);
        
        vm.prank(user1);
        vm.expectEmit();
        emit Compensator.ClaimRewards(user1, pendingRewards);
        compensator.claimRewards();
    }

    function testFuzz_UpdatesTotalPendingRewards(uint256 _timeElapsed) public {
        _timeElapsed = bound(_timeElapsed, 1000, 365 days);
        vm.warp(block.timestamp + _timeElapsed);

        // First, get the pending rewards for both users
        uint256 user1Pending = compensator.getPendingRewards(user1);
        uint256 user2Pending = compensator.getPendingRewards(user2);
        
        // Claim rewards for user1
        vm.prank(user1);
        compensator.claimRewards();
        
        // After user1 claims, totalPendingRewards should equal user2's pending rewards
        // (plus any minimal new accruals that happened during the claim)
        uint256 totalPendingAfterClaim = compensator.totalPendingRewards();
        uint256 user2PendingAfterClaim = compensator.getPendingRewards(user2);
        
        // The total pending should be approximately equal to what user2 still has pending
        // We allow some tolerance for new rewards that accrued during the claim
        assertApproxEqAbs(totalPendingAfterClaim, user2PendingAfterClaim, 1e12);
        
        // Verify user1's unclaimed rewards are reset to 0
        assertEq(compensator.unclaimedRewards(user1), 0);
        
        // Verify that user1 had rewards to claim
        assertTrue(user1Pending > 0);
    }

    function testFuzz_RevertIf_NoRewardsToClaim(uint256 _timeElapsed) public {
        _timeElapsed = bound(_timeElapsed, 1000, 365 days);
        vm.warp(block.timestamp + _timeElapsed);

        // First claim all rewards
        vm.prank(user1);
        compensator.claimRewards();
        
        // Try to claim again immediately
        vm.prank(user1);
        vm.expectRevert(Compensator.NoRewardsToClaim.selector);
        compensator.claimRewards();
    }
}

contract StakeForProposal is CompensatorTest {
    uint256 proposalId;

    function setUp() public override {
        super.setUp();
        proposalId = _createActiveProposal();
    }

    function testFuzz_StakesForProposal(uint256 _amount, uint8 _support) public {
        // Note: _createActiveProposal() already used 1e18 tokens, so user1 has 499,999e18 left
        _amount = bound(_amount, 1, 499_999e18);
        _support = _boundToValidSupport(_support);
        
        // Note: _createActiveProposal() already created a 1e18 FOR stake by user1
        uint256 initialForStake = 1e18;
        
        vm.startPrank(user1);
        compToken.approve(address(compensator), _amount);
        compensator.stakeForProposal(proposalId, _support, _amount);
        vm.stopPrank();

        (uint256 forStake, uint256 againstStake) = compensator.getProposalStake(proposalId, user1);
        
        if (_support == 1) {
            assertEq(forStake, initialForStake + _amount);
            assertEq(compensator.totalStakesFor(proposalId), initialForStake + _amount);
        } else {
            assertEq(againstStake, _amount);
            assertEq(compensator.totalStakesAgainst(proposalId), _amount);
        }
    }

    function testFuzz_EmitsProposalStakedEvent(uint256 _amount, uint8 _support) public {
        // Note: _createActiveProposal() already used 1e18 tokens, so user1 has 499,999e18 left
        _amount = bound(_amount, 1, 499_999e18);
        _support = _boundToValidSupport(_support);
        
        vm.startPrank(user1);
        compToken.approve(address(compensator), _amount);
        
        vm.expectEmit();
        emit Compensator.ProposalStaked(user1, proposalId, _support, _amount);
        compensator.stakeForProposal(proposalId, _support, _amount);
        vm.stopPrank();
    }

    function testFuzz_TransfersCompToContract(uint256 _amount, uint8 _support) public {
        // Note: _createActiveProposal() already used 1e18 tokens, so user1 has 499,999e18 left
        _amount = bound(_amount, 1, 499_999e18);
        _support = _boundToValidSupport(_support);
        
        uint256 contractBalanceBefore = compToken.balanceOf(address(compensator));
        uint256 userBalanceBefore = compToken.balanceOf(user1);
        
        vm.startPrank(user1);
        compToken.approve(address(compensator), _amount);
        compensator.stakeForProposal(proposalId, _support, _amount);
        vm.stopPrank();

        assertEq(compToken.balanceOf(address(compensator)), contractBalanceBefore + _amount);
        assertEq(compToken.balanceOf(user1), userBalanceBefore - _amount);
    }

    function testFuzz_RevertIf_SupportValueIsInvalid(uint256 _amount, uint8 _invalidSupport) public {
        _amount = _boundToReasonableAmount(_amount);
        vm.assume(_invalidSupport > 1);
        
        vm.startPrank(user1);
        compToken.approve(address(compensator), _amount);
        vm.expectRevert(Compensator.InvalidSupportValue.selector);
        compensator.stakeForProposal(proposalId, _invalidSupport, _amount);
        vm.stopPrank();
    }

    function testFuzz_RevertIf_AmountIsZero(uint8 _support) public {
        _support = _boundToValidSupport(_support);
        
        vm.prank(user1);
        vm.expectRevert(Compensator.AmountMustBeGreaterThanZero.selector);
        compensator.stakeForProposal(proposalId, _support, 0);
    }

    function test_RevertIf_ProposalIsNotActive() public {
        uint256 inactiveProposalId = 999;
        compoundGovernor.setState(inactiveProposalId, IGovernor.ProposalState.Defeated);
        
        vm.startPrank(user1);
        compToken.approve(address(compensator), 1000e18);
        vm.expectRevert(Compensator.StakingOnlyAllowedForActiveProposals.selector);
        compensator.stakeForProposal(inactiveProposalId, 1, 1000e18);
        vm.stopPrank();
    }

    function testFuzz_AllowsMultipleStakesOnSameProposal(uint256 _amount1, uint256 _amount2, uint8 _support) public {
        // Note: _createActiveProposal() already used 1e18 tokens, so user1 has 499,999e18 left
        _amount1 = bound(_amount1, 1, 249_999e18);
        _amount2 = bound(_amount2, 1, 249_999e18);
        _support = _boundToValidSupport(_support);
        
        // Note: _createActiveProposal() already created a 1e18 FOR stake by user1
        uint256 initialForStake = 1e18;
        
        vm.startPrank(user1);
        compToken.approve(address(compensator), _amount1 + _amount2);
        
        compensator.stakeForProposal(proposalId, _support, _amount1);
        compensator.stakeForProposal(proposalId, _support, _amount2);
        vm.stopPrank();

        (uint256 forStake, uint256 againstStake) = compensator.getProposalStake(proposalId, user1);
        
        if (_support == 1) {
            assertEq(forStake, initialForStake + _amount1 + _amount2);
        } else {
            assertEq(againstStake, _amount1 + _amount2);
        }
    }
}

contract ResolveProposal is CompensatorTest {
    uint256 proposalId;

    function setUp() public override {
        super.setUp();
        proposalId = _createSucceededProposal();
    }

    function test_ResolvesSucceededProposal() public {
        compensator.resolveProposal(proposalId);
        
        assertEq(uint256(compensator.proposalOutcomes(proposalId)), uint256(Compensator.ProposalOutcome.ForWon));
    }

    function test_ResolvesDefeatedProposal() public {
        uint256 defeatedProposalId = _createDefeatedProposal();
        
        compensator.resolveProposal(defeatedProposalId);
        
        assertEq(uint256(compensator.proposalOutcomes(defeatedProposalId)), uint256(Compensator.ProposalOutcome.AgainstWon));
    }

    function test_RevertIf_ProposalAlreadyResolved() public {
        compensator.resolveProposal(proposalId);
        
        vm.expectRevert(Compensator.ProposalAlreadyResolved.selector);
        compensator.resolveProposal(proposalId);
    }

    function test_RevertIf_ProposalDoesNotExist() public {
        uint256 nonExistentProposalId = 999;
        
        vm.expectRevert(Compensator.ProposalDoesNotExist.selector);
        compensator.resolveProposal(nonExistentProposalId);
    }

    function test_RevertIf_ProposalNotResolvedYet() public {
        uint256 activeProposalId = _createActiveProposal();
        
        vm.expectRevert(Compensator.ProposalNotResolvedYet.selector);
        compensator.resolveProposal(activeProposalId);
    }

    function test_RevertIf_InvalidProposalId() public {
        uint256 invalidProposalId = 999;
        
        // First register the proposal to set proposalCreationTime
        compoundGovernor.setState(invalidProposalId, IGovernor.ProposalState.Active);
        compoundGovernor.setProposalSnapshot(invalidProposalId, block.number + 100);
        vm.startPrank(user1);
        compToken.approve(address(compensator), 1e18);
        compensator.stakeForProposal(invalidProposalId, 1, 1e18);
        vm.stopPrank();
        
        // Now make the Governor revert when state() is called
        compoundGovernor.setShouldRevert(true);
        
        vm.expectRevert(Compensator.InvalidProposalId.selector);
        compensator.resolveProposal(invalidProposalId);
    }
}

contract ReclaimStake is CompensatorTest {
    uint256 proposalId;

    function setUp() public override {
        super.setUp();
        proposalId = _createActiveProposal();
        
        // Stake on proposal
        vm.startPrank(user1);
        compToken.approve(address(compensator), 10_000e18);
        compensator.stakeForProposal(proposalId, 0, 5_000e18); // Stake against
        compensator.stakeForProposal(proposalId, 1, 5_000e18); // Stake for
        vm.stopPrank();
        
        // Resolve proposal as succeeded (FOR wins)
        compoundGovernor.setState(proposalId, IGovernor.ProposalState.Succeeded);
        
        compensator.resolveProposal(proposalId);
    }

    function test_ReclaimsLosingStake() public {
        uint256 userBalanceBefore = compToken.balanceOf(user1);
        
        vm.prank(user1);
        compensator.reclaimStake(proposalId);
        
        uint256 userBalanceAfter = compToken.balanceOf(user1);
        assertEq(userBalanceAfter, userBalanceBefore + 5_000e18); // Reclaimed losing AGAINST stake
        
        (uint256 forStake, uint256 againstStake) = compensator.getProposalStake(proposalId, user1);
        assertEq(againstStake, 0); // AGAINST stake should be zeroed
        assertEq(forStake, 5_001e18); // FOR stake should remain (winning stake) - includes 1e18 from _createActiveProposal registration
    }

    function test_EmitsStakeReclaimedEvent() public {
        vm.prank(user1);
        vm.expectEmit();
        emit Compensator.StakeReclaimed(user1, proposalId, 5_000e18);
        compensator.reclaimStake(proposalId);
    }

    function test_RevertIf_ProposalNotResolvedYet() public {
        // Create a new unresolved proposal with a unique ID
        uint256 unresolvedProposalId = 999;
        compoundGovernor.setState(unresolvedProposalId, IGovernor.ProposalState.Active);
        compoundGovernor.setProposalSnapshot(unresolvedProposalId, block.number + 100);
        
        // Register the proposal by staking on it
        vm.startPrank(user1);
        compToken.approve(address(compensator), 1e18);
        compensator.stakeForProposal(unresolvedProposalId, 1, 1e18);
        vm.stopPrank();
        
        vm.prank(user1);
        vm.expectRevert(Compensator.ProposalNotResolvedYet.selector);
        compensator.reclaimStake(unresolvedProposalId);
    }

    function test_RevertIf_NoStakeToReclaim() public {
        // Try to reclaim again after already reclaimed
        vm.prank(user1);
        compensator.reclaimStake(proposalId);
        
        vm.prank(user1);
        vm.expectRevert(Compensator.NoStakeToReclaim.selector);
        compensator.reclaimStake(proposalId);
    }

    function test_AutoResolvesTimedOutProposal() public {
        // Create a new timed out proposal with a unique ID
        uint256 timedOutProposalId = 888;
        compoundGovernor.setState(timedOutProposalId, IGovernor.ProposalState.Active);
        compoundGovernor.setProposalSnapshot(timedOutProposalId, block.number + 100);
        
        // Stake on the proposal
        vm.startPrank(user1);
        compToken.approve(address(compensator), 1_000e18);
        compensator.stakeForProposal(timedOutProposalId, 1, 1_000e18); // Stake FOR so it will be losing when AGAINST wins
        vm.stopPrank();
        
        // Advance time to trigger auto-resolution due to timeout
        vm.warp(block.timestamp + MAX_PROPOSAL_RESOLUTION_TIME + 1);
        
        vm.prank(user1);
        compensator.reclaimStake(timedOutProposalId);
        
        // Should auto-resolve to AGAINST won since proposal was still active
        assertEq(uint256(compensator.proposalOutcomes(timedOutProposalId)), uint256(Compensator.ProposalOutcome.AgainstWon));
    }
}

contract SetBlocksPerDay is CompensatorTest {
    function testFuzz_SetsNewBlocksPerDay(uint256 _newBlocksPerDay) public {
        _newBlocksPerDay = bound(_newBlocksPerDay, 1, MAX_BLOCKS_PER_DAY - 1);
        
        vm.prank(owner);
        compensator.setBlocksPerDay(_newBlocksPerDay);
        
        assertEq(compensator.blocksPerDay(), _newBlocksPerDay);
    }

    function testFuzz_RevertIf_BlocksPerDayIsZero() public {
        vm.prank(owner);
        vm.expectRevert(Compensator.InvalidBlocksPerDay.selector);
        compensator.setBlocksPerDay(0);
    }

    function testFuzz_RevertIf_BlocksPerDayExceedsMaximum(uint256 _excessBlocks) public {
        _excessBlocks = bound(_excessBlocks, MAX_BLOCKS_PER_DAY, type(uint256).max);
        
        vm.prank(owner);
        vm.expectRevert(Compensator.InvalidBlocksPerDay.selector);
        compensator.setBlocksPerDay(_excessBlocks);
    }

    function testFuzz_RevertIf_CallerIsNotOwner(address _caller, uint256 _newBlocksPerDay) public {
        vm.assume(_caller != owner);
        _assumeSafeAddress(_caller);
        _newBlocksPerDay = bound(_newBlocksPerDay, 1, MAX_BLOCKS_PER_DAY - 1);

        vm.prank(_caller);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, _caller));
        compensator.setBlocksPerDay(_newBlocksPerDay);
    }
}

contract RewardsUntil is CompensatorTest {
    function setUp() public override {
        super.setUp();
        _setupInitialDeposits();
    }

    function test_ReturnsLastRewardedWhenRateIsZero() public view {
        uint256 result = compensator.rewardsUntil();
        assertEq(result, compensator.lastRewarded());
    }

    function test_CalculatesRewardsUntilWithNonZeroRate() public {
        _setupRewardRate();
        
        uint256 availableRewards = compensator.availableRewards();
        uint256 rewardRate = compensator.rewardRate();
        uint256 lastRewarded = compensator.lastRewarded();
        
        uint256 expectedUntil = lastRewarded + (availableRewards * REWARD_PRECISION) / rewardRate;
        uint256 actualUntil = compensator.rewardsUntil();
        
        assertEq(actualUntil, expectedUntil);
    }

    function testFuzz_CalculatesCorrectRewardsUntil(uint256 _rewardRate) public {
        _rewardRate = bound(_rewardRate, 1, 1e18);
        
        vm.prank(owner);
        compensator.setRewardRate(_rewardRate);
        
        uint256 availableRewards = compensator.availableRewards();
        uint256 totalPendingRewards = compensator.totalPendingRewards();
        uint256 lastRewarded = compensator.lastRewarded();
        
        uint256 remainingRewards = availableRewards > totalPendingRewards 
            ? availableRewards - totalPendingRewards 
            : 0;
        
        uint256 expectedUntil = lastRewarded + (remainingRewards * REWARD_PRECISION) / _rewardRate;
        uint256 actualUntil = compensator.rewardsUntil();
        
        assertEq(actualUntil, expectedUntil);
    }
}

contract GetPendingRewards is CompensatorTest {
    function setUp() public override {
        super.setUp();
        _setupInitialDeposits();
        _setupRewardRate();
    }

    function test_ReturnsZeroForNewUsers() public {
        address newUser = makeAddr("newUser");
        assertEq(compensator.getPendingRewards(newUser), 0);
    }

    function test_CalculatesPendingRewardsAfterTimePass() public {
        uint256 initialRewards = compensator.getPendingRewards(user1);
        
        vm.warp(block.timestamp + 1000);
        
        uint256 rewardsAfterTime = compensator.getPendingRewards(user1);
        assertTrue(rewardsAfterTime > initialRewards);
    }

    function testFuzz_CalculatesCorrectPendingRewards(uint256 _timePassed) public {
        _timePassed = bound(_timePassed, 1, 86400); // 1 second to 1 day
        
        uint256 initialRewards = compensator.getPendingRewards(user1);
        
        vm.warp(block.timestamp + _timePassed);
        
        uint256 rewardsAfterTime = compensator.getPendingRewards(user1);
        uint256 expectedIncrease = (compensator.balanceOf(user1) * compensator.rewardRate() * _timePassed) / compensator.totalSupply();
        
        assertApproxEqAbs(rewardsAfterTime, initialRewards + expectedIncrease, 1e12); // Allow small rounding errors
    }
}

contract GetContractVotingPower is CompensatorTest {
    function setUp() public override {
        super.setUp();
        _setupInitialDeposits();
    }

    function test_ReturnsCurrentVotingPower() public view {
        uint256 expectedPower = compToken.getCurrentVotes(address(compensator));
        uint256 actualPower = compensator.getContractVotingPower();
        assertEq(actualPower, expectedPower);
    }

    function testFuzz_ReturnsCorrectVotingPowerAfterDeposits(uint256 _additionalAmount) public {
        uint256 delegationCap = compensator.delegationCap();
        uint256 currentDelegated = compensator.totalDelegatedCOMP();
        _additionalAmount = bound(_additionalAmount, 1, delegationCap - currentDelegated);
        
        uint256 powerBefore = compensator.getContractVotingPower();
        
        vm.startPrank(user1);
        compToken.approve(address(compensator), _additionalAmount);
        compensator.userDeposit(_additionalAmount);
        vm.stopPrank();
        
        uint256 powerAfter = compensator.getContractVotingPower();
        assertEq(powerAfter, powerBefore + _additionalAmount);
    }
}

contract GetVoteInfo is CompensatorTest {
    uint256 proposalId;

    function setUp() public override {
        super.setUp();
        _setupInitialDeposits();
        proposalId = _createActiveProposal();
    }

    function testFuzz_ReturnsVoteInformation(uint8 _support, string memory _reason) public {
        _support = _boundToValidSupport(_support);
        
        vm.prank(owner);
        compensator.castVote(proposalId, _support, _reason);
        
        (uint8 direction,, bytes32 txHash, uint256 timestamp, uint256 votingPower, string memory reason) = 
            compensator.getVoteInfo(proposalId);
        
        assertEq(direction, _support);
        assertEq(timestamp, block.timestamp);
        assertEq(reason, _reason);
        assertTrue(votingPower > 0);
    }

    function test_ReturnsEmptyForNonExistentVote() public view {
        uint256 nonExistentProposalId = 999;
        
        (uint8 direction, uint256 blockNumber, bytes32 txHash, uint256 timestamp, uint256 votingPower, string memory reason) = 
            compensator.getVoteInfo(nonExistentProposalId);
        
        assertEq(direction, 0);
        assertEq(blockNumber, 0);
        assertEq(txHash, bytes32(0));
        assertEq(timestamp, 0);
        assertEq(votingPower, 0);
        assertEq(reason, "");
    }
}

contract GetVoteByIndex is CompensatorTest {
    uint256 proposalId1;
    uint256 proposalId2;

    function setUp() public override {
        super.setUp();
        _setupInitialDeposits();
        proposalId1 = _createActiveProposal();
        proposalId2 = 2;
        compoundGovernor.setState(proposalId2, IGovernor.ProposalState.Active);
    }

    function test_ReturnsVoteByIndex() public {
        vm.startPrank(owner);
        compensator.castVote(proposalId1, 1, "First vote");
        compensator.castVote(proposalId2, 0, "Second vote");
        vm.stopPrank();
        
        (uint8 direction, uint256 blockNumber, bytes32 txHash, uint256 timestamp, uint256 votingPower, string memory reason) = 
            compensator.getVoteByIndex(0);
        
        assertEq(direction, 1);
        assertEq(reason, "First vote");
        
        (direction, blockNumber, txHash, timestamp, votingPower, reason) = compensator.getVoteByIndex(1);
        assertEq(direction, 0);
        assertEq(reason, "Second vote");
    }

    function testFuzz_RevertIf_VoteIndexOutOfBounds(uint256 _invalidIndex) public {
        uint256 voteCount = compensator.voteCount();
        _invalidIndex = bound(_invalidIndex, voteCount, type(uint256).max);
        
        vm.expectRevert(Compensator.VoteIndexOutOfBounds.selector);
        compensator.getVoteByIndex(_invalidIndex);
    }
}

contract GetProposalStake is CompensatorTest {
    uint256 proposalId;

    function setUp() public override {
        super.setUp();
        proposalId = _createActiveProposal();
    }

    function testFuzz_ReturnsStakeInformation(uint256 _forAmount, uint256 _againstAmount) public {
        _forAmount = bound(_forAmount, 0, 100_000e18);
        _againstAmount = bound(_againstAmount, 0, 100_000e18);
        
        // Note: _createActiveProposal() already created a 1e18 FOR stake by user1
        uint256 initialForStake = 1e18;
        uint256 expectedForStake = initialForStake + _forAmount;
        
        if (_forAmount > 0) {
            vm.startPrank(user1);
            compToken.approve(address(compensator), _forAmount);
            compensator.stakeForProposal(proposalId, 1, _forAmount);
            vm.stopPrank();
        }
        
        if (_againstAmount > 0) {
            vm.startPrank(user1);
            compToken.approve(address(compensator), _againstAmount);
            compensator.stakeForProposal(proposalId, 0, _againstAmount);
            vm.stopPrank();
        }
        
        (uint256 forStake, uint256 againstStake) = compensator.getProposalStake(proposalId, user1);
        assertEq(forStake, expectedForStake);
        assertEq(againstStake, _againstAmount);
    }

    function test_ReturnsZeroForNonExistentStake() public view {
        (uint256 forStake, uint256 againstStake) = compensator.getProposalStake(999, user1);
        assertEq(forStake, 0);
        assertEq(againstStake, 0);
    }
}

contract ERC20TransferOverrides is CompensatorTest {
    function testFuzz_TransferAlwaysReverts(address _to, uint256 _amount) public {
        _assumeSafeAddress(_to);
        _amount = _boundToReasonableAmount(_amount);
        
        vm.expectRevert(Compensator.CompensatorTokensNotTransferable.selector);
        compensator.transfer(_to, _amount);
    }

    function testFuzz_TransferFromAlwaysReverts(address _from, address _to, uint256 _amount) public {
        _assumeSafeAddress(_from);
        _assumeSafeAddress(_to);
        _amount = _boundToReasonableAmount(_amount);
        
        vm.expectRevert(Compensator.CompensatorTokensNotTransferable.selector);
        compensator.transferFrom(_from, _to, _amount);
    }

    function testFuzz_ApproveAlwaysReverts(address _spender, uint256 _amount) public {
        _assumeSafeAddress(_spender);
        _amount = _boundToReasonableAmount(_amount);
        
        vm.expectRevert(Compensator.CompensatorTokensNotTransferable.selector);
        compensator.approve(_spender, _amount);
    }
}

contract TransferOwnership is CompensatorTest {
    function testFuzz_TransfersOwnershipAndNotifiesFactory(address _newOwner) public {
        _assumeSafeAddress(_newOwner);
        
        address oldOwner = compensator.owner();
        
        vm.prank(owner);
        compensator.transferOwnership(_newOwner);
        
        assertEq(compensator.owner(), _newOwner);
        assertEq(factory.ownerToCompensator(oldOwner), address(0));
        assertEq(factory.ownerToCompensator(_newOwner), address(compensator));
    }

    function testFuzz_RevertIf_NewOwnerIsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));        compensator.transferOwnership(address(0));
    }

    function testFuzz_RevertIf_CallerIsNotOwner(address _caller, address _newOwner) public {
        vm.assume(_caller != owner);
        _assumeSafeAddress(_caller);
        _assumeSafeAddress(_newOwner);

        vm.prank(_caller);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, _caller));
        compensator.transferOwnership(_newOwner);
    }

    function test_SucceedsEvenIfFactoryNotificationFails() public {
        // Create a compensator with an invalid factory
        MockERC20 _compToken = new MockERC20("Test", "TEST");
        _compToken.mint(address(this), INITIAL_COMP_SUPPLY);
        MockGovernor _compoundGovernor = new MockGovernor();
        
        Compensator _compensator = new Compensator(address(_compToken), address(_compoundGovernor), owner);
        address newOwner = makeAddr("newOwner");
        
        // Should succeed even though factory notification fails (factory is this contract which doesn't implement the interface)
        vm.prank(owner);
        _compensator.transferOwnership(newOwner);
        
        assertEq(_compensator.owner(), newOwner);
    }
}
