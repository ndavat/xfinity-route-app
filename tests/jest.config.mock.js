// Jest configuration for tests using the mock router server
// This is an example configuration - adapt it to your existing jest.config.js

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Global setup and teardown for mock server
  globalSetup: '<rootDir>/tests/mocks/router/helpers.ts',
  globalTeardown: '<rootDir>/tests/mocks/router/helpers.ts',
  
  // Setup files for individual tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],
  
  // Test patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts'
  ],
  
  // Module path mapping (adjust as needed for your project structure)
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Environment variables
  setupFiles: ['<rootDir>/tests/env.setup.ts'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.stories.{ts,tsx}'
  ],
  
  // Test timeout (give enough time for server startup/shutdown)
  testTimeout: 10000,
  
  // Verbose output for debugging
  verbose: true,
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ]
};
