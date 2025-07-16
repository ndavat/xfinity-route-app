import * as Sentry from '@sentry/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View, Platform } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Toaster } from 'sonner-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MockModeProvider } from './contexts/MockModeContext';
import { useEffect, useState } from 'react';
import { startMonitoring, stopMonitoring } from './services/debug/NetworkMonitor';
import { initializeDevelopmentLogger, initializeProductionLogger, Logger } from './services';
import HomeScreen from "./screens/HomeScreen"
import DevicesScreen from "./screens/DevicesScreen"
import DeviceSelectionScreen from "./screens/DeviceSelectionScreen"
import DeviceControlScreen from "./screens/DeviceControlScreen"
import DeviceTrafficScreen from "./screens/DeviceTrafficScreen"
import SettingsScreen from "./screens/SettingsScreen"
import WifiConfigurationScreen from "./screens/wifi/WifiConfigurationScreen"
import NetworkConfigurationScreen from "./screens/network/NetworkConfigurationScreen"
import PortForwardingScreen from "./screens/firewall/PortForwardingScreen"
import DiagnosticsScreen from "./screens/diagnostics/DiagnosticsScreen"
import SentryDebugScreen from './screens/debug/SentryDebugScreen';

const Stack = createNativeStackNavigator();

Sentry.init({
  dsn: 'https://73d8add737d936e5e6e9cb306ffbe4ac@o4509680403480576.ingest.us.sentry.io/4509680410361856',
  debug: __DEV__,
  environment: __DEV__ ? 'development' : 'production',
  integrations: [
    Sentry.reactNavigationIntegration(),
  ],
  tracesSampleRate: 1.0,
});

function RootStack() {
  return (
    <Stack.Navigator screenOptions={{
      headerShown: false
    }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Devices" component={DevicesScreen} />
      <Stack.Screen name="DeviceSelection" component={DeviceSelectionScreen} />
      <Stack.Screen name="DeviceControl" component={DeviceControlScreen} />
      <Stack.Screen name="DeviceTraffic" component={DeviceTrafficScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="WifiConfiguration" component={WifiConfigurationScreen} />
      <Stack.Screen name="NetworkConfiguration" component={NetworkConfigurationScreen} />
      <Stack.Screen name="PortForwarding" component={PortForwardingScreen} />
      <Stack.Screen name="Diagnostics" component={DiagnosticsScreen} />
      <Stack.Screen name="SentryDebug" component={SentryDebugScreen} />
    </Stack.Navigator>
  );
}

const App: React.FC = () => {
  const [loggerReady, setLoggerReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize logger based on environment
        const logger = __DEV__ 
          ? await initializeDevelopmentLogger()
          : await initializeProductionLogger();

        // Log app startup
        logger.info('Xfinity Router App started', {
          platform: Platform.OS,
          version: Platform.Version,
          isDevelopment: __DEV__,
          timestamp: new Date().toISOString()
        });

        setLoggerReady(true);

        // Start network monitoring when app starts
        startMonitoring();

        // Log network monitoring start
        logger.debug('Network monitoring started');

      } catch (error) {
        console.error('Failed to initialize app:', error);
        // Still allow app to start even if logger fails
        setLoggerReady(true);
        startMonitoring();
      }
    };

    initializeApp();

    // Cleanup function
    return () => {
      const cleanup = async () => {
        try {
          const logger = Logger.getInstance();
          if (logger.isReady()) {
            logger.info('App shutting down');
            await logger.shutdown();
          }
        } catch (error) {
          console.error('Error during app cleanup:', error);
        }
        
        stopMonitoring();
      };

      cleanup();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <MockModeProvider>
          <View style={styles.container}>
            <Toaster />
            <NavigationContainer>
              <RootStack />
            </NavigationContainer>
          </View>
        </MockModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    userSelect: "none"
  }
});