import { useQuery } from '@tanstack/react-query';
import TallyService from '@/services/tally';

export interface UseTallyProposalsOptions {
  limit?: number;
  chainId?: string;
  enabled?: boolean;
}

export interface UseTallyProposalsReturn {
  proposals: TallyProposal[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useTallyProposals(options: UseTallyProposalsOptions = {}): UseTallyProposalsReturn {
  const { 
    limit = 20, 
    chainId = "eip155:1", // Ethereum mainnet by default
    enabled = true 
  } = options;

  const { data: proposals = [], isLoading, error, refetch } = useQuery({
    queryKey: ['tally-proposals', limit],
    queryFn: () => TallyService.getCompoundProposals(limit),
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  return {
    proposals,
    isLoading,
    error,
    refetch,
  };
}

export function useTallyProposal(proposalId: string) {
  const [proposal, setProposal] = useState<TallyProposal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProposal = async () => {
      if (!proposalId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const fetchedProposal = await TallyService.getProposalById(proposalId);
        setProposal(fetchedProposal);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch proposal'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposal();
  }, [proposalId]);

  return {
    proposal,
    isLoading,
    error,
  };
}

export default useTallyProposals;
