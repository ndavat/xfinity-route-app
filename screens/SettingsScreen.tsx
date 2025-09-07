import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { RouterConnectionService } from '../services/RouterConnectionService';
import { Config, ConfigUtils } from '../utils/config';
import { LogManager } from '../services/LogManager';
import LogAlert from '../components/LogAlert';
import { LogTestHelper } from '../utils/logTestHelper';
import { toast } from 'sonner-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const navigation = useNavigation();
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
  const [useMockData, setUseMockData] = useState(Config.app.mockDataMode);
  const [showLogAlert, setShowLogAlert] = useState(false);

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
      
      const showAdvanced = await AsyncStorage.getItem('show_advanced');
      setShowAdvancedOptions(showAdvanced === 'true');
      
      const useMock = await AsyncStorage.getItem('use_mock_data');
      setUseMockData(useMock === 'true');
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
        toast.error('Invalid IP address format');
        return;
      }
      
      // Save router configuration (HTTP only)
      const routerConfig = {
        ip: routerIp,
        username,
        password,
      };
      
      await RouterConnectionService.saveRouterConfig(routerConfig);
      
      // Save app settings
      await AsyncStorage.setItem('debug_mode', useDebugMode.toString());
      await AsyncStorage.setItem('show_advanced', showAdvancedOptions.toString());
      await AsyncStorage.setItem('use_mock_data', useMockData.toString());
      
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
      // First save the current settings
      const routerConfig = {
        ip: routerIp,
        username,
        password,
      };
      
      await RouterConnectionService.saveRouterConfig(routerConfig);
      
      // Now test the connection
      const isConnected = await RouterConnectionService.checkConnection();
      if (isConnected) {
        const isAuthenticated = await RouterConnectionService.authenticate();
        if (isAuthenticated) {
          toast.success('Successfully connected and authenticated!');
        } else {
          toast.error('Connected to router but authentication failed');
        }
      } else {
        toast.error('Failed to connect to router');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      toast.error('Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const runDiagnostics = async () => {
    setIsTesting(true);
    try {
      // First save the current settings
      const routerConfig = {
        ip: routerIp,
        username,
        password,
      };
      
      await RouterConnectionService.saveRouterConfig(routerConfig);
      
      // Run network diagnostics
      const results = await RouterConnectionService.runDiagnostics();
      
      // Show detailed results
      const message = results.tests.map(test => 
        `${test.name}: ${test.status}${test.details ? '\n  ' + test.details : ''}`
      ).join('\n\n');
      
      Alert.alert(
        'Network Diagnostics Results',
        `Testing: ${results.baseUrl}\n\n${message}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Diagnostics error:', error);
      toast.error('Diagnostics failed');
    } finally {
      setIsTesting(false);
    }
  };

  const forceRealConnection = async () => {
    setIsTesting(true);
    try {
      // Check environment first
      const advice = RouterConnectionService.getConnectionAdvice();
      if (!advice.canConnectToRouter) {
        Alert.alert(
          'Environment Issue',
          `${advice.reason}\n\nSolutions:\n${advice.solutions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Disable mock mode
      await RouterConnectionService.disableMockMode();
      
      // Clear any existing mock data flag
      await AsyncStorage.setItem('use_mock_data', 'false');
      setUseMockData(false);
      
      // Try to connect to real router
      const isConnected = await RouterConnectionService.checkConnection();
      if (isConnected) {
        toast.success('Connected to real router!');
      } else {
        toast.error('Cannot connect to real router - check network and IP address');
      }
    } catch (error) {
      console.error('Real connection error:', error);
      toast.error('Real connection failed');
    } finally {
      setIsTesting(false);
    }
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const defaultConfig = ConfigUtils.getDefaultRouterConfig();
              await RouterConnectionService.saveRouterConfig({
                ip: defaultConfig.ip,
                username: defaultConfig.username,
                password: '',
              });
              
              await AsyncStorage.removeItem('debug_mode');
              await AsyncStorage.removeItem('show_advanced');
              await AsyncStorage.removeItem('use_mock_data');
              
              // Reset state
              setRouterIp(defaultConfig.ip);
              setUsername(defaultConfig.username);
              setPassword('');
              setUseDebugMode(false);
              setShowAdvancedOptions(false);
              setUseMockData(false);
              
              toast.success('Settings reset to defaults');
            } catch (error) {
              console.error('Error resetting settings:', error);
              toast.error('Failed to reset settings');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const clearData = () => {
    Alert.alert(
      'Clear Stored Data',
      'Are you sure you want to clear all stored device names and settings? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await AsyncStorage.clear();
              toast.success('All data cleared successfully');
              
              // Reload settings after clearing
              loadSettings();
            } catch (error) {
              console.error('Error clearing data:', error);
              toast.error('Failed to clear data');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
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
          
          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={20} color="#0261C2" />
            <Text style={styles.infoText}>
              This app uses HTTP only for better compatibility and to avoid browser security restrictions.
            </Text>
          </View>

          {/* Environment-specific connection info */}
          <View style={styles.infoBox}>
            <MaterialIcons 
              name={RouterConnectionService.isHttpsToHttpBlocked() ? "warning" : "check-circle"} 
              size={20} 
              color={RouterConnectionService.isHttpsToHttpBlocked() ? "#ff9800" : "#4caf50"} 
            />
            <Text style={styles.infoText}>
              {RouterConnectionService.isHttpsToHttpBlocked() 
                ? "Browser environment blocks HTTP requests. Use mobile app for real router connection."
                : "Environment supports router connections."
              }
            </Text>
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
              styles.diagnosticsButton, 
              isTesting && styles.disabledButton
            ]}
            onPress={runDiagnostics}
            disabled={isTesting}
          >
            {isTesting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialIcons name="bug-report" size={18} color="white" />
                <Text style={styles.actionButtonText}>Run Diagnostics</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.forceConnectionButton, 
              isTesting && styles.disabledButton
            ]}
            onPress={forceRealConnection}
            disabled={isTesting}
          >
            {isTesting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialIcons name="router" size={18} color="white" />
                <Text style={styles.actionButtonText}>Force Real Router</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>App Settings</Text>
          
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Debug Mode</Text>
            <Switch
              value={useDebugMode}
              onValueChange={setUseDebugMode}
            />
          </View>
          
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Show Advanced Options</Text>
            <Switch
              value={showAdvancedOptions}
              onValueChange={setShowAdvancedOptions}
            />
          </View>
          
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Use Mock Data (Demo Mode)</Text>
            <Switch
              value={useMockData}
              onValueChange={setUseMockData}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Log Settings</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowLogAlert(true)}
          >
            <MaterialIcons name="list-alt" size={18} color="#4CAF50" />
            <Text style={[styles.actionButtonText, { color: '#4CAF50' }]}>View Logs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('LogViewer' as never)}
          >
            <MaterialIcons name="bug-report" size={18} color="#2196F3" />
            <Text style={[styles.actionButtonText, { color: '#2196F3' }]}>Open Log Viewer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              LogTestHelper.generateTestLogs();
              toast.success('Test logs generated');
            }}
          >
            <MaterialIcons name="add" size={18} color="#FF9800" />
            <Text style={[styles.actionButtonText, { color: '#FF9800' }]}>Generate Test Logs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              LogTestHelper.testLogAlerts();
              toast.success('Log alerts tested');
            }}
          >
            <MaterialIcons name="notifications" size={18} color="#9C27B0" />
            <Text style={[styles.actionButtonText, { color: '#9C27B0' }]}>Test Log Alerts</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
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
          
          <TouchableOpacity
            style={[styles.actionButton, styles.resetButton]}
            onPress={resetSettings}
          >
            <MaterialIcons name="refresh" size={18} color="white" />
            <Text style={styles.actionButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={clearData}
          >
            <MaterialIcons name="delete" size={18} color="white" />
            <Text style={styles.actionButtonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.appInfoCard}>
          <Text style={styles.appName}>{Config.app.name}</Text>
          <Text style={styles.appVersion}>Version {Config.app.version} - HTTP Mode</Text>
          <Text style={styles.appCopyright}>© 2025 All rights reserved</Text>
        </View>
      </ScrollView>

      {/* Log Alert Modal */}
      <LogAlert
        visible={showLogAlert}
        onClose={() => setShowLogAlert(false)}
        title="Application Logs"
      />
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#0261C2',
  },
  resetButton: {
    backgroundColor: '#FF9800',
  },
  testButton: {
    backgroundColor: '#4CAF50',
    marginTop: 8,
  },
  diagnosticsButton: {
    backgroundColor: '#9C27B0',
    marginTop: 8,
  },
  forceConnectionButton: {
    backgroundColor: '#2196F3',
    marginTop: 8,
  },
  dangerButton: {
    backgroundColor: '#D32F2F',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  appInfoCard: {
    backgroundColor: 'transparent',
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0261C2',
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  appCopyright: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
