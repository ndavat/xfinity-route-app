import axios, { AxiosInstance } from 'axios';
import { Config } from './config';
import { enhancedErrorHandler } from './ErrorLogger';
import { handleSessionCookie } from './cookieHelpers';

// Note: HTTPS agent configuration is not needed in React Native
// React Native handles HTTPS connections automatically

/**
 * Create and configure a centralized axios instance with recommended settings
 * Based on the comprehensive debugging guide recommendations
 */
const createAxiosInstance = (): AxiosInstance => {
  // Create axios instance with enhanced configuration
  const axiosInstance = axios.create({
    timeout: 10000, // 10 second timeout as recommended
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/html, */*',
      'User-Agent': 'XfinityRouteApp/1.0',
    },
    validateStatus: function (status) {
      return status >= 200 && status < 500; // Accept both success and client errors
    },
    maxRedirects: 5,
    withCredentials: true, // Important for session cookies
  });

  // Note: HTTPS agent configuration is not supported in React Native
  // For custom SSL handling, use React Native-specific libraries

  // Request interceptor for logging and timestamping
  axiosInstance.interceptors.request.use(
    (config) => {
      // Add timestamp to track request timing
      config.metadata = { requestTimestamp: new Date().toISOString() };
      
      if (Config.app.debugMode) {
        console.log(`[Axios Request] ${config.method?.toUpperCase()} ${config.url}`, {
          timestamp: config.metadata.requestTimestamp,
          headers: config.headers,
          params: config.params,
          data: config.data,
        });
      }
      return config;
    },
    async (error) => {
      if (Config.app.debugMode) {
        console.error('[Axios Request Error]:', error);
      }
      // Log request errors with enhanced error handler
      await enhancedErrorHandler(error, 'Request Interceptor');
      return Promise.reject(error);
    }
  );

// Response interceptor for logging and error handling
  axiosInstance.interceptors.response.use(
    (response) => {
      // Calculate response time if request timestamp is available
      const responseTime = response.config.metadata?.requestTimestamp
        ? Date.now() - new Date(response.config.metadata.requestTimestamp).getTime()
        : undefined;
      
      // Automatically handle session cookies from any response
      if (response.headers['set-cookie']) {
        handleSessionCookie(response, axiosInstance);
      }
      
      if (Config.app.debugMode) {
        console.log(`[Axios Response] ${response.status} ${response.config.url}`, {
          timestamp: new Date().toISOString(),
          responseTime: responseTime ? `${responseTime}ms` : 'N/A',
          headers: response.headers,
          data: response.data,
        });
      }
      return response;
    },
    async (error) => {
      // Use enhanced error handler to log and persist errors
      await enhancedErrorHandler(error, `Response Interceptor - ${error.config?.url || 'Unknown URL'}`);
      
      if (Config.app.debugMode) {
        const errorInfo = {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          method: error.config?.method,
          data: error.response?.data,
          requestTimestamp: error.config?.metadata?.requestTimestamp,
          responseTime: error.config?.metadata?.requestTimestamp
            ? Date.now() - new Date(error.config.metadata.requestTimestamp).getTime()
            : undefined,
        };
        console.error('[Axios Response Error]:', errorInfo);
      }

      // Enhanced error information
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        error.isServerError = error.response.status >= 500;
        error.isClientError = error.response.status >= 400 && error.response.status < 500;
        error.isAuthError = error.response.status === 401 || error.response.status === 403;
      } else if (error.request) {
        // The request was made but no response was received
        error.isNetworkError = true;
        error.isTimeout = error.code === 'ECONNABORTED';
      }

      return Promise.reject(error);
    }
  );

  return axiosInstance;
};

// Export a single instance to be shared across the application
export const axiosInstance = createAxiosInstance();

// Export the factory function if needed for creating additional instances
export { createAxiosInstance };
