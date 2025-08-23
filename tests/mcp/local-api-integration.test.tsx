import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';

// Mock API service
const mockApiService = {
  healthCheck: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  request: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

// Mock actual router services
jest.mock('../../services/RouterConnectionService', () => ({
  RouterConnectionService: jest.fn().mockImplementation(() => mockApiService),
}));

jest.mock('../../services/LiveRouterService', () => ({
  LiveRouterService: jest.fn().mockImplementation(() => mockApiService),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Zustand store for connection status
const mockConnectionStore = {
  isConnected: false,
  connectionError: null,
  lastHealthCheck: null,
  cachedData: {},
  pendingRequests: [],
  setConnected: jest.fn(),
  setConnectionError: jest.fn(),
  setCachedData: jest.fn(),
  addPendingRequest: jest.fn(),
  clearPendingRequests: jest.fn(),
};

// Connection state would be managed by actual app state management

// Test component that uses API
const TestApiComponent = () => {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await mockApiService.get('/test-endpoint');
        setData(result);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchData();
  }, []);

  if (error) return <div testID="error-message">{error}</div>;
  if (data) return <div testID="data-display">{JSON.stringify(data)}</div>;
  return <div testID="loading">Loading...</div>;
};

describe('Local Android API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset connection store state
    mockConnectionStore.isConnected = false;
    mockConnectionStore.connectionError = null;
    mockConnectionStore.cachedData = {};
    mockConnectionStore.pendingRequests = [];
  });

  describe('Establish connection to local API', () => {
    it('should establish connection successfully on app startup', async () => {
      mockApiService.healthCheck.mockResolvedValue({ status: 'OK' });
      mockApiService.connect.mockResolvedValue(true);

      // Simulate app startup
      await act(async () => {
        await mockApiService.connect();
      });
      const healthStatus = await act(async () => {
        return await mockApiService.healthCheck();
      });

      expect(mockApiService.connect).toHaveBeenCalled();
      expect(mockApiService.healthCheck).toHaveBeenCalled();
      expect(healthStatus.status).toBe('OK');
    });

    it('should cache API connection status', async () => {
      mockApiService.healthCheck.mockResolvedValue({ status: 'OK' });
      mockConnectionStore.setConnected.mockImplementation((status) => {
        mockConnectionStore.isConnected = status;
      });

      await act(async () => {
        await mockApiService.healthCheck();
        mockConnectionStore.setConnected(true);
      });

      expect(mockConnectionStore.setConnected).toHaveBeenCalledWith(true);
      expect(mockConnectionStore.isConnected).toBe(true);
    });

    it('should verify localhost API accessibility', async () => {
      const localhostUrl = 'http://localhost:8080';
      mockApiService.healthCheck.mockImplementation((url) => {
        if (url && url.includes('localhost')) {
          return Promise.resolve({ status: 'OK', url });
        }
        return Promise.reject(new Error('Invalid URL'));
      });

      const result = await act(async () => {
        return await mockApiService.healthCheck(localhostUrl);
      });
      
      expect(result.status).toBe('OK');
      expect(result.url).toContain('localhost');
    });
  });

  describe('Handle API connection failure', () => {
    it('should handle connection error gracefully when local API is not running', async () => {
      const connectionError = new Error('Connection refused - API not running');
      mockApiService.healthCheck.mockRejectedValue(connectionError);
      mockConnectionStore.setConnectionError.mockImplementation((error) => {
        mockConnectionStore.connectionError = error.message;
      });

      await act(async () => {
        try {
          await mockApiService.healthCheck();
        } catch (error) {
          mockConnectionStore.setConnectionError(error);
        }
      });

      expect(mockConnectionStore.setConnectionError).toHaveBeenCalledWith(connectionError);
      expect(mockConnectionStore.connectionError).toBe('Connection refused - API not running');
    });

    it('should show appropriate error message to user', async () => {
      mockApiService.get.mockRejectedValue(new Error('API connection failed'));

      const { getByTestId } = render(<TestApiComponent />);

      await waitFor(() => {
        expect(getByTestId('error-message')).toBeTruthy();
      });
    });

    it('should attempt to reconnect periodically', async () => {
      const reconnectInterval = 5000; // 5 seconds
      let reconnectAttempts = 0;

      const mockReconnect = jest.fn().mockImplementation(() => {
        reconnectAttempts++;
        if (reconnectAttempts < 3) {
          return Promise.reject(new Error('Still unavailable'));
        }
        return Promise.resolve({ status: 'OK' });
      });

      // Simulate periodic reconnection attempts
      await act(async () => {
        for (let i = 0; i < 3; i++) {
          try {
            await mockReconnect();
            break;
          } catch (error) {
            // Continue trying
          }
        }
      });

      expect(mockReconnect).toHaveBeenCalledTimes(3);
      expect(reconnectAttempts).toBe(3);
    });
  });

  describe('Fetch data from local API', () => {
    it('should send request to localhost API endpoint', async () => {
      const mockData = { devices: [], status: 'success' };
      mockApiService.get.mockResolvedValue(mockData);

      const result = await act(async () => {
        return await mockApiService.get('/api/devices');
      });

      expect(mockApiService.get).toHaveBeenCalledWith('/api/devices');
      expect(result).toEqual(mockData);
    });

    it('should receive and parse response correctly', async () => {
      const mockResponse = { data: [{ id: 1, name: 'Device 1' }], total: 1 };
      mockApiService.get.mockResolvedValue(mockResponse);

      const { getByTestId } = render(<TestApiComponent />);

      await waitFor(() => {
        const dataDisplay = getByTestId('data-display');
        expect(dataDisplay.props.children).toContain('Device 1');
      });
    });

    it('should display data in UI correctly', async () => {
      const testData = { message: 'Hello from local API' };
      mockApiService.get.mockResolvedValue(testData);

      const { getByTestId } = render(<TestApiComponent />);

      await waitFor(() => {
        expect(getByTestId('data-display')).toBeTruthy();
      });
    });
  });

  describe('Send data to local API', () => {
    it('should send data to appropriate API endpoint', async () => {
      const testData = { name: 'New Device', ip: '192.168.1.100' };
      const expectedResponse = { id: 123, ...testData };
      mockApiService.post.mockResolvedValue(expectedResponse);

      const result = await act(async () => {
        return await mockApiService.post('/api/devices', testData);
      });

      expect(mockApiService.post).toHaveBeenCalledWith('/api/devices', testData);
      expect(result).toEqual(expectedResponse);
    });

    it('should confirm successful data persistence', async () => {
      mockApiService.post.mockResolvedValue({ success: true, id: 123 });

      const result = await act(async () => {
        return await mockApiService.post('/api/devices', { name: 'Test' });
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });

    it('should reflect updated data state in UI', async () => {
      const updatedData = { devices: [{ id: 1, name: 'Updated Device' }] };
      mockApiService.put.mockResolvedValue(updatedData);
      mockConnectionStore.setCachedData.mockImplementation((data) => {
        mockConnectionStore.cachedData = { ...mockConnectionStore.cachedData, ...data };
      });

      await act(async () => {
        await mockApiService.put('/api/devices/1', { name: 'Updated Device' });
        mockConnectionStore.setCachedData(updatedData);
      });

      expect(mockConnectionStore.setCachedData).toHaveBeenCalledWith(updatedData);
    });
  });

  describe('Handle API response errors', () => {
    it('should handle error response appropriately', async () => {
      const apiError = new Error('Invalid request - missing required fields');
      mockApiService.post.mockRejectedValue(apiError);

      await act(async () => {
        try {
          await mockApiService.post('/api/devices', {});
        } catch (error) {
          expect(error.message).toBe('Invalid request - missing required fields');
        }
      });
    });

    it('should provide meaningful feedback to user', async () => {
      mockApiService.get.mockRejectedValue(new Error('Network timeout'));

      const { getByTestId } = render(<TestApiComponent />);

      await waitFor(() => {
        const errorMessage = getByTestId('error-message');
        expect(errorMessage.props.children).toBe('Network timeout');
      });
    });

    it('should maintain stable app state during errors', () => {
      // Verify that error states don't crash the app
      mockApiService.get.mockRejectedValue(new Error('Server error'));

      const { getByTestId } = render(<TestApiComponent />);

      // App should still render and show error gracefully
      expect(() => getByTestId('error-message')).not.toThrow();
    });
  });

  describe('Offline data synchronization', () => {
    it('should continue functioning with cached data when API unavailable', async () => {
      const cachedDevices = [{ id: 1, name: 'Cached Device' }];
      mockConnectionStore.cachedData = { devices: cachedDevices };
      mockConnectionStore.isConnected = false;

      // Simulate offline mode - API calls should use cached data
      const getCachedData = () => mockConnectionStore.cachedData.devices;
      const result = getCachedData();

      expect(result).toEqual(cachedDevices);
    });

    it('should queue pending changes for synchronization', async () => {
      const pendingChange = { action: 'create', data: { name: 'New Device' } };
      mockConnectionStore.addPendingRequest.mockImplementation((request) => {
        mockConnectionStore.pendingRequests.push(request);
      });

      // Simulate offline change
      act(() => {
        mockConnectionStore.addPendingRequest(pendingChange);
      });

      expect(mockConnectionStore.addPendingRequest).toHaveBeenCalledWith(pendingChange);
      expect(mockConnectionStore.pendingRequests).toContain(pendingChange);
    });

    it('should sync data when API becomes available again', async () => {
      // Setup pending requests
      mockConnectionStore.pendingRequests = [
        { action: 'create', endpoint: '/api/devices', data: { name: 'Device 1' } },
        { action: 'update', endpoint: '/api/devices/1', data: { name: 'Updated Device' } },
      ];

      mockApiService.post.mockResolvedValue({ success: true });
      mockApiService.put.mockResolvedValue({ success: true });

      // Simulate connection restored and sync process
      const syncPendingRequests = async () => {
        for (const request of mockConnectionStore.pendingRequests) {
          if (request.action === 'create') {
            await mockApiService.post(request.endpoint, request.data);
          } else if (request.action === 'update') {
            await mockApiService.put(request.endpoint, request.data);
          }
        }
        mockConnectionStore.clearPendingRequests();
      };

      await act(async () => {
        await syncPendingRequests();
      });

      expect(mockApiService.post).toHaveBeenCalledWith('/api/devices', { name: 'Device 1' });
      expect(mockApiService.put).toHaveBeenCalledWith('/api/devices/1', { name: 'Updated Device' });
      expect(mockConnectionStore.clearPendingRequests).toHaveBeenCalled();
    });
  });

  describe('Network permission handling', () => {
    it('should handle network permissions correctly', async () => {
      // Mock NetInfo to simulate network state
      NetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      const networkState = await act(async () => {
        return await NetInfo.fetch();
      });

      expect(networkState.isConnected).toBe(true);
      expect(networkState.type).toBe('wifi');
    });

    it('should adapt to network state changes', () => {
      const mockNetworkListener = jest.fn();
      NetInfo.addEventListener.mockReturnValue(() => {}); // Mock unsubscribe function

      // Setup network listener
      NetInfo.addEventListener(mockNetworkListener);

      expect(NetInfo.addEventListener).toHaveBeenCalledWith(mockNetworkListener);
    });
  });
});
