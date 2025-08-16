const { ethers } = require("hardhat");

class EnhancedMockGovernor {
  constructor() {
    this.contract = null;
    this.proposals = new Map();
    this.votes = new Map();
    this.proposalCounter = 0;
  }

  async deploy() {
    const MockGovernor = await ethers.getContractFactory("MockGovernor");
    this.contract = await MockGovernor.deploy();
    await this.contract.waitForDeployment();
    return this.contract;
  }

  async getAddress() {
    if (!this.contract) throw new Error("Contract not deployed");
    return await this.contract.getAddress();
  }

  // Proposal management
  async createProposal(description = "Test Proposal") {
    if (!this.contract) throw new Error("Contract not deployed");
    this.proposalCounter++;
    const proposalId = this.proposalCounter;
    
    this.proposals.set(proposalId, {
      id: proposalId,
      description,
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      executed: false,
      canceled: false,
      vetoed: false,
      startTime: Math.floor(Date.now() / 1000),
      endTime: Math.floor(Date.now() / 1000) + 86400, // 1 day from now
      executedTime: 0,
      canceledTime: 0,
      vetoedTime: 0
    });

    return proposalId;
  }

  async getProposal(proposalId) {
    if (!this.contract) throw new Error("Contract not deployed");
    return this.proposals.get(proposalId) || null;
  }

  async getAllProposals() {
    if (!this.contract) throw new Error("Contract not deployed");
    return Array.from(this.proposals.values());
  }

  // Voting simulation
  async castVote(proposalId, support, reason = "") {
    if (!this.contract) throw new Error("Contract not deployed");
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error("Proposal not found");

    if (support === 0) {
      proposal.againstVotes++;
    } else if (support === 1) {
      proposal.forVotes++;
    } else if (support === 2) {
      proposal.abstainVotes++;
    }

    // Store individual votes
    if (!this.votes.has(proposalId)) {
      this.votes.set(proposalId, []);
    }
    this.votes.get(proposalId).push({ support, reason });

    return true;
  }

  async getVotes(proposalId) {
    if (!this.contract) throw new Error("Contract not deployed");
    return this.votes.get(proposalId) || [];
  }

  // Proposal state management
  async executeProposal(proposalId) {
    if (!this.contract) throw new Error("Contract not deployed");
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.executed) throw new Error("Proposal already executed");
    if (proposal.canceled) throw new Error("Proposal is canceled");
    if (proposal.vetoed) throw new Error("Proposal is vetoed");

    proposal.executed = true;
    proposal.executedTime = Math.floor(Date.now() / 1000);
    return true;
  }

  async cancelProposal(proposalId) {
    if (!this.contract) throw new Error("Contract not deployed");
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.executed) throw new Error("Proposal already executed");
    if (proposal.canceled) throw new Error("Proposal already canceled");

    proposal.canceled = true;
    proposal.canceledTime = Math.floor(Date.now() / 1000);
    return true;
  }

  async vetoProposal(proposalId) {
    if (!this.contract) throw new Error("Contract not deployed");
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.executed) throw new Error("Proposal already executed");
    if (proposal.vetoed) throw new Error("Proposal already vetoed");

    proposal.vetoed = true;
    proposal.vetoedTime = Math.floor(Date.now() / 1000);
    return true;
  }

  // Quorum and threshold simulation
  async getQuorumVotes(proposalId) {
    if (!this.contract) throw new Error("Contract not deployed");
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return 0;
    
    // Simple quorum calculation: 4% of total votes
    const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
    return Math.floor(totalVotes * 0.04);
  }

  async hasQuorum(proposalId) {
    if (!this.contract) throw new Error("Contract not deployed");
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return false;
    
    const quorum = await this.getQuorumVotes(proposalId);
    return proposal.forVotes >= quorum;
  }

  async isProposalSuccessful(proposalId) {
    if (!this.contract) throw new Error("Contract not deployed");
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return false;
    
    return proposal.forVotes > proposal.againstVotes;
  }

  // Time-based operations
  async advanceTime(seconds) {
    if (!this.contract) throw new Error("Contract not deployed");
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  }

  async setProposalTime(proposalId, startTime, endTime) {
    if (!this.contract) throw new Error("Contract not deployed");
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error("Proposal not found");

    proposal.startTime = startTime;
    proposal.endTime = endTime;
  }

  // Utility methods for testing
  async getProposalState(proposalId) {
    if (!this.contract) throw new Error("Contract not deployed");
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return "Unknown";

    if (proposal.executed) return "Executed";
    if (proposal.canceled) return "Canceled";
    if (proposal.vetoed) return "Vetoed";
    
    const now = Math.floor(Date.now() / 1000);
    if (now < proposal.startTime) return "Pending";
    if (now > proposal.endTime) return "Expired";
    return "Active";
  }

  async getProposalSummary(proposalId) {
    if (!this.contract) throw new Error("Contract not deployed");
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return null;

    return {
      ...proposal,
      state: await this.getProposalState(proposalId),
      hasQuorum: await this.hasQuorum(proposalId),
      isSuccessful: await this.isProposalSuccessful(proposalId),
      quorumRequired: await this.getQuorumVotes(proposalId)
    };
  }

  async logProposalDetails(proposalId) {
    if (!this.contract) throw new Error("Contract not deployed");
    const summary = await this.getProposalSummary(proposalId);
    if (!summary) {
      console.log(`Proposal ${proposalId} not found`);
      return;
    }

    console.log(`\n=== Proposal ${proposalId} Details ===`);
    console.log(`Description: ${summary.description}`);
    console.log(`State: ${summary.state}`);
    console.log(`For Votes: ${summary.forVotes}`);
    console.log(`Against Votes: ${summary.againstVotes}`);
    console.log(`Abstain Votes: ${summary.abstainVotes}`);
    console.log(`Has Quorum: ${summary.hasQuorum}`);
    console.log(`Is Successful: ${summary.isSuccessful}`);
    console.log(`Quorum Required: ${summary.quorumRequired}`);
    console.log(`Start Time: ${new Date(summary.startTime * 1000).toISOString()}`);
    console.log(`End Time: ${new Date(summary.endTime * 1000).toISOString()}`);
    console.log("=====================================\n");
  }

  // Batch operations for stress testing
  async createMultipleProposals(count, descriptions = []) {
    if (!this.contract) throw new Error("Contract not deployed");
    const proposalIds = [];
    
    for (let i = 0; i < count; i++) {
      const description = descriptions[i] || `Test Proposal ${i + 1}`;
      const proposalId = await this.createProposal(description);
      proposalIds.push(proposalId);
    }
    
    return proposalIds;
  }

  async simulateVotingRound(proposalId, voters, voteDistribution = { for: 0.6, against: 0.3, abstain: 0.1 }) {
    if (!this.contract) throw new Error("Contract not deployed");
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error("Proposal not found");

    for (const voter of voters) {
      const rand = Math.random();
      let support;
      
      if (rand < voteDistribution.for) {
        support = 1; // For
      } else if (rand < voteDistribution.for + voteDistribution.against) {
        support = 0; // Against
      } else {
        support = 2; // Abstain
      }
      
      await this.castVote(proposalId, support, `Vote from ${voter}`);
    }
  }
}

module.exports = EnhancedMockGovernor;
