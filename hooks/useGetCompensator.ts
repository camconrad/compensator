import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { getEthersSigner } from "./useEtherProvider";
import { wagmiConfig } from "@/providers/WagmiRainbowKitProvider";
import { ethers } from "ethers";
import { compensatorContractInfo } from "@/constants";

export const useGetCompensatorContract = () => {
  const handleSetCompensatorContract = async (compensatorAddress: string) => {
    try {
      const { signer } = await getEthersSigner(wagmiConfig);
      const compensatorContract = new ethers.Contract(
        compensatorAddress || "",
        compensatorContractInfo.abi,
        signer
      );

      return compensatorContract;
    } catch (error) {
      console.error(error);
      return;
    }
  };

  return {
    handleSetCompensatorContract,
  };
};
