import { MetaMaskInpageProvider } from "@metamask/providers";

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
  
  namespace NodeJS {
    interface ProcessEnv {
      FACTORY_ADDRESS?: string;
      PRIVATE_KEY?: string;
      ETHERSCAN_API_KEY?: string;
      MAINNET_RPC_URL?: string;
    }
  }
}