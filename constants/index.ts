import { compensatorAbi } from "./abi/compensator";
import { compensatorFactoryAbi } from "./abi/compensatorFactory";

export interface IContractInfo {
  name?: string;
  address?: string;
  abi: any;
}

export const compensatorFactoryContractInfo: IContractInfo = {
  abi: compensatorFactoryAbi,
  address: "0xE76632FF20e31ac970CEBA307375C5A4f89a32fC",
};

export const compensatorContractInfo: IContractInfo = {
  abi: compensatorAbi,
  address: "",
};
