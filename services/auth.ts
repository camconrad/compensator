import { AxiosResponse } from "axios";
import { AuthService } from ".";

class AuthServices {
  async login(walletAddress: string) {
    try {
      const response: AxiosResponse = await AuthService.apiMethod.post({
        url: "/login",
        data: { wallet_address: walletAddress },
      });
      return response.data;
    } catch (error) {
      console.log("error :>> ", error);
      return Promise.reject(error);
    }
  }

  async getProfile(walletAddress: string) {
    try {
      const response: AxiosResponse = await AuthService.apiMethod.get({
        url: "/profile",
      });
      return response.data;
    } catch (error) {
      console.log("error :>> ", error);
      return Promise.reject(error);
    }
  }
}

const authServices = new AuthServices();

export default authServices;
