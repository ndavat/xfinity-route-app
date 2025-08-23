// Mock React Native for Jest tests
const React = require('react');

// Mock components
const mockComponent = (name) => {
  return React.forwardRef((props, ref) => {
    return React.createElement('View', { ...props, ref, testID: props.testID || name });
  });
};

// Create the complete mock object
const RN = {
  // Mock StyleSheet
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
  
  // Mock Platform
  Platform: {
    OS: 'android',
    Version: 29,
    select: jest.fn((obj) => obj.android || obj.default),
    isTesting: true,
  },
  
  // Mock Dimensions
  Dimensions: {
    get: jest.fn(() => ({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    set: jest.fn(),
  },
  
  // Mock NativeModules
  NativeModules: {
    UIManager: {
      RCTView: () => ({}),
    },
    PlatformConstants: {
      forceTouchAvailable: false,
    },
    SettingsManager: {
      settings: {},
    },
    StatusBarManager: {
      HEIGHT: 20,
    },
  },
  
  // Mock components
  View: mockComponent('View'),
  Text: mockComponent('Text'),
  TextInput: mockComponent('TextInput'),
  TouchableOpacity: mockComponent('TouchableOpacity'),
  TouchableHighlight: mockComponent('TouchableHighlight'),
  TouchableWithoutFeedback: mockComponent('TouchableWithoutFeedback'),
  ScrollView: mockComponent('ScrollView'),
  FlatList: mockComponent('FlatList'),
  SectionList: mockComponent('SectionList'),
  Modal: mockComponent('Modal'),
  SafeAreaView: mockComponent('SafeAreaView'),
  ActivityIndicator: mockComponent('ActivityIndicator'),
  Switch: mockComponent('Switch'),
  Image: mockComponent('Image'),
  RefreshControl: mockComponent('RefreshControl'),
  StatusBar: mockComponent('StatusBar'),
  Button: mockComponent('Button'),
  
  // Mock Animated
  Animated: {
    View: mockComponent('Animated.View'),
    Text: mockComponent('Animated.Text'),
    Image: mockComponent('Animated.Image'),
    ScrollView: mockComponent('Animated.ScrollView'),
    FlatList: mockComponent('Animated.FlatList'),
    SectionList: mockComponent('Animated.SectionList'),
    createAnimatedComponent: (component) => component,
    Value: class {
      constructor(value) {
        this._value = value;
      }
      setValue(value) {
        this._value = value;
      }
      interpolate(config) {
        return this;
      }
      addListener() {
        return 1;
      }
      removeListener() {}
      removeAllListeners() {}
    },
    timing: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    spring: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    parallel: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    delay: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    event: jest.fn(),
  },
  
  // Mock Alert
  Alert: {
    alert: jest.fn(),
  },
  
  // Mock Keyboard
  Keyboard: {
    dismiss: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
  
  // Mock PixelRatio
  PixelRatio: {
    get: () => 2,
    getFontScale: () => 1,
    getPixelSizeForLayoutSize: (size) => size * 2,
    roundToNearestPixel: (size) => Math.round(size * 2) / 2,
  },
  
  // Mock AppState
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  
  // Mock Linking
  Linking: {
    openURL: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    getInitialURL: jest.fn(() => Promise.resolve(null)),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  
  // Mock PermissionsAndroid
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
  
  // Mock BackHandler
  BackHandler: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    exitApp: jest.fn(),
  },
  
  // Mock ToastAndroid
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
};

module.exports = RN;
