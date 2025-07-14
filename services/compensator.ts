import { compensatorFactoryContractInfo, compensatorContractInfo } from "@/constants";
import { getEthersSigner } from "@/hooks/useEtherProvider";
import { wagmiConfig } from "@/app/providers";
import { ethers } from "ethers";

export interface CompensatorInstance {
  address: string;
  owner: string;
  name: string;
  votingPower: string;
  totalStakes: string;
  createdAt: number;
}

export interface CompensatorStats {
  totalInstances: number;
  totalVotingPower: string;
  totalStakes: string;
  activeProposals: number;
}

class CompensatorService {
  private factoryContract: ethers.Contract | null = null;
  private instances: Map<string, CompensatorInstance> = new Map();

  /**
   * Initialize the factory contract
   */
  async initializeFactory() {
    if (this.factoryContract) return this.factoryContract;

    const { signer } = await getEthersSigner(wagmiConfig);
    this.factoryContract = new ethers.Contract(
      compensatorFactoryContractInfo.address!,
      compensatorFactoryContractInfo.abi,
      signer
    );

    return this.factoryContract;
  }

  /**
   * Create a new Compensator instance for a user
   */
  async createCompensator(userAddress: string, delegateName: string): Promise<string> {
    const factory = await this.initializeFactory();
    
    const tx = await factory.createCompensator(userAddress, delegateName);
    const receipt = await tx.wait();
    
    // Get the created compensator address
    const compensatorAddress = await factory.getCompensator(userAddress);
    
    // Add to local cache
    this.instances.set(compensatorAddress, {
      address: compensatorAddress,
      owner: userAddress,
      name: delegateName,
      votingPower: "0",
      totalStakes: "0",
      createdAt: Date.now()
    });

    return compensatorAddress;
  }

  /**
   * Get a user's Compensator instance address
   */
  async getCompensatorAddress(userAddress: string): Promise<string | null> {
    try {
      const factory = await this.initializeFactory();
      const address = await factory.getCompensator(userAddress);
      
      // Check if the address is valid (not zero address)
      if (address === ethers.ZeroAddress) {
        return null;
      }
      
      return address;
    } catch (error) {
      console.error("Error getting compensator address:", error);
      return null;
    }
  }

  /**
   * Get or create a Compensator instance for a user
   */
  async getOrCreateCompensator(userAddress: string, delegateName?: string): Promise<string> {
    // First try to get existing instance
    const existingAddress = await this.getCompensatorAddress(userAddress);
    if (existingAddress) {
      return existingAddress;
    }

    // Create new instance if none exists
    if (!delegateName) {
      delegateName = `Delegate_${userAddress.slice(0, 8)}`;
    }

    return await this.createCompensator(userAddress, delegateName);
  }

  /**
   * Get Compensator instance details
   */
  async getCompensatorInstance(address: string): Promise<CompensatorInstance | null> {
    // Check cache first
    if (this.instances.has(address)) {
      return this.instances.get(address)!;
    }

    try {
      const { signer } = await getEthersSigner(wagmiConfig);
      const contract = new ethers.Contract(
        address,
        compensatorContractInfo.abi,
        signer
      );

      // Get basic info
      const [owner, name, votingPower] = await Promise.all([
        contract.owner(),
        contract.name(),
        contract.getContractVotingPower()
      ]);

      const instance: CompensatorInstance = {
        address,
        owner,
        name,
        votingPower: votingPower.toString(),
        totalStakes: "0", // Would need to calculate from all proposals
        createdAt: Date.now() // Would need to get from contract events
      };

      // Cache the instance
      this.instances.set(address, instance);
      return instance;

    } catch (error) {
      console.error("Error getting compensator instance:", error);
      return null;
    }
  }

  /**
   * Get all Compensator instances
   */
  async getAllCompensators(): Promise<CompensatorInstance[]> {
    try {
      const factory = await this.initializeFactory();
      const addresses = await factory.getCompensators();
      
      const instances: CompensatorInstance[] = [];
      
      for (const address of addresses) {
        const instance = await this.getCompensatorInstance(address);
        if (instance) {
          instances.push(instance);
        }
      }

      return instances;
    } catch (error) {
      console.error("Error getting all compensators:", error);
      return [];
    }
  }

  /**
   * Get Compensator statistics
   */
  async getCompensatorStats(): Promise<CompensatorStats> {
    const instances = await this.getAllCompensators();
    
    let totalVotingPower = ethers.parseUnits("0", 18);
    let totalStakes = ethers.parseUnits("0", 18);
    let activeProposals = 0;

    for (const instance of instances) {
      totalVotingPower += ethers.parseUnits(instance.votingPower, 18);
      totalStakes += ethers.parseUnits(instance.totalStakes, 18);
      // Would need to query active proposals from each instance
    }

    return {
      totalInstances: instances.length,
      totalVotingPower: ethers.formatUnits(totalVotingPower, 18),
      totalStakes: ethers.formatUnits(totalStakes, 18),
      activeProposals
    };
  }

  /**
   * Get a user's Compensator contract instance
   */
  async getUserCompensatorContract(userAddress: string): Promise<ethers.Contract | null> {
    const address = await this.getCompensatorAddress(userAddress);
    if (!address) return null;

    const { signer } = await getEthersSigner(wagmiConfig);
    return new ethers.Contract(
      address,
      compensatorContractInfo.abi,
      signer
    );
  }

  /**
   * Check if a user has a Compensator instance
   */
  async hasCompensator(userAddress: string): Promise<boolean> {
    const address = await this.getCompensatorAddress(userAddress);
    return address !== null;
  }

  /**
   * Get user's voting power in their Compensator contract
   */
  async getUserVotingPower(userAddress: string): Promise<string> {
    try {
      const contract = await this.getUserCompensatorContract(userAddress);
      if (!contract) return "0";

      const votingPower = await contract.getContractVotingPower();
      return ethers.formatUnits(votingPower, 18);
    } catch (error) {
      console.error("Error getting user voting power:", error);
      return "0";
    }
  }

  /**
   * Get user's pending rewards
   */
  async getUserPendingRewards(userAddress: string): Promise<string> {
    try {
      const contract = await this.getUserCompensatorContract(userAddress);
      if (!contract) return "0";

      const rewards = await contract.getPendingRewards(userAddress);
      return ethers.formatUnits(rewards, 18);
    } catch (error) {
      console.error("Error getting user pending rewards:", error);
      return "0";
    }
  }

  /**
   * Get proposal stakes for a user
   */
  async getUserProposalStakes(userAddress: string, proposalId: number): Promise<{
    forStake: string;
    againstStake: string;
  }> {
    try {
      const contract = await this.getUserCompensatorContract(userAddress);
      if (!contract) return { forStake: "0", againstStake: "0" };

      const stakes = await contract.proposalStakes(proposalId, userAddress);
      return {
        forStake: ethers.formatUnits(stakes.forStake, 18),
        againstStake: ethers.formatUnits(stakes.againstStake, 18)
      };
    } catch (error) {
      console.error("Error getting user proposal stakes:", error);
      return { forStake: "0", againstStake: "0" };
    }
  }

  /**
   * Get total stakes for a proposal
   */
  async getProposalTotalStakes(proposalId: number): Promise<{
    forStakes: string;
    againstStakes: string;
  }> {
    try {
      const instances = await this.getAllCompensators();
      let totalFor = ethers.parseUnits("0", 18);
      let totalAgainst = ethers.parseUnits("0", 18);

      for (const instance of instances) {
        const { signer } = await getEthersSigner(wagmiConfig);
        const contract = new ethers.Contract(
          instance.address,
          compensatorContractInfo.abi,
          signer
        );

        const [forStakes, againstStakes] = await Promise.all([
          contract.totalStakesFor(proposalId),
          contract.totalStakesAgainst(proposalId)
        ]);

        totalFor += forStakes;
        totalAgainst += againstStakes;
      }

      return {
        forStakes: ethers.formatUnits(totalFor, 18),
        againstStakes: ethers.formatUnits(totalAgainst, 18)
      };
    } catch (error) {
      console.error("Error getting proposal total stakes:", error);
      return { forStakes: "0", againstStakes: "0" };
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.instances.clear();
  }

  /**
   * Remove instance from cache
   */
  removeFromCache(address: string) {
    this.instances.delete(address);
  }
}

// Export singleton instance
export const compensatorService = new CompensatorService();
