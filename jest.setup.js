/**
 * Jest Setup File
 * Configures global test environment and ensures fake timers are used properly
 */

// Mock React Native BEFORE any other imports to ensure it's available
jest.mock('react-native', () => ({
  StyleSheet: {
    create: (styles) => styles,
    flatten: (style) => style,
    compose: (style1, style2) => [style1, style2],
    hairlineWidth: 1,
    absoluteFillObject: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
  },
  Platform: {
    OS: 'ios',
    Version: 28,
    select: (obj) => obj.ios || obj.default,
    isTV: false,
    isTVOS: false,
    isAndroid: false,
    isIOS: true,
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  ScrollView: 'ScrollView',
  SafeAreaView: 'SafeAreaView',
  FlatList: 'FlatList',
  Alert: {
    alert: jest.fn(),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  ActivityIndicator: 'ActivityIndicator',
  Button: 'Button',
  Image: 'Image',
  Linking: {
    openURL: jest.fn(),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  NativeModules: {},
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  })),
  Animated: {
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      setOffset: jest.fn(),
      flattenOffset: jest.fn(),
      extractOffset: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      stopAnimation: jest.fn(),
      resetAnimation: jest.fn(),
      interpolate: jest.fn(),
      animate: jest.fn(),
    })),
    timing: jest.fn(() => ({ start: jest.fn() })),
    spring: jest.fn(() => ({ start: jest.fn() })),
    decay: jest.fn(() => ({ start: jest.fn() })),
    parallel: jest.fn(() => ({ start: jest.fn() })),
    sequence: jest.fn(() => ({ start: jest.fn() })),
    View: 'Animated.View',
    Text: 'Animated.Text',
    Image: 'Animated.Image',
    ScrollView: 'Animated.ScrollView',
    FlatList: 'Animated.FlatList',
  },
  PixelRatio: {
    get: () => 2,
    getFontScale: () => 1,
    getPixelSizeForLayoutSize: (size) => size * 2,
    roundToNearestPixel: (size) => Math.round(size * 2) / 2,
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  StatusBar: {
    setBarStyle: jest.fn(),
    setBackgroundColor: jest.fn(),
    setHidden: jest.fn(),
    setTranslucent: jest.fn(),
  },
  AsyncStorage: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    mergeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
    multiMerge: jest.fn(() => Promise.resolve()),
  },
}));

// Mock @react-navigation/elements to avoid StyleSheet issues
jest.mock('@react-navigation/elements', () => ({
  Header: 'Header',
  HeaderBackButton: 'HeaderBackButton',
  HeaderBackground: 'HeaderBackground',
  HeaderTitle: 'HeaderTitle',
  SafeAreaProviderCompat: ({ children }) => children,
  Screen: 'Screen',
}));

// Mock @react-navigation/bottom-tabs
jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    name: 'TestRoute',
    params: {},
  }),
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
}));

// Mock @react-navigation/native-stack
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// Make sure React Native StyleSheet and Platform are available globally for @testing-library/react-native
global.StyleSheet = {
  create: (styles) => styles,
  flatten: (style) => style,
  compose: (style1, style2) => [style1, style2],
  hairlineWidth: 1,
  absoluteFillObject: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
};

global.Platform = {
  OS: 'ios',
  Version: 28,
  select: (obj) => obj.ios || obj.default,
  isTV: false,
  isTVOS: false,
  isAndroid: false,
  isIOS: true,
};

// Use a simpler act implementation to avoid import issues
const act = global.act || (async (callback) => {
  await callback();
});

// Configure fake timers globally for deterministic tests
beforeEach(() => {
  // Use fake timers for deterministic tests
  jest.useFakeTimers();
});

afterEach(() => {
  // Clear all timers after each test
  jest.clearAllTimers();
  // Restore real timers
  jest.useRealTimers();
});

// Global helper function to run timers with act wrapper for React components
global.runTimersWithAct = async (time) => {
  await act(async () => {
    if (time) {
      jest.advanceTimersByTime(time);
    } else {
      jest.runAllTimers();
    }
  });
};

// Global helper to run only pending timers
global.runPendingTimers = async () => {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
};

// Global helper to advance time by specific amount
global.advanceTime = async (ms) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn((message, ...args) => {
    // Only show actual errors, not React warnings
    if (
      typeof message === 'string' &&
      !message.includes('Warning:') &&
      !message.includes('ReactDOM.render')
    ) {
      originalError(message, ...args);
    }
  });
  
  console.warn = jest.fn((message, ...args) => {
    // Filter out known warnings
    if (
      typeof message === 'string' &&
      !message.includes('componentWillReceiveProps') &&
      !message.includes('componentWillMount')
    ) {
      originalWarn(message, ...args);
    }
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
