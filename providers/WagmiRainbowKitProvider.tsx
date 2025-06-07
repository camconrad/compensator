"use client";

import { useSettingTheme } from "@/store/setting/selector";
import {
  RainbowKitProvider,
  getDefaultConfig,
  lightTheme,
  midnightTheme,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { PropsWithChildren } from "react";
import { mainnet } from "wagmi/chains";
import { WagmiProvider } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { ChainType, EVM, config, createConfig, getChains } from "@lifi/sdk";
import { CreateConnectorFn, getWalletClient, switchChain } from "@wagmi/core";
import { metaMask } from "wagmi/connectors";
import { useSyncWagmiConfig } from "@lifi/wallet-management";

const connectors: CreateConnectorFn[] = [metaMask()];

export const wagmiConfig = getDefaultConfig({
  appName: "Compensator",
  projectId: "02a231b2406ed316c861abefc95c5e59",
  chains: [mainnet],
  ssr: true,
});

// createConfig({
//   integrator: "bot",
//   apiKey: process.env.NEXT_PUBLIC_LIFI_KEY,
//   routeOptions: {
//     fee: 0.0099,
//   },
//   providers: [
//     EVM({
//       getWalletClient: () => getWalletClient(wagmiConfig),
//       switchChain: async (chainId) => {
//         const chain = await switchChain(wagmiConfig, { chainId: chainId as any });
//         return getWalletClient(wagmiConfig, { chainId: chain.id });
//       },
//     }),
//   ],
//   preloadChains: false,
// });

createConfig({
  integrator: "bot",
  providers: [
    EVM({
      getWalletClient: () => getWalletClient(wagmiConfig) as any,
      switchChain: async (chainId): Promise<any> => {
        const chain = await switchChain(wagmiConfig, { chainId: chainId as any });
        return getWalletClient(wagmiConfig, { chainId: chain.id });
      },
    }),
  ],
  // We disable chain preloading and will update chain configuration in runtime
  preloadChains: false,
});

const WagmiRainbowKitProvider = ({ children }: PropsWithChildren) => {
  const theme = useSettingTheme();

  const { data: chains } = useQuery({
    queryKey: ["chains"] as const,
    queryFn: async () => {
      const chains = await getChains({
        chainTypes: [ChainType.EVM],
      });
      config.setChains(chains);
      return chains;
    },
  });

  useSyncWagmiConfig(wagmiConfig, connectors, chains);


  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <RainbowKitProvider
        theme={theme === "dark" ? midnightTheme() : lightTheme()}
        // modalSize="compact"
      >
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
};

export default WagmiRainbowKitProvider;
