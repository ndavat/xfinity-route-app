# React Native Mock Polyfills

## Overview
The `setupMcp.ts` file has been extended to include comprehensive React Native API mocks to ensure test compatibility and avoid multiple mock definitions.

## Key Changes

### 1. Single Mock Object Export
- Created a single `mockReactNative` object that is exported and reused
- This prevents multiple mock definitions and ensures consistency across tests
- The mock object is defined once and passed to `jest.mock('react-native')`

### 2. StyleSheet API Extensions
Added missing StyleSheet utilities:
- **`StyleSheet.flatten(style)`**: Flattens an array of style objects into a single object
- **`StyleSheet.compose(style1, style2)`**: Composes two styles into an array
- **`StyleSheet.absoluteFill`**: Pre-defined style for absolute positioning
- **`StyleSheet.absoluteFillObject`**: Same as absoluteFill as an object
- **`StyleSheet.hairlineWidth`**: The width of a thin line on the platform (1px)
- **`StyleSheet.setStyleAttributePreprocessor`**: Mock function for preprocessing

### 3. Additional React Native APIs
Extended mock to include commonly used React Native APIs:
- **Platform**: Enhanced with Version, isPad, isTV, isTesting properties
- **Dimensions**: Added set() method
- **Alert**: Added prompt() method
- **Vibration**: Added cancel() method
- **Animated**: Complete animation API with all animation types
- **Keyboard**: Complete keyboard API with event listeners
- **TouchableNativeFeedback**: Android-specific touchable with ripple effects
- **StatusBar**: Status bar control methods
- **InteractionManager**: For managing interactions and animations
- **LayoutAnimation**: Animation configuration utilities
- **PanResponder**: Gesture handling utilities
- **PixelRatio**: Device pixel density utilities
- **AppState**: App state management
- **Linking**: Deep linking utilities
- **NativeModules**: Placeholder for native modules
- **DeviceEventEmitter**: Event emitter for device events
- **BackHandler**: Android back button handling
- **PermissionsAndroid**: Android permissions API
- **ToastAndroid**: Android toast notifications
- **Share**: Share content API
- **Clipboard**: Clipboard access API

## Usage

### In Test Files
```typescript
import { mockReactNative } from '../mcp/setupMcp';

// Use the mock directly if needed
const styles = mockReactNative.StyleSheet.flatten([
  { color: 'red' },
  { fontSize: 14 }
]);
```

### Jest Configuration
The mock is automatically applied when tests run because `setupMcp.ts` is included in the Jest setup files.

## Benefits
1. **Consistency**: Single source of truth for React Native mocks
2. **Completeness**: All commonly used React Native APIs are mocked
3. **Maintainability**: Easy to update and extend the mock in one place
4. **Test Reliability**: Prevents "undefined is not a function" errors for React Native APIs
5. **Performance**: Avoids multiple mock definitions that could slow down tests

## Testing the Mock
To validate the mock structure, you can:
1. Run your existing tests that use React Native components
2. Check that StyleSheet operations work correctly in tests
3. Verify that no "undefined" errors occur for React Native APIs

## Future Considerations
- Add more specific mock implementations as needed
- Consider extracting the mock to a separate file if it grows too large
- Add TypeScript type definitions for better IDE support
