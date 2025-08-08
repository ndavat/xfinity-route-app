import '@testing-library/jest-native/extend-expect';

// Global test setup
global.__DEV__ = true;

// Mock React Native modules
jest.mock('react-native', () => {
  return {
    Platform: {
      OS: 'android',
      select: jest.fn(({ android }) => android),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 390, height: 844 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    Alert: {
      alert: jest.fn(),
    },
    Vibration: {
      vibrate: jest.fn(),
    },
    StyleSheet: {
      create: jest.fn(styles => styles),
    },
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    TouchableOpacity: 'TouchableOpacity',
    Image: 'Image',
    SafeAreaView: 'SafeAreaView',
  };
});

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    executionEnvironment: 'standalone',
    manifest: {
      extra: {
        supabaseUrl: 'https://mock-supabase-url.supabase.co',
        supabaseAnonKey: 'mock-anon-key',
      },
    },
  },
}));

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    then: jest.fn((callback) => callback({ data: [], error: null })),
  })),
  auth: {
    signIn: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  },
  realtime: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    })),
  },
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock NetInfo - Use enhanced security mocks
jest.mock('@react-native-community/netinfo', () => {
  const NetInfoMock = require('../../__mocks__/@react-native-community/netinfo');
  return {
    default: NetInfoMock.default,
    fetch: NetInfoMock.fetch,
    addEventListener: NetInfoMock.addEventListener,
    configure: NetInfoMock.configure,
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
      key: 'test-route',
      name: 'Test',
    }),
    useFocusEffect: jest.fn(),
  };
});

// Mock Zustand stores
const createMockStore = (initialState = {}) => {
  let state = initialState;
  const listeners = new Set();
  
  const mockStore = {
    getState: () => state,
    setState: (newState) => {
      if (typeof newState === 'function') {
        state = { ...state, ...newState(state) };
      } else {
        state = { ...state, ...newState };
      }
      listeners.forEach(listener => listener(state));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy: () => listeners.clear(),
  };
  
  return mockStore;
};

// Mock app store
const mockAppStore = createMockStore({
  isConnected: false,
  devices: [],
  currentDevice: null,
  loading: false,
  error: null,
  setConnected: jest.fn(),
  setDevices: jest.fn(),
  setCurrentDevice: jest.fn(),
  setLoading: jest.fn(),
  setError: jest.fn(),
  addDevice: jest.fn(),
  updateDevice: jest.fn(),
  removeDevice: jest.fn(),
});

// Mock connection store
const mockConnectionStore = createMockStore({
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
});

// Export mocks for use in tests
export {
  mockSupabaseClient,
  mockAppStore,
  mockConnectionStore,
  createMockStore,
};

// Global test utilities
global.mockSupabaseClient = mockSupabaseClient;
global.mockAppStore = mockAppStore;
global.mockConnectionStore = mockConnectionStore;

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (
      args[0].includes('Warning: ReactDOM.render is no longer supported') ||
      args[0].includes('Warning: React.createFactory() is deprecated') ||
      args[0].includes('componentWillReceiveProps has been renamed')
    )
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

// Setup fake timers
jest.useFakeTimers();
