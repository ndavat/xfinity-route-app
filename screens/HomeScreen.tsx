import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toast } from 'sonner-native';
import { RouterConnectionService } from '../services/RouterConnectionService';
import { ServiceFactory } from '../services/ServiceInterfaces';
import { useMockMode } from '../contexts/MockModeContext';
import { EnvironmentAlert } from '../components/EnvironmentAlert';
import { MockModeIndicator } from '../components/MockModeIndicator';
import { Config } from '../utils/config';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { isMockMode } = useMockMode();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [routerInfo, setRouterInfo] = useState({
    status: 'Unknown',
    uptime: 'Unknown',
    connectedDevices: 0,
  });

  // Create services based on current mode
  const deviceService = ServiceFactory.createDeviceService(isMockMode);
  const routerService = ServiceFactory.createRouterService(isMockMode);

  console.log('HomeScreen: Mode is', isMockMode ? 'MOCK' : 'LIVE', 'at render time');

  useEffect(() => {
    checkRouterConnection();
  }, [isMockMode]); // Re-check when mode changes

  const checkRouterConnection = async () => {
    setIsLoading(true);
    console.log('HomeScreen: Checking router connection, isMockMode:', isMockMode);
    
    try {
      console.log('HomeScreen: Calling routerService.checkConnection()');
      const connected = await routerService.checkConnection();
      console.log('HomeScreen: Connection check result:', connected);
      setIsConnected(connected);

      if (connected) {
        // Get basic router information
        console.log('HomeScreen: Getting router info...');
        const info = await routerService.getRouterInfo();
        console.log('HomeScreen: Router info received:', JSON.stringify(info, null, 2));
        
        setRouterInfo({
          status: info.status || 'Online',
          uptime: info.uptime || 'Unknown',
          connectedDevices: info.connectedDevices || 0,
        });
        
        console.log('HomeScreen: Updated routerInfo state with connectedDevices:', info.connectedDevices);
        
        if (isMockMode) {
          toast.success('Connected to mock router');
        } else {
          toast.success('Connected to router');
        }
      } else {
        console.log('HomeScreen: Connection failed, showing alert');
        // Show detailed connection failure alert
        showConnectionFailureAlert();
        toast.error('Failed to connect to router');
      }
    } catch (error) {
      console.error('HomeScreen: Router connection error:', error);
      showConnectionFailureAlert();
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      console.log('HomeScreen: Connection check complete');
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
        {          
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

      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0261C2" />
          <Text style={styles.loadingText}>Connecting to router...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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

          {/* Environment Alert */}
          <EnvironmentAlert />
          
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
                <Text style={[styles.statusText, {color: '#FFD700', fontWeight: 'bold'}]}>
                  MODE: {isMockMode ? 'MOCK' : 'LIVE'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.cardContainer}>
            {renderFeatureCard(
              'devices', 
              'Connected Devices', 
              'View and manage all devices connected to your router',
              'Devices'
            )}
            
            {renderFeatureCard(
              'block', 
              'Device Control', 
              'Block, unblock, or schedule access for specific devices',
              'DeviceSelection'
            )}

            {/* {renderFeatureCard(
              'wifi', 
              'Wi-Fi Settings', 
              'Configure Wi-Fi network name, password, and channels',
              'WifiConfiguration'
            )} */}

            {/* {renderFeatureCard(
              'router', 
              'Network Configuration', 
              'Manage DHCP, DNS, and bridge mode settings',
              'NetworkConfiguration'
            )} */}

            {/* {renderFeatureCard(
              'security', 
              'Port Forwarding & Firewall', 
              'Configure port forwarding rules and firewall settings',
              'PortForwarding'
            )} */}

            {/* {renderFeatureCard(
              'analytics', 
              'Diagnostics', 
              'System logs, signal strength, and network tests',
              'Diagnostics'
            )} */}

            {renderFeatureCard(
              'settings', 
              'Router Settings', 
              'Configure router settings and credentials',
              'Settings'
            )}

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
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
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