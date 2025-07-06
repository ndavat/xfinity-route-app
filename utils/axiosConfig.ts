import axios, { AxiosInstance } from 'axios';
import { Config } from './config';
import { enhancedErrorHandler } from './ErrorLogger';
import { handleSessionCookie } from './cookieHelpers';
import { addLog } from '../services/debug/LogStore';
import { getRouterIp } from './GatewayDiscovery';

// Extend Axios request config to include metadata
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      requestTimestamp: string;
      retryCount: number;
      requestId: string;
    };
  }
}

// Note: HTTPS agent configuration is not needed in React Native
// React Native handles HTTPS connections automatically

/**
 * Create and configure a centralized axios instance with recommended settings
 * Based on the comprehensive debugging guide recommendations
 */
const createAxiosInstance = (): AxiosInstance => {
  const maxRetries = Config.api.maxRetryAttempts || 3;
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
    async (config) => {
      // Add timestamp and unique request ID to track request timing
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      config.metadata = { requestTimestamp: new Date().toISOString(), retryCount: 0, requestId };
      let gatewayIp = 'unknown';
      try {
        // Fetch and attach gateway IP
        gatewayIp = await getRouterIp();
        config.headers['X-Gateway-Ip'] = gatewayIp;
      } catch (error) {
        console.warn('Failed to attach gateway IP:', error);
      }

      // Log request start
      await addLog({
        type: 'request',
        url: config.url,
        method: config.method,
        gatewayIp,
        requestTime: Date.now(),
        requestId,
        config: {
          timeout: config.timeout,
          retries: maxRetries,
          url: config.url,
          method: config.method
        }
      });
    
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
    async (response) => {
    // Calculate response time if request timestamp is available
    const responseTime = response.config.metadata?.requestTimestamp
      ? Date.now() - new Date(response.config.metadata.requestTimestamp).getTime()
      : undefined;
      
    // Log response details
    await addLog({
      type: 'response',
      url: response.config.url,
      method: response.config.method,
      gatewayIp: response.config.headers['X-Gateway-Ip'],
      responseTime: responseTime,
      statusCode: response.status,
      requestId: response.config.metadata?.requestId,
      headers: response.headers,
      config: response.config
    });

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
    const config = error.config;
    config.metadata.retryCount = config.metadata.retryCount || 0;
    const maxRetries = Config.api.maxRetryAttempts || 3;

    // If retry attempts available, retry the request
    if (config && config.metadata.retryCount < maxRetries) {
      config.metadata.retryCount += 1;
      const backoffDelay = Math.pow(2, config.metadata.retryCount) * 100;
      
      await addLog({
        type: 'retry',
        url: config.url,
        method: config.method,
        gatewayIp: config.headers['X-Gateway-Ip'],
        retryAttempt: config.metadata.retryCount,
        maxRetries: maxRetries,
        backoffDelay,
        requestId: config.metadata.requestId
      });

      console.warn(`Retrying request (Attempt ${config.metadata.retryCount}) ...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return axiosInstance(config);
    }

    // Classify error type for detailed logging
    const classifyError = (error: any) => {
      if (error.response) {
        // Server responded with status code
        if (error.response.status >= 500) return 'server';
        if (error.response.status >= 400) return 'client';
        return 'unknown';
      } else if (error.request) {
        // Request was made but no response received
        if (error.code === 'ECONNABORTED') return 'timeout';
        if (error.code === 'ENOTFOUND' || error.code === 'EAI_NONAME') return 'dns';
        if (error.code === 'ECONNREFUSED') return 'connection_refused';
        if (error.message?.toLowerCase().includes('cors')) return 'cors';
        if (error.code === 'NETWORK_ERROR') return 'network';
        return 'network';
      }
      return 'unknown';
    };

    const errorType = classifyError(error);
    const responseTime = config?.metadata?.requestTimestamp
      ? Date.now() - new Date(config.metadata.requestTimestamp).getTime()
      : undefined;

    // On final failure, log the error
    await addLog({
      type: 'error',
      url: config?.url,
      method: config?.method,
      gatewayIp: config?.headers['X-Gateway-Ip'],
      responseTime,
      statusCode: error.response?.status,
      errorType,
      errorMessage: error.message,
      retryAttempt: config?.metadata?.retryCount || 0,
      maxRetries,
      requestId: config?.metadata?.requestId,
      headers: error.response?.headers,
      config
    });

    // Use enhanced error handler
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
        responseTime,
        errorType,
        retryAttempt: config?.metadata?.retryCount || 0,
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
