import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toast } from 'sonner-native';
import { RouterConnectionService } from '../services/RouterConnectionService';
import { EnvironmentAlert } from '../components/EnvironmentAlert';
import { Config } from '../utils/config';
import { LogManager } from '../services/LogManager';
import LogAlert from '../components/LogAlert';
import ConnectionStatusAlert from '../components/ConnectionStatusAlert';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [routerInfo, setRouterInfo] = useState({
    status: 'Unknown',
    uptime: 'Unknown',
    connectedDevices: 0,
  });
  const [isRestarting, setIsRestarting] = useState(false);
  const [restartProgress, setRestartProgress] = useState<{
    status: 'restarting' | 'checking' | 'online' | 'failed';
    message: string;
  } | null>(null);
  const [showLogAlert, setShowLogAlert] = useState(false);

  useEffect(() => {
    checkRouterConnection();
  }, []);

  const checkRouterConnection = async () => {
    setIsLoading(true);
    try {
      const connected = await RouterConnectionService.checkConnection();
      setIsConnected(connected);

      if (connected) {
        // Get basic router information
        const info = await RouterConnectionService.getRouterInfo();
        setRouterInfo({
          status: info.status || 'Online',
          uptime: info.uptime || 'Unknown',
          connectedDevices: info.connectedDevices || 0,
        });
        toast.success('Connected to router');
      } else {
        // Show detailed connection failure alert
        showConnectionFailureAlert();
        toast.error('Failed to connect to router');
      }
    } catch (error) {
      console.error('Router connection error:', error);
      showConnectionFailureAlert();
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const showConnectionFailureAlert = () => {
    const advice = RouterConnectionService.getConnectionAdvice();
    
    const message = advice.canConnectToRouter 
      ? `Unable to connect to the router. Please check:\n\n• Router is powered on\n• IP address is correct (currently: ${Config.router.defaultIp})\n• Device is on the same network\n• Router credentials are valid`
      : `${advice.reason}\n\nSolutions:\n${advice.solutions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

    Alert.alert(
      'Router Connection Failed',
      message,
      [
        {
          text: 'Retry',
          onPress: () => checkRouterConnection(),
          style: 'default'
        },
        {
          text: 'Settings',
          onPress: () => navigation.navigate('Settings' as never),
          style: 'default'
        },
        {          text: 'Force Real Mode',
          onPress: async () => {
            try {
              await RouterConnectionService.saveRouterConfig({ useMockData: false });
              // Force real mode
              await AsyncStorage.setItem('use_mock_data', 'false');
              toast.success('Real mode enforced');
              checkRouterConnection();
            } catch (error) {
              toast.error('Failed to enable real mode');
            }
          },
          style: 'default'
        },
        {
          text: 'OK',
          style: 'cancel'
        }
      ],
      { cancelable: true }
    );
  };

  const restartRouter = async () => {
    // First show confirmation alert
    Alert.alert(
      'Restart Router',
      'Are you sure you want to restart the router? This will temporarily disconnect all devices.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Restart',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const result = await RouterConnectionService.restartRouter();
              if (result) {
                Alert.alert(
                  'Router Restart',
                  'Router restart has been initiated. The router will be offline for 1-2 minutes.',
                  [{ text: 'OK' }]
                );
                toast.success('Router restart initiated');
              } else {
                Alert.alert(
                  'Restart Failed',
                  'Unable to restart the router. Please check your connection and try again.',
                  [
                    {
                      text: 'Retry',
                      onPress: () => restartRouter()
                    },
                    {
                      text: 'OK',
                      style: 'cancel'
                    }
                  ]
                );
              }
            } catch (error) {
              console.error('Router restart error:', error);
              Alert.alert(
                'Restart Error',
                'An error occurred while trying to restart the router. Please try again or check your connection.',
                [
                  {
                    text: 'Retry',
                    onPress: () => restartRouter()
                  },
                  {
                    text: 'OK',
                    style: 'cancel'
                  }
                ]
              );
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // Function to render feature cards
  const renderFeatureCard = (icon: string, title: string, description: string, screenName: string) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate(screenName as never)}
      disabled={!isConnected || isLoading}
    >
      <View style={styles.cardHeader}>
        <MaterialIcons name={icon as any} size={24} color="#0261C2" />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardDescription}>{description}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Xfinity Router Manager</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={() => {
            if (!isConnected) {
              // Show quick connection help if currently disconnected
              Alert.alert(
                'Reconnect to Router',
                'Attempting to reconnect to the router...',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  },
                  {
                    text: 'Connect',
                    onPress: checkRouterConnection
                  }
                ]
              );
            } else {
              checkRouterConnection();
            }
          }}
          disabled={isLoading}
        >
          <MaterialIcons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0261C2" />
          <Text style={styles.loadingText}>Connecting to router...</Text>
        </View>
      ) : (
        <>
          {/* Environment Alert */}
          <EnvironmentAlert />

          {/* Connection Status Alert */}
          <ConnectionStatusAlert onStatusChange={(status) => {
            setIsConnected(status.canConnect);
            if (status.mode === 'mock') {
              console.log('App is running in mock data mode');
            }
          }} />

          <View style={[styles.statusCard, isConnected ? styles.statusConnected : styles.statusDisconnected]}>
            <View style={styles.statusHeader}>
              <MaterialIcons 
                name={isConnected ? "wifi" : "wifi-off"} 
                size={24} 
                color={isConnected ? "white" : "white"} 
              />
              <Text style={styles.statusTitle}>
                Router {isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
            {isConnected && (
              <View style={styles.statusDetails}>
                <Text style={styles.statusText}>Status: {routerInfo.status}</Text>
                <Text style={styles.statusText}>Uptime: {routerInfo.uptime}</Text>
                <Text style={styles.statusText}>Connected Devices: {routerInfo.connectedDevices}</Text>
              </View>
            )}
          </View>

          <ScrollView style={styles.cardContainer}>
            {renderFeatureCard(
              'devices', 
              'Connected Devices', 
              'View and manage all devices connected to your router',
              'Devices'
            )}
            
            {/* {renderFeatureCard(
              'block', 
              'Device Control', 
              'Block, unblock, or schedule access for specific devices',
              'DeviceControl'
            )} */}

            {renderFeatureCard(
              'settings',
              'Router Settings',
              'Configure router settings and credentials',
              'Settings'
            )}

            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('LogViewer' as never)}
            >
              <View style={styles.cardHeader}>
                <MaterialIcons name="list-alt" size={24} color="#4CAF50" />
                <Text style={styles.cardTitle}>Application Logs</Text>
              </View>
              <Text style={styles.cardDescription}>
                View application logs and debugging information
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => setShowLogAlert(true)}
            >
              <View style={styles.cardHeader}>
                <MaterialIcons name="bug-report" size={24} color="#FF9800" />
                <Text style={styles.cardTitle}>Quick Log View</Text>
              </View>
              <Text style={styles.cardDescription}>
                View recent logs in a popup dialog
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.card, styles.restartCard]} 
              onPress={restartRouter}
              disabled={!isConnected || isLoading}
            >
              <View style={styles.cardHeader}>
                <MaterialIcons name="power-settings-new" size={24} color="#D32F2F" />
                <Text style={[styles.cardTitle, styles.restartText]}>Restart Router</Text>
              </View>
              <Text style={styles.cardDescription}>
                Restart your Xfinity router (requires confirmation)
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </>
      )}

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
  refreshButton: {
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
  statusCard: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  statusConnected: {
    backgroundColor: '#43a047',
  },
  statusDisconnected: {
    backgroundColor: '#e53935',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  statusDetails: {
    marginTop: 8,
  },
  statusText: {
    color: 'white',
    marginVertical: 2,
  },
  cardContainer: {
    flex: 1,
    padding: 8,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cardDescription: {
    color: '#666',
  },
  restartCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  restartText: {
    color: '#D32F2F',
  },
});