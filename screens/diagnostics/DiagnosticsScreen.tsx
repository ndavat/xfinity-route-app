import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { 
  diagnosticsService, 
  SystemLog,
  PingResult,
  LedStatus,
  SignalStrengthData,
  BatteryStatus 
} from '../../services/network/DiagnosticsService';
import { useMockMode } from '../../contexts/MockModeContext';

export default function DiagnosticsScreen() {
  const navigation = useNavigation();
  const { isMockMode } = useMockMode();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'logs' | 'tests'>('status');
  
  // System status
  const [ledStatus, setLedStatus] = useState<LedStatus | null>(null);
  const [signalData, setSignalData] = useState<SignalStrengthData | null>(null);
  const [batteryStatus, setBatteryStatus] = useState<BatteryStatus | null>(null);
  
  // System logs
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [logFilter, setLogFilter] = useState('');
  
  // Network tests
  const [pingHost, setPingHost] = useState('8.8.8.8');
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);

  useEffect(() => {
    loadDiagnosticsData();
  }, []);

  const loadDiagnosticsData = async () => {
    setIsLoading(true);
    try {
      const [led, signal, battery, logs] = await Promise.all([
        diagnosticsService.getLedStatus(),
        diagnosticsService.getSignalStrength(),
        diagnosticsService.getBatteryStatus(),
        diagnosticsService.getSystemLogs(),
      ]);
      
      setLedStatus(led);
      setSignalData(signal);
      setBatteryStatus(battery);
      setSystemLogs(logs.slice(0, 100)); // Show last 100 logs
      
      
    } catch (error: any) {
      console.error('Error loading diagnostics data:', error);
      toast.error('Failed to load diagnostics data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDiagnosticsData();
    setIsRefreshing(false);
  };

  const handlePingTest = async () => {
    if (!pingHost || pingHost.trim().length === 0) {
      toast.error('Please enter a host to ping');
      return;
    }
    
    setIsPinging(true);
    setPingResult(null);
    
    try {
      const result = await diagnosticsService.performPingTest(pingHost);
      setPingResult(result);
      
      if (result.success) {
        toast.success(`Ping successful: ${result.avgTime.toFixed(2)}ms average`);
      } else {
        toast.error('Ping failed: No response from host');
      }
    } catch (error: any) {
      console.error('Error performing ping test:', error);
      toast.error('Failed to perform ping test');
    } finally {
      setIsPinging(false);
    }
  };

  const downloadLogs = async () => {
    try {
      toast.info('Downloading logs...');
      const blob = await diagnosticsService.downloadLogs();
      // In a real app, you would save the blob to device storage
      toast.success('Logs downloaded successfully');
    } catch (error) {
      toast.error('Failed to download logs');
    }
  };

  const renderLedIndicator = (label: string, state: 'Off' | 'Solid' | 'Blinking') => {
    const color = state === 'Off' ? '#ccc' : state === 'Solid' ? '#4CAF50' : '#FFA500';
    const iconName = state === 'Off' ? 'radio-button-unchecked' : 'radio-button-checked';
    
    return (
      <View style={styles.ledIndicator}>
        <MaterialIcons name={iconName as any} size={24} color={color} />
        <Text style={styles.ledLabel}>{label}</Text>
        {state === 'Blinking' && <Text style={styles.ledBlinking}>(Blinking)</Text>}
      </View>
    );
  };

  const renderSignalChannel = (channel: any, type: 'downstream' | 'upstream') => {
    const isGood = type === 'downstream' 
      ? channel.power >= -7 && channel.power <= 7 && channel.snr >= 30
      : channel.power >= 35 && channel.power <= 50;
    
    return (
      <View key={channel.channel} style={styles.channelCard}>
        <Text style={styles.channelNumber}>Ch {channel.channel}</Text>
        <View style={styles.channelDetails}>
          <Text style={styles.channelText}>
            {channel.frequency} MHz | {channel.modulation}
          </Text>
          <Text style={[styles.channelText, isGood ? styles.signalGood : styles.signalBad]}>
            Power: {channel.power} dBmV | SNR: {channel.snr} dB
          </Text>
          <View style={styles.channelLocked}>
            <MaterialIcons 
              name={channel.locked ? "lock" : "lock-open"} 
              size={16} 
              color={channel.locked ? "#4CAF50" : "#FF6B6B"} 
            />
            <Text style={styles.channelLockedText}>
              {channel.locked ? 'Locked' : 'Not Locked'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderLogItem = ({ item }: { item: SystemLog }) => {
    const levelColor = {
      'Error': '#FF6B6B',
      'Warning': '#FFA500',
      'Info': '#0261C2',
      'Debug': '#666',
    };
    
    return (
      <View style={styles.logItem}>
        <View style={styles.logHeader}>
          <Text style={[styles.logLevel, { color: levelColor[item.level] }]}>
            [{item.level}]
          </Text>
          <Text style={styles.logCategory}>{item.category}</Text>
          <Text style={styles.logTime}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
        </View>
        <Text style={styles.logMessage}>{item.message}</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Diagnostics</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0261C2" />
          <Text style={styles.loadingText}>Loading diagnostics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Diagnostics</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <MaterialIcons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Tab Selector */}
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'status' && styles.activeTab]}
            onPress={() => setActiveTab('status')}
          >
            <Text style={[styles.tabText, activeTab === 'status' && styles.activeTabText]}>
              Status
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'logs' && styles.activeTab]}
            onPress={() => setActiveTab('logs')}
          >
            <Text style={[styles.tabText, activeTab === 'logs' && styles.activeTabText]}>
              Logs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'tests' && styles.activeTab]}
            onPress={() => setActiveTab('tests')}
          >
            <Text style={[styles.tabText, activeTab === 'tests' && styles.activeTabText]}>
              Tests
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Tab */}
        {activeTab === 'status' && (
          <>
            {/* LED Status */}
            {ledStatus && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>LED Status</Text>
                <View style={styles.ledGrid}>
                  {renderLedIndicator('Power', ledStatus.power)}
                  {renderLedIndicator('Cable Modem', ledStatus.cm)}
                  {renderLedIndicator('Online', ledStatus.online)}
                  {renderLedIndicator('2.4 GHz', ledStatus.wifi24)}
                  {renderLedIndicator('5 GHz', ledStatus.wifi50)}
                  {renderLedIndicator('Tel 1', ledStatus.tel1)}
                  {renderLedIndicator('Tel 2', ledStatus.tel2)}
                </View>
              </View>
            )}

            {/* Signal Strength */}
            {signalData && (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Downstream Channels</Text>
                  {signalData.downstream.length === 0 ? (
                    <Text style={styles.emptyText}>No downstream channel data available</Text>
                  ) : (
                    signalData.downstream.map(channel => 
                      renderSignalChannel(channel, 'downstream')
                    )
                  )}
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Upstream Channels</Text>
                  {signalData.upstream.length === 0 ? (
                    <Text style={styles.emptyText}>No upstream channel data available</Text>
                  ) : (
                    signalData.upstream.map(channel => 
                      renderSignalChannel(channel, 'upstream')
                    )
                  )}
                </View>
              </>
            )}

            {/* Battery Status */}
            {batteryStatus && batteryStatus.present && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Battery Status</Text>
                <View style={styles.batteryInfo}>
                  <View style={styles.batteryRow}>
                    <Text style={styles.batteryLabel}>Status:</Text>
                    <Text style={styles.batteryValue}>
                      {batteryStatus.charging ? 'Charging' : 'On Battery'}
                    </Text>
                  </View>
                  <View style={styles.batteryRow}>
                    <Text style={styles.batteryLabel}>Capacity:</Text>
                    <View style={styles.batteryCapacity}>
                      <View 
                        style={[
                          styles.batteryBar,
                          { width: `${batteryStatus.capacity}%` },
                          batteryStatus.capacity < 20 && styles.batteryLow
                        ]} 
                      />
                    </View>
                    <Text style={styles.batteryPercent}>{batteryStatus.capacity}%</Text>
                  </View>
                  <View style={styles.batteryRow}>
                    <Text style={styles.batteryLabel}>Health:</Text>
                    <Text style={[
                      styles.batteryValue,
                      batteryStatus.health === 'Replace' && styles.textDanger
                    ]}>
                      {batteryStatus.health}
                    </Text>
                  </View>
                  <View style={styles.batteryRow}>
                    <Text style={styles.batteryLabel}>Runtime:</Text>
                    <Text style={styles.batteryValue}>
                      {batteryStatus.runtime} minutes
                    </Text>
                  </View>
                </View>
                {batteryStatus.capacity < 20 && (
                  <View style={styles.warningBox}>
                    <MaterialIcons name="warning" size={20} color="#FF6B6B" />
                    <Text style={styles.warningText}>
                      Low battery! Voice service may be unavailable during power outage.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <View style={styles.card}>
            <View style={styles.logsHeader}>
              <Text style={styles.cardTitle}>System Logs</Text>
              <TouchableOpacity onPress={downloadLogs}>
                <MaterialIcons name="download" size={24} color="#0261C2" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.searchInput}
              placeholder="Search logs..."
              value={logFilter}
              onChangeText={setLogFilter}
            />
            
            {systemLogs.length === 0 ? (
              <Text style={styles.emptyText}>No logs available</Text>
            ) : (
              <FlatList
                data={systemLogs.filter(log => 
                  logFilter === '' || 
                  log.message.toLowerCase().includes(logFilter.toLowerCase()) ||
                  log.category.toLowerCase().includes(logFilter.toLowerCase())
                )}
                renderItem={renderLogItem}
                keyExtractor={(item, index) => `${item.timestamp}-${index}`}
                style={styles.logsList}
                scrollEnabled={false}
              />
            )}
          </View>
        )}

        {/* Tests Tab */}
        {activeTab === 'tests' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ping Test</Text>
              
              <View style={styles.testForm}>
                <TextInput
                  style={styles.testInput}
                  placeholder="Enter host to ping (e.g., 8.8.8.8)"
                  value={pingHost}
                  onChangeText={setPingHost}
                />
                <TouchableOpacity
                  style={[styles.testButton, isPinging && styles.disabledButton]}
                  onPress={handlePingTest}
                  disabled={isPinging}
                >
                  {isPinging ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <MaterialIcons name="network-check" size={18} color="white" />
                      <Text style={styles.testButtonText}>Run Ping Test</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              
              {pingResult && (
                <View style={styles.testResult}>
                  <Text style={styles.resultTitle}>Ping Results:</Text>
                  <Text style={styles.resultText}>
                    Host: {pingResult.host || pingHost}
                  </Text>
                  <Text style={[
                    styles.resultText,
                    pingResult.success ? styles.textSuccess : styles.textDanger
                  ]}>
                    {pingResult.success ? '✓ Host is reachable' : '✗ Host unreachable'}
                  </Text>
                  <Text style={styles.resultText}>
                    Packets: {pingResult.packetsReceived}/{pingResult.packetsTransmitted} 
                    ({100 - pingResult.packetLoss}% success)
                  </Text>
                  {pingResult.success && (
                    <Text style={styles.resultText}>
                      Response time: {pingResult.minTime.toFixed(2)}ms min / 
                      {pingResult.avgTime.toFixed(2)}ms avg / 
                      {pingResult.maxTime.toFixed(2)}ms max
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.infoBox}>
              <MaterialIcons name="info" size={20} color="#0261C2" />
              <Text style={styles.infoText}>
                Network tests help diagnose connectivity issues. Ping tests check if a host is reachable.
                More advanced tests like traceroute and speed tests may not be available on all firmware versions.
              </Text>
            </View>
          </>
        )}
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
  content: {
    flex: 1,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#0261C2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
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
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  ledGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  ledIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
  },
  ledLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  ledBlinking: {
    fontSize: 12,
    color: '#FFA500',
    marginLeft: 4,
  },
  channelCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0261C2',
    width: 50,
  },
  channelDetails: {
    flex: 1,
  },
  channelText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  signalGood: {
    color: '#4CAF50',
  },
  signalBad: {
    color: '#FF6B6B',
  },
  channelLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  channelLockedText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#666',
  },
  batteryInfo: {
    marginTop: 8,
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  batteryLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  batteryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  batteryCapacity: {
    flex: 1,
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  batteryBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  batteryLow: {
    backgroundColor: '#FF6B6B',
  },
  batteryPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    width: 40,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  warningText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#856404',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  logsList: {
    maxHeight: 400,
  },
  logItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 8,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logLevel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 8,
  },
  logCategory: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  logTime: {
    fontSize: 11,
    color: '#999',
  },
  logMessage: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  testForm: {
    marginBottom: 16,
  },
  testInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0261C2',
    padding: 12,
    borderRadius: 8,
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  testResult: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  resultText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  textSuccess: {
    color: '#4CAF50',
  },
  textDanger: {
    color: '#FF6B6B',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    margin: 16,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#0261C2',
  },
});
