import { useState, useEffect } from 'react';
import { AnalyticsService, AnalyticsData } from '@/services/analytics';

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const analyticsService = AnalyticsService.getInstance();
      const data = await analyticsService.getCompoundGovernanceMetrics();
      
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return {
    analytics,
    isLoading,
    error,
    refetch: () => {
      setIsLoading(true);
      setError(null);
      fetchAnalytics();
    }
  };
}
