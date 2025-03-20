export const envConfig = {
  PREFIX_REF: "Aquatic_",
  ADMIN_REF: 'Aquatic_2025'
};

import { compensatorAbi } from "./abi/compensator";

export interface IContractInfo {
  name?: string;
  address: string;
  abi: any;
}

export const compensatorContractInfo: IContractInfo = {
  abi: compensatorAbi,
  address: "0xE76632FF20e31ac970CEBA307375C5A4f89a32fC",
};
