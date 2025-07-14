import { compensatorAbi } from "./abi/compensator";
import { compensatorFactoryAbi } from "./abi/compensatorFactory";
import { compoundTokenAbi } from "./abi/compoundToken";
import { compoundGovernorAbi } from "./abi/compoundGovernor";

export interface IContractInfo {
  name?: string;
  address?: string;
  abi: any;
}

export const compensatorFactoryContractInfo: IContractInfo = {
  abi: compensatorFactoryAbi,
  address: "0x9015934EC9149c41f6B8d9D8Ea2358181Ba48Ff3",
};

export const compensatorContractInfo: IContractInfo = {
  abi: compensatorAbi,
  address: "",
};

export const compoundTokenContractInfo: IContractInfo = {
  abi: compoundTokenAbi,
  address: "0xc00e94cb662c3520282e6f5717214004a7f26888",
};

export const compoundGovernorContractInfo: IContractInfo = {
  abi: compoundGovernorAbi,
  address: "0x309a862bbC1A00e45506cB8A802D1ff10004c8C0",
};
