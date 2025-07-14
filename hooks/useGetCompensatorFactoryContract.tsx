import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { getEthersSigner } from "./useEtherProvider";
import { wagmiConfig } from "@/app/providers";
import { ethers } from "ethers";
import { compensatorFactoryContractInfo } from "@/constants";

export const useGetCompensatorFactoryContract = () => {
  const { address } = useAccount();
  const [compensatorFactoryContract, setCompensatorFactoryContract] = useState<any>();

  const handleSetContract = async () => {
    try {
      const { signer } = await getEthersSigner(wagmiConfig);
      const compensatorFactoryContract = new ethers.Contract(
        compensatorFactoryContractInfo.address || '',
        compensatorFactoryContractInfo.abi,
        signer
      );
      setCompensatorFactoryContract(compensatorFactoryContract);
    } catch (error) {}
  };

  useEffect(() => {
    if (compensatorFactoryContractInfo && address) {
      handleSetContract();
    }
  }, [compensatorFactoryContractInfo, address]);

  return {
    compensatorFactoryContract,
  };
};
