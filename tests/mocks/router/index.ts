// Export server components
export { default as app, server, broadcast } from './server';

// Export mock data and interfaces
export { 
  mockDevices, 
  MockDevice,
  findDeviceByMac,
  getOnlineDevices,
  getBlockedDevices,
  resetMockDevices
} from './mockData';

// Export helper functions
export {
  startMockServer,
  stopMockServer,
  getMockServerInstance,
  isMockServerRunning,
  getMockServerUrl,
  jestGlobalSetup,
  jestGlobalTeardown,
  jestTestSetup,
  waitForMockServer,
  MockServerConfig
} from './helpers';

// Re-export types for convenience
export type { Server } from 'http';
