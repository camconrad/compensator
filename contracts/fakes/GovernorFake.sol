// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev A sophisticated fake Governor contract for testing governance scenarios.
/// This fake provides realistic governance behavior and can be configured for various test cases.
contract GovernorFake {
    /// @dev Emitted when a proposal is created
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address[] targets,
        uint256[] values,
        string[] signatures,
        bytes[] calldatas,
        uint256 startBlock,
        uint256 endBlock,
        string description
    );

    /// @dev Emitted when a vote is cast
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        uint8 support,
        uint256 weight,
        string reason
    );

    /// @dev Emitted when a proposal is executed
    event ProposalExecuted(uint256 indexed proposalId);

    /// @dev Emitted when a proposal is canceled
    event ProposalCanceled(uint256 indexed proposalId);

    /// @dev Emitted when voting is paused/unpaused
    event VotingPaused(address indexed by, bool paused);

    /// @dev Emitted when proposal creation is paused/unpaused
    event ProposalCreationPaused(address indexed by, bool paused);

    /// @dev Vote support values
    uint8 public constant AGAINST = 0;
    uint8 public constant FOR = 1;
    uint8 public constant ABSTAIN = 2;

    /// @dev Proposal states
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }

    /// @dev Proposal structure
    struct Proposal {
        address proposer;
        address[] targets;
        uint256[] values;
        string[] signatures;
        bytes[] calldatas;
        uint256 startBlock;
        uint256 endBlock;
        bool canceled;
        bool executed;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        mapping(address => Receipt) receipts;
    }

    /// @dev Vote receipt structure
    struct Receipt {
        bool hasVoted;
        uint8 support;
        uint256 weight;
        string reason;
    }

    /// @dev COMP token contract
    IERC20 public immutable COMP_TOKEN;

    /// @dev Current proposal ID counter
    uint256 public proposalCount;

    /// @dev Mapping from proposal ID to proposal
    mapping(uint256 => Proposal) public proposals;

    /// @dev Mapping from proposal ID to proposal state
    mapping(uint256 => ProposalState) public proposalStates;

    /// @dev Whether voting is currently paused
    bool public votingPaused;

    /// @dev Whether proposal creation is currently paused
    bool public proposalCreationPaused;

    /// @dev Address that can pause operations
    address public immutable pauser;

    /// @dev Minimum voting period in blocks
    uint256 public minVotingPeriod;

    /// @dev Maximum voting period in blocks
    uint256 public maxVotingPeriod;

    /// @dev Quorum required for proposals to pass
    uint256 public quorumVotes;

    /// @dev Constructor
    /// @param _compToken COMP token contract address
    /// @param _pauser Address that can pause operations
    /// @param _minVotingPeriod Minimum voting period in blocks
    /// @param _maxVotingPeriod Maximum voting period in blocks
    /// @param _quorumVotes Quorum required for proposals to pass
    constructor(
        address _compToken,
        address _pauser,
        uint256 _minVotingPeriod,
        uint256 _maxVotingPeriod,
        uint256 _quorumVotes
    ) {
        COMP_TOKEN = IERC20(_compToken);
        pauser = _pauser;
        minVotingPeriod = _minVotingPeriod;
        maxVotingPeriod = _maxVotingPeriod;
        quorumVotes = _quorumVotes;
    }

    /// @dev Create a new proposal
    /// @param targets Target addresses for proposal calls
    /// @param values ETH values for proposal calls
    /// @param signatures Function signatures for proposal calls
    /// @param calldatas Calldata for proposal calls
    /// @param description Description of the proposal
    /// @return proposalId The ID of the created proposal
    function propose(
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        string memory description
    ) public returns (uint256 proposalId) {
        require(!proposalCreationPaused, "Proposal creation is paused");
        require(targets.length > 0, "Must have at least one target");
        require(targets.length == values.length, "Targets and values length mismatch");
        require(targets.length == signatures.length, "Targets and signatures length mismatch");
        require(targets.length == calldatas.length, "Targets and calldatas length mismatch");
        require(bytes(description).length > 0, "Description cannot be empty");

        proposalId = proposalCount++;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.proposer = msg.sender;
        proposal.targets = targets;
        proposal.values = values;
        proposal.signatures = signatures;
        proposal.calldatas = calldatas;
        proposal.startBlock = block.number;
        proposal.endBlock = block.number + minVotingPeriod;
        proposal.canceled = false;
        proposal.executed = false;
        proposal.forVotes = 0;
        proposal.againstVotes = 0;
        proposal.abstainVotes = 0;

        proposalStates[proposalId] = ProposalState.Active;

        emit ProposalCreated(
            proposalId,
            msg.sender,
            targets,
            values,
            signatures,
            calldatas,
            proposal.startBlock,
            proposal.endBlock,
            description
        );
    }

    /// @dev Cast a vote on a proposal
    /// @param proposalId The ID of the proposal to vote on
    /// @param support The support value (0 = Against, 1 = For, 2 = Abstain)
    /// @param reason The reason for the vote
    function castVote(uint256 proposalId, uint8 support, string memory reason) public {
        require(!votingPaused, "Voting is paused");
        require(proposalStates[proposalId] == ProposalState.Active, "Proposal not active");
        require(support <= ABSTAIN, "Invalid support value");
        require(block.number <= proposals[proposalId].endBlock, "Voting period ended");

        Proposal storage proposal = proposals[proposalId];
        require(!proposal.receipts[msg.sender].hasVoted, "Already voted");

        uint256 weight = COMP_TOKEN.balanceOf(msg.sender);
        require(weight > 0, "No voting power");

        proposal.receipts[msg.sender] = Receipt({
            hasVoted: true,
            support: support,
            weight: weight,
            reason: reason
        });

        if (support == FOR) {
            proposal.forVotes += weight;
        } else if (support == AGAINST) {
            proposal.againstVotes += weight;
        } else if (support == ABSTAIN) {
            proposal.abstainVotes += weight;
        }

        emit VoteCast(msg.sender, proposalId, support, weight, reason);
    }

    /// @dev Execute a successful proposal
    /// @param proposalId The ID of the proposal to execute
    function execute(uint256 proposalId) public {
        require(proposalStates[proposalId] == ProposalState.Succeeded, "Proposal not succeeded");
        
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Proposal already executed");

        proposal.executed = true;
        proposalStates[proposalId] = ProposalState.Executed;

        // Execute the proposal calls
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            (bool success, ) = proposal.targets[i].call{value: proposal.values[i]}(proposal.calldatas[i]);
            require(success, "Proposal execution failed");
        }

        emit ProposalExecuted(proposalId);
    }

    /// @dev Cancel a proposal (only proposer can cancel)
    /// @param proposalId The ID of the proposal to cancel
    function cancel(uint256 proposalId) public {
        require(proposalStates[proposalId] == ProposalState.Active, "Proposal not active");
        require(msg.sender == proposals[proposalId].proposer, "Only proposer can cancel");

        proposals[proposalId].canceled = true;
        proposalStates[proposalId] = ProposalState.Canceled;

        emit ProposalCanceled(proposalId);
    }

    /// @dev Get the current state of a proposal
    /// @param proposalId The ID of the proposal
    /// @return The current state of the proposal
    function state(uint256 proposalId) public view returns (ProposalState) {
        if (proposalStates[proposalId] == ProposalState.Canceled) {
            return ProposalState.Canceled;
        }
        if (proposalStates[proposalId] == ProposalState.Executed) {
            return ProposalState.Executed;
        }

        Proposal storage proposal = proposals[proposalId];
        if (block.number <= proposal.endBlock) {
            return ProposalState.Active;
        }

        if (proposal.forVotes > proposal.againstVotes && proposal.forVotes >= quorumVotes) {
            return ProposalState.Succeeded;
        } else {
            return ProposalState.Defeated;
        }
    }

    /// @dev Pause or unpause voting
    /// @param paused Whether to pause voting
    function setVotingPaused(bool paused) public {
        require(msg.sender == pauser, "Only pauser can pause voting");
        votingPaused = paused;
        emit VotingPaused(msg.sender, paused);
    }

    /// @dev Pause or unpause proposal creation
    /// @param paused Whether to pause proposal creation
    function setProposalCreationPaused(bool paused) public {
        require(msg.sender == pauser, "Only pauser can pause proposal creation");
        proposalCreationPaused = paused;
        emit ProposalCreationPaused(msg.sender, paused);
    }

    /// @dev Function to simulate voting power failures for testing
    /// @param voter The voter address
    /// @param shouldFail Whether the call should fail
    /// @return The voting power (or 0 if failed)
    function getCurrentVotesWithFailure(address voter, bool shouldFail) public view returns (uint256) {
        if (shouldFail) {
            return 0;
        }
        return COMP_TOKEN.balanceOf(voter);
    }

    /// @dev Function to simulate proposal state changes for testing
    /// @param proposalId The proposal ID
    /// @param newState The new state to set
    function setProposalState(uint256 proposalId, ProposalState newState) public {
        require(msg.sender == pauser, "Only pauser can change proposal state");
        proposalStates[proposalId] = newState;
    }

    /// @dev Get the raw stored proposal state for testing (bypasses calculation logic)
    /// @param proposalId The proposal ID
    /// @return The raw stored state
    function getRawProposalState(uint256 proposalId) public view returns (ProposalState) {
        return proposalStates[proposalId];
    }
}
