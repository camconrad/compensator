import {
    compoundTokenContractInfo
} from "@/constants";
import { wagmiConfig } from "@/app/providers";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { getEthersSigner } from "./useEtherProvider";

export const useGetCompoundContract = () => {
  const { address } = useAccount();
  const [compoundContract, setCompoundContract] = useState<any>();

  const handleSetContract = async () => {
    try {
      const { signer } = await getEthersSigner(wagmiConfig);
      const compoundContract = new ethers.Contract(
        compoundTokenContractInfo.address || "",
        compoundTokenContractInfo.abi,
        signer
      );
      setCompoundContract(compoundContract);
    } catch (error) {}
  };

  useEffect(() => {
    if (compoundTokenContractInfo && address) {
      handleSetContract();
    }
  }, [compoundTokenContractInfo, address]);

  return {
    compoundContract,
  };
};
