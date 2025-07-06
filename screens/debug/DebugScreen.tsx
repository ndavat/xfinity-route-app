import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  runDebugSession, 
  getSystemHealth, 
  getCurrentDebugSession,
  generateDebugReport,
  clearAllDebugData,
  getStoredDebugSessions 
} from '../../services/debug/DebugDashboard';
import { 
  getCurrentNetworkState, 
  isNetworkMonitoringActive,
  refreshNetworkState 
} from '../../services/debug/NetworkMonitor';
import { getLastError } from '../../utils/ErrorLogger';

interface DebugScreenProps {
  navigation?: any;
}

const DebugScreen: React.FC<DebugScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [routerIP, setRouterIP] = useState('10.0.0.1');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [networkState, setNetworkState] = useState<any>(null);
  const [lastError, setLastError] = useState<any>(null);
  const [debugSessions, setDebugSessions] = useState<any[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load router config
      const config = await AsyncStorage.getItem('router_config');
      if (config) {
        const parsedConfig = JSON.parse(config);
        setRouterIP(parsedConfig.ip || '10.0.0.1');
        setUsername(parsedConfig.username || 'admin');
        setPassword(parsedConfig.password || 'password');
      }

      // Load system health
      const health = await getSystemHealth();
      setSystemHealth(health);

      // Load network state
      const network = getCurrentNetworkState();
      setNetworkState(network);

      // Load last error
      const error = await getLastError();
      setLastError(error);

      // Load debug sessions
      const sessions = await getStoredDebugSessions();
      setDebugSessions(sessions);

      // Check monitoring status
      setIsMonitoring(isNetworkMonitoringActive());

    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const handleRunDiagnostics = async () => {
    if (!routerIP.trim()) {
      Alert.alert('Error', 'Please enter a router IP address');
      return;
    }

    setLoading(true);
    try {
      const credentials = username && password ? { username, password } : undefined;
      const session = await runDebugSession(routerIP, credentials, 'Manual debug session');
      
      Alert.alert(
        'Debug Session Complete',
        `Session ID: ${session.id}\nNotes: ${session.notes.join(', ')}`,
        [
          { text: 'View Report', onPress: () => handleViewReport(session) },
          { text: 'OK' }
        ]
      );

      // Refresh data
      await loadInitialData();
    } catch (error: any) {
      Alert.alert('Debug Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async (session?: any) => {
    try {
      const report = await generateDebugReport(session);
      
      Alert.alert(
        'Debug Report',
        'Report generated successfully',
        [
          { text: 'Share', onPress: () => shareReport(report) },
          { text: 'Copy to Clipboard', onPress: () => copyToClipboard(report) },
          { text: 'Close' }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', `Failed to generate report: ${error.message}`);
    }
  };

  const shareReport = async (report: string) => {
    try {
      await Share.share({
        message: report,
        title: 'Xfinity Router App Debug Report'
      });
    } catch (error) {
      console.error('Failed to share report:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    // Note: React Native doesn't have built-in clipboard support
    // You would need to install @react-native-clipboard/clipboard
    console.log('Report copied to console (clipboard not available):', text);
    Alert.alert('Report Copied', 'Report has been logged to console');
  };

  const handleClearData = async () => {
    Alert.alert(
      'Clear Debug Data',
      'This will remove all stored debug sessions, network logs, and error data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllDebugData();
              await loadInitialData();
              Alert.alert('Success', 'All debug data cleared');
            } catch (error: any) {
              Alert.alert('Error', `Failed to clear data: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const handleRefreshNetwork = async () => {
    try {
      const newState = await refreshNetworkState();
      setNetworkState(newState);
      Alert.alert('Success', 'Network state refreshed');
    } catch (error: any) {
      Alert.alert('Error', `Failed to refresh network state: ${error.message}`);
    }
  };

  const getStatusColor = (isGood: boolean) => isGood ? '#4CAF50' : '#F44336';
  const getStatusText = (isGood: boolean) => isGood ? 'Good' : 'Issues';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Debug Dashboard</Text>
        
        {/* Router Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Router Configuration</Text>
          <TextInput
            style={styles.input}
            placeholder="Router IP Address"
            value={routerIP}
            onChangeText={setRouterIP}
          />
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* System Health */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Health</Text>
          {systemHealth && (
            <View style={styles.healthGrid}>
              <View style={styles.healthItem}>
                <Text style={styles.healthLabel}>Network</Text>
                <Text style={[styles.healthStatus, { color: getStatusColor(systemHealth.network.isConnected) }]}>
                  {getStatusText(systemHealth.network.isConnected)}
                </Text>
                <Text style={styles.healthDetail}>{systemHealth.network.type}</Text>
              </View>
              
              <View style={styles.healthItem}>
                <Text style={styles.healthLabel}>Router</Text>
                <Text style={[styles.healthStatus, { color: getStatusColor(systemHealth.router.isReachable) }]}>
                  {getStatusText(systemHealth.router.isReachable)}
                </Text>
                {systemHealth.router.responseTime && (
                  <Text style={styles.healthDetail}>{systemHealth.router.responseTime}ms</Text>
                )}
              </View>
              
              <View style={styles.healthItem}>
                <Text style={styles.healthLabel}>Debug Mode</Text>
                <Text style={[styles.healthStatus, { color: getStatusColor(systemHealth.app.debugMode) }]}>
                  {systemHealth.app.debugMode ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              
              <View style={styles.healthItem}>
                <Text style={styles.healthLabel}>Monitoring</Text>
                <Text style={[styles.healthStatus, { color: getStatusColor(isMonitoring) }]}>
                  {isMonitoring ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Information</Text>
          
          {networkState && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Network Status:</Text>
              <Text style={styles.infoValue}>
                {networkState.isConnected ? 'Connected' : 'Disconnected'} ({networkState.type})
              </Text>
            </View>
          )}
          
          {lastError && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Error:</Text>
              <Text style={[styles.infoValue, { color: '#F44336' }]}>
                {lastError.message}
              </Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Debug Sessions:</Text>
            <Text style={styles.infoValue}>{debugSessions.length} stored</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Actions</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleRunDiagnostics}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Run Full Diagnostics</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => handleViewReport()}
          >
            <Text style={[styles.buttonText, { color: '#007AFF' }]}>View Last Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleRefreshNetwork}
          >
            <Text style={[styles.buttonText, { color: '#007AFF' }]}>Refresh Network State</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleClearData}
          >
            <Text style={styles.buttonText}>Clear All Debug Data</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Sessions */}
        {debugSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Debug Sessions</Text>
            {debugSessions.slice(-3).reverse().map((session, index) => (
              <TouchableOpacity
                key={session.id}
                style={styles.sessionItem}
                onPress={() => handleViewReport(session)}
              >
                <Text style={styles.sessionId}>{session.id}</Text>
                <Text style={styles.sessionDescription}>{session.description}</Text>
                <Text style={styles.sessionTime}>
                  {new Date(session.timestamp).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  healthItem: {
    width: '48%',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    marginBottom: 8,
  },
  healthLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  healthStatus: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  healthDetail: {
    fontSize: 12,
    color: '#999',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  sessionItem: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    marginBottom: 8,
  },
  sessionId: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  sessionDescription: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginVertical: 2,
  },
  sessionTime: {
    fontSize: 12,
    color: '#999',
  },
});

export default DebugScreen;
