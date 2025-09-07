import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Toaster } from 'sonner-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LogManager } from './services/LogManager';
import HomeScreen from "./screens/HomeScreen"
import DevicesScreen from "./screens/DevicesScreen"
import DeviceControlScreen from "./screens/DeviceControlScreen"
import SettingsScreen from "./screens/SettingsScreen"
import LogViewerScreen from "./screens/LogViewerScreen"

const Stack = createNativeStackNavigator();

function RootStack() {
  return (
    <Stack.Navigator screenOptions={{
      headerShown: false
    }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Devices" component={DevicesScreen} />
      <Stack.Screen name="DeviceControl" component={DeviceControlScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="LogViewer" component={LogViewerScreen} />
    </Stack.Navigator>
  );
}

const App: React.FC = () => {
  // Initialize LogManager on app start
  React.useEffect(() => {
    LogManager.initialize();
    LogManager.log('info', 'Application started', { timestamp: new Date().toISOString() });
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <View style={styles.container}>
          <Toaster />
          <NavigationContainer>
            <RootStack />
          </NavigationContainer>
        </View>
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