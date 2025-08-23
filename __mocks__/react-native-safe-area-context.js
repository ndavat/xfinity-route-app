const React = require('react');

const insets = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
};

const frame = {
  x: 0,
  y: 0,
  width: 375,
  height: 812,
};

const SafeAreaProvider = ({ children }) => children;

const SafeAreaView = React.forwardRef((props, ref) => {
  return React.createElement('View', { ...props, ref, testID: props.testID || 'SafeAreaView' });
});

const useSafeAreaInsets = () => insets;
const useSafeAreaFrame = () => frame;

const SafeAreaInsetsContext = React.createContext(insets);
const SafeAreaFrameContext = React.createContext(frame);

const withSafeAreaInsets = (Component) => {
  return React.forwardRef((props, ref) => {
    return React.createElement(Component, { ...props, ref, insets });
  });
};

const SafeAreaConsumer = ({ children }) => {
  return children(insets);
};

const initialWindowMetrics = {
  insets,
  frame,
};

module.exports = {
  SafeAreaProvider,
  SafeAreaView,
  SafeAreaInsetsContext,
  SafeAreaFrameContext,
  useSafeAreaInsets,
  useSafeAreaFrame,
  withSafeAreaInsets,
  SafeAreaConsumer,
  initialWindowMetrics,
};
