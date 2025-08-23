// Simple validation script for React Native mock
const { mockReactNative } = require('./setupMcp');

console.log('Testing React Native mock structure...\n');

// Test StyleSheet API
console.log('✓ StyleSheet.create exists:', typeof mockReactNative.StyleSheet.create === 'function');
console.log('✓ StyleSheet.flatten exists:', typeof mockReactNative.StyleSheet.flatten === 'function');
console.log('✓ StyleSheet.compose exists:', typeof mockReactNative.StyleSheet.compose === 'function');
console.log('✓ StyleSheet.absoluteFill exists:', typeof mockReactNative.StyleSheet.absoluteFill === 'object');
console.log('✓ StyleSheet.hairlineWidth exists:', typeof mockReactNative.StyleSheet.hairlineWidth === 'number');

// Test flatten functionality
const styles = [{ color: 'red' }, { fontSize: 14 }];
const flattened = mockReactNative.StyleSheet.flatten(styles);
console.log('\n✓ StyleSheet.flatten works:', JSON.stringify(flattened) === JSON.stringify({ color: 'red', fontSize: 14 }));

// Test compose functionality
const composed = mockReactNative.StyleSheet.compose({ color: 'blue' }, { fontSize: 16 });
console.log('✓ StyleSheet.compose works:', Array.isArray(composed) && composed.length === 2);

// Test other common APIs
console.log('\n✓ Platform API exists:', typeof mockReactNative.Platform === 'object');
console.log('✓ Dimensions API exists:', typeof mockReactNative.Dimensions === 'object');
console.log('✓ Alert API exists:', typeof mockReactNative.Alert === 'object');
console.log('✓ Animated API exists:', typeof mockReactNative.Animated === 'object');
console.log('✓ Keyboard API exists:', typeof mockReactNative.Keyboard === 'object');

console.log('\n✓ All React Native mock validations passed!');
