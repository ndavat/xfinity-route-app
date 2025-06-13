import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { RouterConnectionService } from '../services/RouterConnectionService';
import { Device } from '../types/Device';

export default function DevicesScreen() {
  const navigation = useNavigation();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const connectedDevices = await RouterConnectionService.getConnectedDevices();
      console.log('Fetched devices:', connectedDevices);
      setDevices(connectedDevices);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load devices');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDevices();
  };  const handleDevicePress = (device: Device) => {
    if (!device?.mac || !device?.ip) {
      console.error('Invalid device data:', device);
      toast.error('Error: Invalid device data');
      return;
    }

    const validDevice: Device = {
      mac: device.mac,
      ip: device.ip,
      hostname: device.hostname || device.ip,
      connectionType: device.connectionType || 'WiFi',
      isBlocked: Boolean(device.isBlocked),
      customName: device.customName || device.hostname || device.ip
    };

    console.log('Navigating to device control with:', validDevice);
    
    // Type-safe navigation
    (navigation as any).navigate('DeviceControl', {
      device: validDevice
    });
  };

  const filteredDevices = devices.filter(device => {
    const searchLower = searchQuery.toLowerCase();
    return (
      device.hostname?.toLowerCase().includes(searchLower) ||
      device.ip.toLowerCase().includes(searchLower) ||
      device.mac.toLowerCase().includes(searchLower) ||
      device.customName?.toLowerCase().includes(searchLower) ||
      device.connectionType.toLowerCase().includes(searchLower)
    );
  });

  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity 
      style={[styles.deviceCard, item.isBlocked && styles.blockedDevice]}
      onPress={() => handleDevicePress(item)}
    >
      <View style={styles.deviceHeader}>
        <View style={styles.connectionTypeIndicator}>
          <MaterialIcons 
            name={item.connectionType === 'WiFi' ? 'wifi' : 'lan'} 
            size={18} 
            color={item.isBlocked ? '#999' : '#0261C2'} 
          />
        </View>
        
        <Text style={styles.deviceName}>
          {item.customName || item.hostname || 'Unknown Device'}
          {item.isBlocked && <Text style={styles.blockedText}> (Blocked)</Text>}
        </Text>
        
        <MaterialIcons name="chevron-right" size={24} color="#999" />
      </View>
      
      <View style={styles.deviceInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>IP Address:</Text>
          <Text style={styles.infoValue}>{item.ip}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>MAC Address:</Text>
          <Text style={styles.infoValue}>{item.mac}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Connection:</Text>
          <Text style={styles.infoValue}>{item.connectionType}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Connected Devices</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
        >
          <MaterialIcons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search devices..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="clear" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0261C2" />
          <Text style={styles.loadingText}>Loading devices...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDevices}
          keyExtractor={(item) => item.mac}
          renderItem={renderDeviceItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="devices-other" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No devices found</Text>
              <Text style={styles.emptySubText}>
                {searchQuery 
                  ? 'Try adjusting your search query' 
                  : 'Pull down to refresh or check router connection'}
              </Text>
            </View>
          }
        />
      )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
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
  listContent: {
    padding: 8,
  },
  deviceCard: {
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
  blockedDevice: {
    opacity: 0.7,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  connectionTypeIndicator: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
  },
  deviceName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  blockedText: {
    color: '#D32F2F',
    fontWeight: 'normal',
  },
  deviceInfo: {
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginVertical: 3,
  },
  infoLabel: {
    fontSize: 14,
    width: 100,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#666',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});