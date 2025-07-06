import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ErrorInfo {
  timestamp: string;
  context: string;
  message: string;
  code?: string;
  status?: number;
  statusText?: string;
  headers?: any;
  config?: {
    url?: string;
    method?: string;
    timeout?: number;
  };
  requestTimestamp?: string;
  responseTime?: number;
}

/**
 * Enhanced error handler that logs comprehensive error information
 * and persists the last error to AsyncStorage
 */
export const enhancedErrorHandler = async (error: any, context: string): Promise<ErrorInfo> => {
  const errorInfo: ErrorInfo = {
    timestamp: new Date().toISOString(),
    context,
    message: error.message,
    code: error.code,
    status: error.response?.status,
    statusText: error.response?.statusText,
    headers: error.response?.headers,
    config: {
      url: error.config?.url,
      method: error.config?.method,
      timeout: error.config?.timeout,
    },
  };

  // Add request timing information if available
  if (error.config?.metadata?.requestTimestamp) {
    errorInfo.requestTimestamp = error.config.metadata.requestTimestamp;
    errorInfo.responseTime = Date.now() - new Date(error.config.metadata.requestTimestamp).getTime();
  }

  console.error('Enhanced Error Log:', JSON.stringify(errorInfo, null, 2));

  // Store error for debugging
  try {
    await AsyncStorage.setItem('lastError', JSON.stringify(errorInfo));
  } catch (storageError) {
    console.error('Failed to store error in AsyncStorage:', storageError);
  }

  return errorInfo;
};

/**
 * Retrieve the last stored error from AsyncStorage
 */
export const getLastError = async (): Promise<ErrorInfo | null> => {
  try {
    const lastError = await AsyncStorage.getItem('lastError');
    return lastError ? JSON.parse(lastError) : null;
  } catch (error) {
    console.error('Failed to retrieve last error from AsyncStorage:', error);
    return null;
  }
};

/**
 * Clear the last stored error from AsyncStorage
 */
export const clearLastError = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('lastError');
  } catch (error) {
    console.error('Failed to clear last error from AsyncStorage:', error);
  }
};
