import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: {
      requestTimestamp: string;
    };
  }
}
