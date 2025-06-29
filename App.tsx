import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Toaster } from 'sonner-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MockModeProvider } from './contexts/MockModeContext';
import HomeScreen from "./screens/HomeScreen"
import DevicesScreen from "./screens/DevicesScreen"
import DeviceSelectionScreen from "./screens/DeviceSelectionScreen"
import DeviceControlScreen from "./screens/DeviceControlScreen"
import DeviceTrafficScreen from "./screens/DeviceTrafficScreen"
import SettingsScreen from "./screens/SettingsScreen"

const Stack = createNativeStackNavigator();

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
    </Stack.Navigator>
  );
}

const App: React.FC = () => {
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