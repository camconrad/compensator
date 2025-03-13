"use client";

import { useSettingIsHydrated } from "@/store/setting/selector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren } from "react";
import WagmiRainbowKitProvider from "./WagmiRainbowKitProvider";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const AppProvider = ({ children }: PropsWithChildren) => {
  const isHydrated = useSettingIsHydrated();

  if (!isHydrated) {
    return <></>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiRainbowKitProvider>{children}</WagmiRainbowKitProvider>
    </QueryClientProvider>
  );
};

export default AppProvider;
