"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAccount, useDisconnect } from "wagmi";

const ConnectWalletButton = () => {
  const { openConnectModal } = useConnectModal();
  const { address } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const [isLoading, setIsLoading] = useState(false);

  const handleConnectWallet = async () => {
    setIsLoading(true);
    try {
      openConnectModal && openConnectModal();
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectWallet = async () => {
    setIsLoading(true);
    try {
      await disconnectAsync();
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
  };

  if (!address) {
    return (
      <motion.button
        onClick={handleConnectWallet}
        variants={buttonVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        disabled={isLoading}
        className={`${
          isLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
        } w-full px-4 py-[6px] min-h-[36px] font-[family-name:var(--font-geist-sans)] font-semibold text-xs transition-colors bg-[#fefefe] dark:bg-gray-700 border border-emerald-500 dark:border-emerald-700 text-black dark:text-white rounded-full flex justify-center items-center`}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          "Connect Wallet"
        )}
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={handleDisconnectWallet}
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      disabled={isLoading}
      className={`${
        isLoading
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-red-700 hover:text-white"
      } w-full px-[10px] py-1 min-h-[34px] font-[family-name:var(--font-geist-sans)] font-medium transition-colors text-sm text-red-600 border border-red-600 rounded-full flex justify-center items-center`}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : (
        "Disconnect"
      )}
    </motion.button>
  );
};

export default ConnectWalletButton;
