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
import { metaMask } from "wagmi/connectors";

const connectors = [metaMask()];

const wagmiConfig = getDefaultConfig({
  appName: "Compensator",
  projectId: "compensator",
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

export default WagmiRainbowKitProvider;
