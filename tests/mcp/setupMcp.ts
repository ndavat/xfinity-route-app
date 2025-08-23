import '@testing-library/jest-native/extend-expect';

// Global test setup
global.__DEV__ = true;

// Create a single React Native mock object to avoid multiple mocks
const mockReactNative = {
  Platform: {
    OS: 'android',
    select: jest.fn(({ android }) => android),
    Version: 21,
    isPad: false,
    isTV: false,
    isTesting: true,
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 390, height: 844 })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    set: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
    prompt: jest.fn(),
  },
  Vibration: {
    vibrate: jest.fn(),
    cancel: jest.fn(),
  },
  StyleSheet: {
    create: jest.fn(styles => styles),
    flatten: jest.fn((style) => {
      // Handle arrays of styles
      if (Array.isArray(style)) {
        return style.reduce((acc, s) => ({ ...acc, ...s }), {});
      }
      return style || {};
    }),
    compose: jest.fn((style1, style2) => {
      // Compose two styles into an array
      if (!style1 && !style2) return null;
      if (!style1) return style2;
      if (!style2) return style1;
      return [style1, style2];
    }),
    absoluteFill: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    absoluteFillObject: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    hairlineWidth: 1,
    setStyleAttributePreprocessor: jest.fn(),
  },
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  TouchableHighlight: 'TouchableHighlight',
  TouchableWithoutFeedback: 'TouchableWithoutFeedback',
  TouchableNativeFeedback: {
    SelectableBackground: jest.fn(),
    SelectableBackgroundBorderless: jest.fn(),
    Ripple: jest.fn(),
  },
  Image: 'Image',
  SafeAreaView: 'SafeAreaView',
  FlatList: 'FlatList',
  SectionList: 'SectionList',
  VirtualizedList: 'VirtualizedList',
  Switch: 'Switch',
  RefreshControl: 'RefreshControl',
  StatusBar: {
    setBarStyle: jest.fn(),
    setBackgroundColor: jest.fn(),
    setHidden: jest.fn(),
    setTranslucent: jest.fn(),
    currentHeight: 24,
  },
  ActivityIndicator: 'ActivityIndicator',
  Modal: 'Modal',
  TextInput: 'TextInput',
  Keyboard: {
    dismiss: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Animated: {
    View: 'Animated.View',
    Text: 'Animated.Text',
    Image: 'Animated.Image',
    ScrollView: 'Animated.ScrollView',
    FlatList: 'Animated.FlatList',
    SectionList: 'Animated.SectionList',
    Value: jest.fn(() => ({ setValue: jest.fn() })),
    timing: jest.fn(() => ({ start: jest.fn() })),
    spring: jest.fn(() => ({ start: jest.fn() })),
    decay: jest.fn(() => ({ start: jest.fn() })),
    parallel: jest.fn(() => ({ start: jest.fn() })),
    sequence: jest.fn(() => ({ start: jest.fn() })),
    loop: jest.fn(() => ({ start: jest.fn() })),
    event: jest.fn(),
    createAnimatedComponent: jest.fn(component => component),
  },
  Easing: {
    linear: jest.fn(),
    ease: jest.fn(),
    quad: jest.fn(),
    cubic: jest.fn(),
    poly: jest.fn(),
    sin: jest.fn(),
    circle: jest.fn(),
    exp: jest.fn(),
    elastic: jest.fn(),
    back: jest.fn(),
    bounce: jest.fn(),
    bezier: jest.fn(),
    in: jest.fn(),
    out: jest.fn(),
    inOut: jest.fn(),
  },
  InteractionManager: {
    runAfterInteractions: jest.fn(callback => {
      callback();
      return { cancel: jest.fn() };
    }),
    createInteractionHandle: jest.fn(),
    clearInteractionHandle: jest.fn(),
    setDeadline: jest.fn(),
  },
  LayoutAnimation: {
    configureNext: jest.fn(),
    create: jest.fn(),
    Types: {},
    Properties: {},
    Presets: {
      easeInEaseOut: {},
      linear: {},
      spring: {},
    },
  },
  PanResponder: {
    create: jest.fn(() => ({
      panHandlers: {},
    })),
  },
  PixelRatio: {
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 1),
    getPixelSizeForLayoutSize: jest.fn(size => size * 2),
    roundToNearestPixel: jest.fn(size => Math.round(size)),
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    getInitialURL: jest.fn(() => Promise.resolve(null)),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  NativeModules: {},
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
  DeviceEventEmitter: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    emit: jest.fn(),
  },
  BackHandler: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    exitApp: jest.fn(),
  },
  PermissionsAndroid: {
    request: jest.fn(() => Promise.resolve('granted')),
    requestMultiple: jest.fn(() => Promise.resolve({})),
    check: jest.fn(() => Promise.resolve(true)),
    PERMISSIONS: {},
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
  },
  ToastAndroid: {
    show: jest.fn(),
    showWithGravity: jest.fn(),
    showWithGravityAndOffset: jest.fn(),
    SHORT: 0,
    LONG: 1,
    TOP: 0,
    BOTTOM: 1,
    CENTER: 2,
  },
  Share: {
    share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
  },
  Clipboard: {
    setString: jest.fn(),
    getString: jest.fn(() => Promise.resolve('')),
  },
};

// Export the mock for reuse in other test files
export { mockReactNative };

// Mock React Native modules
jest.mock('react-native', () => mockReactNative);

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
const originalError = console.error;

// Stub console.warn for specific messages
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (
      args[0].includes('Warning: ReactDOM.render is no longer supported') ||
      args[0].includes('Warning: React.createFactory() is deprecated') ||
      args[0].includes('componentWillReceiveProps has been renamed') ||
      args[0].includes('react-test-renderer')
    )
  ) {
    return; // no-op for these warnings
  }
  originalWarn.apply(console, args);
};

// Stub console.error for react-test-renderer messages
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('react-test-renderer')
  ) {
    return; // no-op for react-test-renderer errors
  }
  originalError.apply(console, args);
};

// Setup fake timers
jest.useFakeTimers();
