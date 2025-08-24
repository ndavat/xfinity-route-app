import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Device } from '../types/Device';
import { DeviceService } from '../services/ServiceInterfaces';
import Alert from './Alert'; // Assuming Alert is in the same directory

interface Props {
  deviceService: DeviceService;
  style?: any;
}

export const DeviceList: React.FC<Props> = ({ deviceService, style }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    loadDevices();
  }, [deviceService]); // Reload when service changes

  const loadDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('DeviceList: Loading devices...');
      const deviceList = await deviceService.getDevices();
      console.log('DeviceList: Loaded', deviceList.length, 'devices:', deviceList);
      setDevices(deviceList);
    } catch (error) {
      console.error('Failed to load devices:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDevices();
    setRefreshing(false);
  };

  const navigateToDevice = (device: Device) => {
    (navigation as any).navigate('DeviceControl', { device });
  };

  const getStatusIcon = (device: Device) => {
    if (device.isBlocked) return 'block';
    if (device.isOnline) return 'wifi';
    return 'wifi-off';
  };

  const getStatusColor = (device: Device) => {
    if (device.isBlocked) return '#FF6B6B';
    if (device.isOnline) return '#4CAF50';
    return '#757575';
  };

  const getConnectionTypeIcon = (type: string) => {
    switch (type) {
      case 'WiFi':
        return 'wifi';
      case 'Ethernet':
        return 'cable';
      default:
        return 'devices';
    }
  };

  const renderDevice = ({ item }: { item: Device }) => (
    <TouchableOpacity 
      style={styles.deviceItem}
      onPress={() => navigateToDevice(item)}
    >
      <View style={styles.deviceIcon}>
        <MaterialIcons 
          name={getConnectionTypeIcon(item.connectionType)} 
          size={24} 
          color="#666" 
        />
      </View>
      
      <View style={styles.deviceInfo}>
        <Text style={styles.hostname}>
          {item.customName || item.hostname}
        </Text>
        <Text style={styles.ip}>{item.ip}</Text>
        <View style={styles.deviceDetails}>
          <Text style={styles.mac}>{item.mac}</Text>
          {item.networkDetails.band !== 'Unknown' && (
            <Text style={styles.band}>{item.networkDetails.band}</Text>
          )}
        </View>
      </View>
      
      <View style={styles.statusContainer}>
        <MaterialIcons 
          name={getStatusIcon(item)} 
          size={20} 
          color={getStatusColor(item)} 
        />
        <Text style={[styles.statusText, { color: getStatusColor(item) }]}>
          {item.isBlocked ? 'Blocked' : item.isOnline ? 'Online' : 'Offline'}
        </Text>
        {item.networkDetails.signalStrength && (
          <Text style={styles.signalStrength}>
            {item.networkDetails.signalStrength} dBm
          </Text>
        )}
      </View>
      
      <MaterialIcons name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading devices...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <Alert
          type="error"
          title="Error"
          message={error}
        />
        <Button title="Retry" onPress={loadDevices} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Connected Devices ({devices.length})</Text>
      </View>
      
      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.mac}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  list: {
    flex: 1,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deviceIcon: {
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  hostname: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  ip: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  deviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mac: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  band: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 8,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusContainer: {
    alignItems: 'center',
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  signalStrength: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
});
