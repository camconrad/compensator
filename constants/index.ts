import { compensatorAbi } from "./abi/compensator";
import { compensatorFactoryAbi } from "./abi/compensatorFactory";
import { compoundTokenAbi } from "./abi/compoundToken";


export interface IContractInfo {
  name?: string;
  address?: string;
  abi: any;
}

export const compensatorFactoryContractInfo: IContractInfo = {
  abi: compensatorFactoryAbi,
  address: process.env.FACTORY_ADDRESS || "",
};

export const compensatorContractInfo: IContractInfo = {
  abi: compensatorAbi,
  address: "",
};

export const compoundTokenContractInfo: IContractInfo = {
  abi: compoundTokenAbi,
  address: "0xc00e94cb662c3520282e6f5717214004a7f26888",
};


