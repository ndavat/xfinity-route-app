import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { ServiceFactory } from '../services/ServiceInterfaces';
import { useMockMode } from '../contexts/MockModeContext';
import { Device, TrafficData } from '../types/Device';

export default function DeviceTrafficScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { isMockMode } = useMockMode();
  const [trafficData, setTrafficData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(true);

  // Get device data from route params
  const params = route.params as { device: Device };
  const device = params?.device;

  // Create device service based on current mode
  const deviceService = ServiceFactory.createDeviceService(isMockMode);

  useEffect(() => {
    if (device) {
      loadTrafficData();
    }
  }, [device]);

  const loadTrafficData = async () => {
    if (!device) return;
    
    setLoading(true);
    try {
      const data = await deviceService.getTrafficData(device.mac);
      setTrafficData(data);
    } catch (error) {
      console.error('Failed to load traffic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Device information not available</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Traffic Data</Text>
        <TouchableOpacity onPress={loadTrafficData} style={styles.refreshButton}>
          <MaterialIcons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.deviceCard}>
          <Text style={styles.deviceName}>
            {device.customName || device.hostname}
          </Text>
          <Text style={styles.deviceInfo}>{device.ip} • {device.mac}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading traffic data...</Text>
          </View>
        ) : trafficData ? (
          <View style={styles.trafficContainer}>
            <View style={styles.trafficCard}>
              <View style={styles.trafficHeader}>
                <MaterialIcons name="cloud-upload" size={24} color="#4CAF50" />
                <Text style={styles.trafficTitle}>Upload</Text>
              </View>
              <Text style={styles.trafficValue}>{formatBytes(trafficData.bytesUp)}</Text>
              <Text style={styles.trafficSubtext}>
                {formatNumber(trafficData.packetsUp)} packets
              </Text>
            </View>

            <View style={styles.trafficCard}>
              <View style={styles.trafficHeader}>
                <MaterialIcons name="cloud-download" size={24} color="#2196F3" />
                <Text style={styles.trafficTitle}>Download</Text>
              </View>
              <Text style={styles.trafficValue}>{formatBytes(trafficData.bytesDown)}</Text>
              <Text style={styles.trafficSubtext}>
                {formatNumber(trafficData.packetsDown)} packets
              </Text>
            </View>

            <View style={styles.totalCard}>
              <Text style={styles.totalTitle}>Total Data Usage</Text>
              <Text style={styles.totalValue}>
                {formatBytes(trafficData.bytesUp + trafficData.bytesDown)}
              </Text>
              <Text style={styles.totalSubtext}>
                {formatNumber(trafficData.packetsUp + trafficData.packetsDown)} total packets
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Last Updated</Text>
              <Text style={styles.infoValue}>
                {trafficData.lastUpdated.toLocaleString()}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <MaterialIcons name="info" size={48} color="#ccc" />
            <Text style={styles.noDataText}>No traffic data available</Text>
            <Text style={styles.noDataSubtext}>
              Traffic data may not be available for this device
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  deviceCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deviceInfo: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  trafficContainer: {
    gap: 16,
  },
  trafficCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  trafficHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trafficTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  trafficValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  trafficSubtext: {
    fontSize: 14,
    color: '#666',
  },
  totalCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  totalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  totalSubtext: {
    fontSize: 14,
    color: '#666',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
