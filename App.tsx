import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Toaster } from 'sonner-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import HomeScreen from "./screens/HomeScreen"
import DevicesScreen from "./screens/DevicesScreen"
import DeviceControlScreen from "./screens/DeviceControlScreen"
import SettingsScreen from "./screens/SettingsScreen"

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
    </Stack.Navigator>
  );
}

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, height: '100%', width: '100%' }}>
        <Toaster />
        <NavigationContainer>
          <RootStack />
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    userSelect: "none"
  }
});