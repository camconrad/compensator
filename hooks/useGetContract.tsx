import { ethers } from "ethers";
import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";
import { compensatorFactoryContractInfo, compoundTokenContractInfo, compoundGovernorContractInfo } from "@/constants";

export const useGetContract = () => {
  const { address } = useAccount();
  const chainId = useChainId();

  const getProvider = () => {
    if (!window.ethereum) return undefined;
    return new ethers.BrowserProvider(window.ethereum);
  };

  const getReadContract = async (
    target: string | ethers.Addressable,
    abi: ethers.Interface | ethers.InterfaceAbi
  ): Promise<ethers.Contract | undefined> => {
    if (!target || !abi || !chainId) return undefined;

    const provider = getProvider();
    if (!provider) return undefined;

    return new ethers.Contract(target, abi, provider);
  };

  const getWriteContract = async (
    target: string | ethers.Addressable,
    abi: ethers.Interface | ethers.InterfaceAbi
  ): Promise<ethers.Contract | undefined> => {
    if (!target || !abi || !chainId || !address) return undefined;

    const provider = getProvider();
    if (!provider) return undefined;

    const signer = await provider.getSigner(address);
    return new ethers.Contract(target, abi, signer);
  };

  return {
    getProvider,
    getReadContract,
    getWriteContract,
  };
};

export const useGetGovernorContract = () => {
  const governorContractConfig = {
    address: compoundGovernorContractInfo.address as `0x${string}`,
    abi: compoundGovernorContractInfo.abi,
  };

  return { governorContractConfig };
};
