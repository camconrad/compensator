import { AxiosResponse } from "axios";
import { CompensatorService } from ".";

class CompensatorServices {
  async getListCompensators() {
    try {
      const response: AxiosResponse = await CompensatorService.apiMethod.get({
        url: "/",
      });
      return response.data;
    } catch (error) {
      console.log("error :>> ", error);
      return Promise.reject(error);
    }
  }
}

const compensatorServices = new CompensatorServices();

export default compensatorServices;
