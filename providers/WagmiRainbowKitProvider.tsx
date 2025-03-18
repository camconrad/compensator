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
import { metaMask, walletConnect, coinbaseWallet} from "wagmi/connectors";

const connectors = [metaMask(), walletConnect({ projectId: "02a231b2406ed316c861abefc95c5e59" }), coinbaseWallet({ appName: "Compensator" })];

const wagmiConfig = getDefaultConfig({
  appName: "Compensator",
  projectId: "02a231b2406ed316c861abefc95c5e59",
  chains: [mainnet],
  ssr: true,
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

export default WagmiRainbowKitProvider
