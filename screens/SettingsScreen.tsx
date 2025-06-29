import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { RouterConnectionService } from '../services/RouterConnectionService';
import { Config, ConfigUtils } from '../utils/config';
import { toast } from 'sonner-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMockMode } from '../contexts/MockModeContext';
import { RestartRouterButton } from '../components/RestartRouterButton';
import { ServiceFactory } from '../services/ServiceInterfaces';
import { CustomToggle } from '../components/CustomToggle';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { isMockMode, toggleMockMode, isLoading: mockModeLoading } = useMockMode();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Router configuration (HTTP only)
  const [routerIp, setRouterIp] = useState(Config.router.defaultIp);
  const [username, setUsername] = useState(Config.router.defaultUsername);
  const [password, setPassword] = useState(Config.router.defaultPassword);
  
  // App settings
  const [useDebugMode, setUseDebugMode] = useState(Config.app.debugMode);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(Config.development.enableAdvancedSettings);

  // Create router service based on current mode
  const routerService = ServiceFactory.createRouterService(isMockMode);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Load router configuration
      const routerConfig = await RouterConnectionService.getRouterConfig();
      const defaultConfig = ConfigUtils.getDefaultRouterConfig();
      setRouterIp(routerConfig.ip || defaultConfig.ip);
      setUsername(routerConfig.username || defaultConfig.username);
      setPassword(routerConfig.password || '');
      
      // Load app settings
      const debugMode = await AsyncStorage.getItem('debug_mode');
      setUseDebugMode(debugMode === 'true');
      
      const advancedMode = await AsyncStorage.getItem('show_advanced');
      setShowAdvancedOptions(advancedMode === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Validate IP address format
      const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      if (!ipRegex.test(routerIp)) {
        toast.error('Please enter a valid IP address');
        return;
      }

      // Validate each octet is 0-255
      const octets = routerIp.split('.').map(Number);
      if (octets.some(octet => octet < 0 || octet > 255)) {
        toast.error('IP address octets must be between 0 and 255');
        return;
      }

      await RouterConnectionService.saveRouterConfig({
        ip: routerIp,
        username: username,
        password: password,
      });

      await AsyncStorage.setItem('debug_mode', useDebugMode.toString());
      await AsyncStorage.setItem('show_advanced', showAdvancedOptions.toString());
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const isConnected = await routerService.checkConnection();
      if (isConnected) {
        const info = await routerService.getRouterInfo();
        Alert.alert(
          'Connection Successful!',
          `Connected to router successfully!\n\nStatus: ${info.status}\nConnected Devices: ${info.connectedDevices}\nModel: ${info.model || 'Unknown'}`,
          [{ text: 'OK' }]
        );
        toast.success('Router connection successful');
      } else {
        Alert.alert(
          'Connection Failed',
          'Unable to connect to the router. Please check your settings and network connection.',
          [{ text: 'OK' }]
        );
        toast.error('Router connection failed');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      Alert.alert(
        'Connection Error',
        'An error occurred while testing the connection. Please check your settings.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0261C2" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* App Settings Card - Mock Mode Toggle */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App Settings</Text>
          
          <CustomToggle
            value={isMockMode}
            onValueChange={toggleMockMode}
            disabled={mockModeLoading}
            label="Mock Mode"
            description={isMockMode ? 'Using simulated router data' : 'Using real router connection'}
          />

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={20} color="#0261C2" />
            <Text style={styles.infoText}>
              Toggling Mock Mode will reload the app to apply changes. Mock mode uses test data instead of connecting to your real router.
            </Text>
          </View>
          {/* Test Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.testButton]}
            onPress={() => {
              console.log('Test button pressed - Current mode:', isMockMode);
              Alert.alert('Mock Mode Test', `Current mode: ${isMockMode ? 'Mock' : 'Live'}`);
            }}
          >
            <MaterialIcons name="bug-report" size={18} color="white" />
            <Text style={styles.actionButtonText}>Test Mock Mode Status</Text>
          </TouchableOpacity>
          <CustomToggle
            value={useDebugMode}
            onValueChange={async (value: boolean = false) => {
              setUseDebugMode(value);
              await AsyncStorage.setItem('debug_mode', value.toString());
              toast.success(`Debug mode ${value ? 'enabled' : 'disabled'}`);
            }}
            label="Debug Mode"
            description="Show additional debug information and logs"
          />
        </View>

        {/* Router Configuration Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Router Configuration (HTTP Only)</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Router IP Address</Text>
            <TextInput
              style={styles.input}
              placeholder={Config.router.defaultIp}
              value={routerIp}
              onChangeText={setRouterIp}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder={Config.router.defaultUsername}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>
          
          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.testButton, 
              isTesting && styles.disabledButton
            ]}
            onPress={testConnection}
            disabled={isTesting}
          >
            {isTesting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialIcons name="wifi" size={18} color="white" />
                <Text style={styles.actionButtonText}>Test Connection</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.saveButton, 
              isSaving && styles.disabledButton
            ]}
            onPress={saveSettings}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialIcons name="save" size={18} color="white" />
                <Text style={styles.actionButtonText}>Save Settings</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Router Actions Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Router Actions</Text>
          
          <RestartRouterButton 
            routerService={routerService}
            style={styles.actionButton}
          />
        </View>

        <View style={styles.appInfoCard}>
          <Text style={styles.appName}>{Config.app.name}</Text>
          <Text style={styles.appVersion}>Version {Config.app.version} - {isMockMode ? 'Mock Mode' : 'Live Mode'}</Text>
          <Text style={styles.appCopyright}>© 2025 All rights reserved</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0261C2',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  backButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#0261C2',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#444',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#0261C2',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0261C2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  testButton: {
    backgroundColor: '#4CAF50',
  },
  saveButton: {
    backgroundColor: '#0261C2',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  appInfoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0261C2',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  appCopyright: {
    fontSize: 12,
    color: '#999',
  },
});
