"use client";

import { useSettingTheme } from "@/store/setting/selector";
import {
  RainbowKitProvider,
  lightTheme,
  midnightTheme,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { PropsWithChildren } from "react";
import { mainnet } from "wagmi/chains";
import { WagmiProvider, createConfig, http } from "wagmi";
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  trustWallet,
  ledgerWallet,
  braveWallet,
} from "@rainbow-me/rainbowkit/wallets";


const wallets = [
  metaMaskWallet({ projectId: "02a231b2406ed316c861abefc95c5e59" }),
  walletConnectWallet({ projectId: "02a231b2406ed316c861abefc95c5e59" }),
  coinbaseWallet({ appName: "Compensator" }),
  trustWallet({ projectId: "02a231b2406ed316c861abefc95c5e59" }),
  ledgerWallet({ projectId: "02a231b2406ed316c861abefc95c5e59" }),
  braveWallet({ projectId: "02a231b2406ed316c861abefc95c5e59" }),
];

const connectors = connectorsForWallets(wallets, {
  projectId: "02a231b2406ed316c861abefc95c5e59",
  appName: "Compensator",
});

const wagmiConfig = createConfig({
  connectors,
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
});

const WagmiRainbowKitProvider = ({ children }: PropsWithChildren) => {
  const theme = useSettingTheme();

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
