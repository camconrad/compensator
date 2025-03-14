import { uniqBy } from "lodash";
import useSWR from "swr";

export interface Agent {
  id: string;
  name: string;
  imageUrl: string;
}

const fetchDelegates = async () => {
  try {
    // ✅ Fetch delegates via Next.js Proxy
    const [delegatesResponse] = await Promise.all([
      fetch("/api/delegates")
        .then((res) => res.json())
        .catch(() => []), // Fallback to an empty array if the fetch fails
    ]);

    // ✅ Merge, filter, and format delegates
    const mappedDelegates = uniqBy(
      [
        ...(delegatesResponse?.map((delegate: any) => ({ ...delegate })) || []), // Fallback to an empty array if delegatesResponse is undefined
      ],
      "id"
    ).map((delegate: any) => {
      return {
        id: delegate.id,
        name: delegate.name,
        imageUrl: delegate.image,
      };
    });

    return mappedDelegates;
  } catch (err) {
    console.error("Error fetching delegates:", err);
    throw new Error("Error fetching agent data");
  }
};

const useDelegates = () => {
  const { data, error, isLoading } = useSWR("fetchDelegates", fetchDelegates, {
    revalidateOnFocus: false,
    refreshInterval: 60000, // 1 minute
    dedupingInterval: 60000, // 1 minute
    onError: (error) => {
      console.error("Error fetching delegates:", error);
    },
  });

  return { delegates: data || [], loading: isLoading, error };
};

export default useDelegates;