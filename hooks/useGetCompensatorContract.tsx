import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { getEthersSigner } from "./useEtherProvider";
import { wagmiConfig } from "@/providers/WagmiRainbowKitProvider";
import { ethers } from "ethers";
import { compensatorContractInfo } from "@/constants";

export const useGetCompensatorContract = () => {
  const { address } = useAccount();
  const [compensatorContract, setCompensatorContract] = useState<any>();

  const handleSetContract = async () => {
    try {
      const { signer } = await getEthersSigner(wagmiConfig);
      // aqua core contract
      const aquaCoreContract = new ethers.Contract(
        compensatorContractInfo.address,
        compensatorContractInfo.abi,
        signer
      );
      setCompensatorContract(aquaCoreContract);
    } catch (error) {}
  };

  useEffect(() => {
    if (compensatorContractInfo && address) {
      handleSetContract();
    }
  }, [compensatorContractInfo, address]);

  return {
    compensatorContract,
  };
};
