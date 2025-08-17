// Tally API service for fetching Compound DAO proposals
// This provides enhanced metadata and descriptions for proposals

export interface TallyProposal {
  id: string;
  onchainId: string;
  status: string;
  governor: {
    name: string;
  };
  metadata: {
    title: string;
    description: string;
  };
  voteStats: {
    type: string;
    votesCount: string;
    votersCount: number;
    percent: number;
  }[];
}

export interface TallyDelegate {
  id: string;
  address: string;
  name: string;
  votingPower: number;
  delegators: number;
  isPrioritized: boolean;
  imageUrl?: string;
  description?: string;
  twitter?: string;
  discord?: string;
  website?: string;
  lastActive?: string;
  participationRate?: number;
}

export interface TallyProposalResponse {
  data: {
    proposals: TallyProposal[];
  };
}

export interface TallyDelegatesResponse {
  data: {
    delegates: TallyDelegate[];
  };
}

// Tally API endpoint for Compound DAO
const TALLY_API_URL = "https://api.tally.xyz/query";
const TALLY_API_KEY = process.env.NEXT_PUBLIC_TALLY_API_KEY || "79cd770afe457e61a5f2ebccf414dda8f9ed690b4d2b28d8d3d188d9cda51e93";

export class TallyService {
  private static async queryTally(query: string, variables: any = {}) {
    try {
      const response = await fetch(TALLY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": TALLY_API_KEY,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tally API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error querying Tally API:", error);
      throw error;
    }
  }

  static async getCompoundProposals(limit: number = 20): Promise<TallyProposal[]> {
    const query = "query GetCompoundProposals($organizationId: IntID!) { proposals(input: { filters: { organizationId: $organizationId } }) { nodes { ... on Proposal { id onchainId status governor { name } metadata { title description } voteStats { type votesCount votersCount percent } } } } }";

    try {
      const response = await this.queryTally(query, {
        organizationId: "2206072050458560433", // Compound organization ID
      });
      const proposals = response.data.proposals.nodes || [];
      return proposals;
    } catch (error) {
      console.error("TallyService Error:", error);
      return [];
    }
  }

  // Alias method for compatibility with AnalyticsService
  static async getProposals(limit: number = 20): Promise<TallyProposal[]> {
    return this.getCompoundProposals(limit);
  }

  static async getCompoundDelegates(
    sortBy: "id" | "votes" | "delegators" | "isPrioritized" = "votes",
    limit: number = 50
  ): Promise<TallyDelegate[]> {
    const query = `
      query GetCompoundDelegates($organizationId: IntID!, $sortBy: DelegatesSortBy!, $limit: Int!) {
        delegates(
          input: {
            filters: { organizationId: $organizationId }
            sortBy: $sortBy
            limit: $limit
          }
        ) {
          nodes {
            id
            account {
              address
              name
              imageUrl
              description
              twitter
              discord
              website
            }
            chainId
            delegatorsCount
            governor {
              name
            }
            organization {
              name
            }
            statement {
              text
            }
            token {
              symbol
              decimals
            }
            votesCount
            isPrioritized
          }
        }
      }
    `;

    try {
      console.log(`Fetching delegates from Tally API with sortBy: ${sortBy}, limit: ${limit}`);
      const response = await this.queryTally(query, {
        organizationId: "2206072050458560433", // Compound organization ID
        sortBy: sortBy.toUpperCase(),
        limit,
      });
      
      console.log("Tally API response:", response);
      
      const delegates = response.data?.delegates?.nodes || [];
      console.log(`Received ${delegates.length} delegates from Tally API`);
      
      // Transform the data to match our interface
      return delegates.map((delegate: any) => ({
        id: delegate.id,
        address: delegate.account?.address || "",
        name: delegate.account?.name || `Delegate ${delegate.id}`,
        votingPower: parseFloat(delegate.votesCount || "0"),
        delegators: delegate.delegatorsCount || 0,
        isPrioritized: delegate.isPrioritized || false,
        imageUrl: delegate.account?.imageUrl,
        description: delegate.account?.description || delegate.statement?.text,
        twitter: delegate.account?.twitter,
        discord: delegate.account?.discord,
        website: delegate.account?.website,
        lastActive: undefined, // Not available in this schema
        participationRate: 0, // Would need to calculate from voting history
      }));
    } catch (error) {
      console.error("Error fetching delegates from Tally:", error);
      console.log("Tally API failed - returning empty array");
      // Return empty array if Tally API fails - no fake data
      return [];
    }
  }

  static async getProposalById(proposalId: string): Promise<TallyProposal | null> {
    const query = `
      query GetProposal($id: String!) {
        proposal(id: $id) {
          id
          onchainId
          status
          governor {
            name
          }
          voteStats {
            type
            votesCount
            votersCount
            percent
          }
        }
      }
    `;

    try {
      const response = await this.queryTally(query, { id: proposalId });
      return response.data.proposal || null;
    } catch (error) {
      console.error("Failed to fetch proposal from Tally:", error);
      return null;
    }
  }

  // Convert Tally proposal to our internal format
  static convertToInternalFormat(tallyProposal: TallyProposal, delegateAddress?: string) {
    // Parse vote statistics
    const forVotes = tallyProposal.voteStats
      .filter(stat => stat.type === "for")
      .reduce((sum, stat) => sum + parseFloat(stat.votesCount), 0);
    
    const againstVotes = tallyProposal.voteStats
      .filter(stat => stat.type === "against")
      .reduce((sum, stat) => sum + parseFloat(stat.votesCount), 0);
    
    const abstainVotes = tallyProposal.voteStats
      .filter(stat => stat.type === "abstain")
      .reduce((sum, stat) => sum + parseFloat(stat.votesCount), 0);
    
    // Determine status based on proposal status
    const status = tallyProposal.status === "active" ? "active" : 
                   tallyProposal.status === "executed" ? "executed" : 
                   tallyProposal.status === "canceled" ? "defeated" : "active";
    
    // Check if delegate has voted (simplified - would need to cross-reference with contract)
    const voted = false; // This would need to be checked against the contract
    const voteDirection: "for" | "against" | null = null;
    
    return {
      title: `Compound Proposal ${tallyProposal.onchainId}`,
      status: status,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      votesFor: forVotes,
      votesAgainst: againstVotes,
      voted: voted,
      voteDirection: voteDirection,
      reasoning: `Compound DAO Proposal ${tallyProposal.onchainId} - ${tallyProposal.governor.name}`,
      impact: status === "executed" ? "High - Proposal executed" : 
             status === "active" ? "Medium - Currently active" : 
             "Pending review",
      // Additional metadata from Tally
      description: `Governance proposal from ${tallyProposal.governor.name}`,
      eta: undefined, // Not available in this schema
      governorName: tallyProposal.governor.name,
      totalVotes: tallyProposal.voteStats.reduce((sum, stat) => sum + stat.votersCount, 0),
      abstainVotes: abstainVotes
    };
  }
}

export default TallyService;
