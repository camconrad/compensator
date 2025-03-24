import { type AxiosRequestConfig } from "axios";
import httpClient from "./httpClient";

export const ACCESS_TOKEN_KEY = "access-token";

export type ApiParamsProps = Record<
  string,
  string | number | string[] | number[] | undefined | boolean
>;

export enum API_SERVICES {
  AUTH_SERVICE = "auth",
  COMPENSATOR = 'compensator'
}

export const getApiEndpoint = (service?: API_SERVICES): string => {
  if (service) return `${process.env.NEXT_PUBLIC_API_URL}/${service}`;
  return `${process.env.NEXT_PUBLIC_API_URL}`;
};

interface ApiServiceProps {
  url: string;
  params?: ApiParamsProps;
  data?: unknown;
  config?: AxiosRequestConfig;
  id?: number | string;
  endpoint?: string;
}

interface ApiMethodProps {
  get: <T>(props: ApiServiceProps) => Promise<T>;
  post: <T>(props: ApiServiceProps) => Promise<T>;
  put: <T>(props: ApiServiceProps) => Promise<T>;
  patch: <T>(props: ApiServiceProps) => Promise<T>;
  delete: <T>(props: ApiServiceProps) => Promise<T>;
}

export const GetApiMethodInstance = (apiService: string): ApiMethodProps => {
  return {
    get: async <T>({ url, params, config }: ApiServiceProps) => {
      return httpClient.get<T>(`${apiService}${url}`, {
        ...config,
        params: params,
      });
    },
    post: async <T = unknown>({ url, data, params, config }: ApiServiceProps) => {
      return httpClient.post<T>(`${apiService}${url}`, data, {
        ...config,
        params: params,
      });
    },
    put: async ({ url, data, params, config }: ApiServiceProps) => {
      return httpClient.put(`${apiService}${url}`, data, {
        ...config,
        params: params,
      });
    },
    patch: async ({ url, data, params }: ApiServiceProps) => {
      return httpClient.patch(`${apiService}${url}`, data, {
        params: params,
      });
    },
    delete: async ({ url, id, params }: ApiServiceProps) => {
      return httpClient.delete(id ? `${apiService}${url}/${id}` : `${apiService}${url}`, {
        params: params,
      });
    },
  };
};

export class ApiService {
  constructor(service: string) {
    this.apiMethod = GetApiMethodInstance(service);
  }

  apiMethod: ApiMethodProps;
}

// Export API endpoints
export const AUTH_SERVICE_ENDPOINT = getApiEndpoint(API_SERVICES.AUTH_SERVICE);
export const COMPENSATOR_SERVICE_ENDPOINT = getApiEndpoint(API_SERVICES.COMPENSATOR);
export const DEFAULT_ENDPOINT = getApiEndpoint();

// Export API client methods
export const AuthService = new ApiService(AUTH_SERVICE_ENDPOINT);
export const CompensatorService = new ApiService(COMPENSATOR_SERVICE_ENDPOINT);
export const DefaultService = new ApiService(DEFAULT_ENDPOINT);
