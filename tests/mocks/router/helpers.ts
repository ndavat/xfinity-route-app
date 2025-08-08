import { Server } from 'http';
import { server } from './server';
import { resetMockDevices } from './mockData';

let mockServerInstance: Server | null = null;
const DEFAULT_PORT = 3001;
const DEFAULT_HOST = 'localhost';

export interface MockServerConfig {
  port?: number;
  host?: string;
  enableLogs?: boolean;
}

/**
 * Starts the mock router server
 */
export async function startMockServer(config: MockServerConfig = {}): Promise<{
  server: Server;
  url: string;
  port: number;
  host: string;
}> {
  const {
    port = DEFAULT_PORT,
    host = DEFAULT_HOST,
    enableLogs = false
  } = config;

  // Reset mock devices to initial state
  resetMockDevices();

  return new Promise((resolve, reject) => {
    if (mockServerInstance) {
      reject(new Error('Mock server is already running'));
      return;
    }

    mockServerInstance = server.listen(port, host, () => {
      const url = `http://${host}:${port}`;
      
      if (enableLogs) {
        console.log(`Mock router server started at ${url}`);
      }

      resolve({
        server: mockServerInstance!,
        url,
        port,
        host
      });
    });

    mockServerInstance.on('error', (error) => {
      mockServerInstance = null;
      reject(error);
    });
  });
}

/**
 * Stops the mock router server
 */
export async function stopMockServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!mockServerInstance) {
      resolve();
      return;
    }

    mockServerInstance.close((error) => {
      mockServerInstance = null;
      
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Gets the current mock server instance
 */
export function getMockServerInstance(): Server | null {
  return mockServerInstance;
}

/**
 * Checks if the mock server is running
 */
export function isMockServerRunning(): boolean {
  return mockServerInstance !== null && mockServerInstance.listening;
}

/**
 * Gets the mock server URL if it's running
 */
export function getMockServerUrl(): string | null {
  if (!isMockServerRunning() || !mockServerInstance) {
    return null;
  }

  const address = mockServerInstance.address();
  if (!address || typeof address === 'string') {
    return null;
  }

  const host = address.address === '::' ? 'localhost' : address.address;
  return `http://${host}:${address.port}`;
}

/**
 * Jest global setup function
 * This can be used in jest.config.js as globalSetup
 */
export async function jestGlobalSetup(): Promise<void> {
  const port = parseInt(process.env.MOCK_SERVER_PORT || '3001', 10);
  const host = process.env.MOCK_SERVER_HOST || 'localhost';
  
  try {
    const result = await startMockServer({ 
      port, 
      host, 
      enableLogs: process.env.NODE_ENV !== 'test' 
    });
    
    // Store the server details in global variables for tests to access
    (global as any).__MOCK_SERVER_URL__ = result.url;
    (global as any).__MOCK_SERVER_PORT__ = result.port;
    (global as any).__MOCK_SERVER_HOST__ = result.host;
    
    console.log(`Mock router server started for testing at ${result.url}`);
  } catch (error) {
    console.error('Failed to start mock server:', error);
    throw error;
  }
}

/**
 * Jest global teardown function
 * This can be used in jest.config.js as globalTeardown
 */
export async function jestGlobalTeardown(): Promise<void> {
  try {
    await stopMockServer();
    console.log('Mock router server stopped');
  } catch (error) {
    console.error('Failed to stop mock server:', error);
    throw error;
  }
}

/**
 * Jest setup function for individual test files
 * This can be used in setupFilesAfterEnv
 */
export function jestTestSetup(): void {
  // Reset mock devices before each test
  beforeEach(() => {
    resetMockDevices();
  });
}

/**
 * Utility function to wait for the mock server to be ready
 */
export async function waitForMockServer(
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (isMockServerRunning()) {
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Mock server did not start within ${timeout}ms`);
}
