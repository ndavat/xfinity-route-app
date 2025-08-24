import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { MockModeIndicator } from '../components/MockModeIndicator';
import { ServiceFactory } from '../services/ServiceInterfaces';
import { useMockMode } from '../contexts/MockModeContext';
import { Device } from '../types/Device';

export default function DeviceSelectionScreen() {
  const navigation = useNavigation();
  const { isMockMode } = useMockMode();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create device service based on current mode
  const deviceService = ServiceFactory.createDeviceService(isMockMode);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const deviceList = await deviceService.getDevices();
      setDevices(deviceList);
      
      // Auto-select first device if available
      if (deviceList.length > 0) {
        setSelectedDevice(deviceList[0]);
      }
    } catch (err) {
      console.error('Error loading devices:', err);
      setError('Failed to load connected devices. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeviceSelect = (deviceId: string) => {
    const device = devices.find(d => d.mac === deviceId);
    setSelectedDevice(device || null);
  };

  const handleProceedToControl = () => {
    if (!selectedDevice) {
      Alert.alert('No Device Selected', 'Please select a device to control.');
      return;
    }

    (navigation as any).navigate('DeviceControl', { device: selectedDevice });
  };

  const renderDeviceInfo = (device: Device) => (
    <View style={styles.deviceInfo}>
      <View style={styles.deviceHeader}>
        <MaterialIcons 
          name={device.connectionType === 'WiFi' ? 'wifi' : 'lan'} 
          size={24} 
          color="#0261C2" 
        />
        <Text style={styles.deviceName}>
          {device.customName || device.hostname || 'Unknown Device'}
        </Text>
      </View>
      <Text style={styles.deviceDetail}>IP: {device.ip}</Text>
      <Text style={styles.deviceDetail}>MAC: {device.mac}</Text>
      <Text style={styles.deviceDetail}>
        Connection: {device.connectionType} 
        {device.isBlocked && ' (Blocked)'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Mock Mode Ribbon */}
      {isMockMode && (
        <View style={styles.mockModeRibbon}>
          <Text style={styles.mockModeText}>MODE: MOCK</Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Select Device to Control</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="devices" size={24} color="#0261C2" />
            <Text style={styles.cardTitle}>Select Device to Control</Text>
          </View>
          <Text style={styles.cardDescription}>
            Choose a connected device to block, unblock, or schedule access controls.
          </Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0261C2" />
              <Text style={styles.loadingText}>Loading connected devices...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error" size={48} color="#e53935" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadDevices}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : devices.length === 0 ? (
            <View style={styles.noDevicesContainer}>
              <MaterialIcons name="devices" size={48} color="#999" />
              <Text style={styles.noDevicesText}>No connected devices found</Text>
              <Text style={styles.noDevicesSubtext}>
                Make sure devices are connected to your router and try again.
              </Text>
              <TouchableOpacity style={styles.refreshButton} onPress={loadDevices}>
                <MaterialIcons name="refresh" size={20} color="white" />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.dropdownContainer}>
                <Text style={styles.dropdownLabel}>Select Device:</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedDevice?.mac || ''}
                    onValueChange={handleDeviceSelect}
                    style={styles.picker}
                  >
                    <Picker.Item 
                      label="Choose a device..." 
                      value="" 
                      color="#999"
                    />
                    {devices.map((device) => (
                      <Picker.Item
                        key={device.mac}
                        label={`${device.customName || device.hostname || device.ip} (${device.connectionType})`}
                        value={device.mac}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {selectedDevice && (
                <View style={styles.selectedDeviceContainer}>
                  <Text style={styles.selectedDeviceTitle}>Selected Device:</Text>
                  {renderDeviceInfo(selectedDevice)}
                  
                  <TouchableOpacity
                    style={styles.proceedButton}
                    onPress={handleProceedToControl}
                  >
                    <MaterialIcons name="arrow-forward" size={20} color="white" />
                    <Text style={styles.proceedButtonText}>Proceed to Control</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.helpCard}>
          <MaterialIcons name="info" size={24} color="#0261C2" />
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>Device Control Features</Text>
            <Text style={styles.helpText}>• Block or unblock device internet access</Text>
            <Text style={styles.helpText}>• Set custom device names</Text>
            <Text style={styles.helpText}>• Schedule temporary blocks</Text>
            <Text style={styles.helpText}>• View device connection details</Text>
          </View>
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#e53935',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#0261C2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noDevicesContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noDevicesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  noDevicesSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#0261C2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dropdownContainer: {
    marginBottom: 24,
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  selectedDeviceContainer: {
    marginTop: 16,
  },
  selectedDeviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  deviceInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  deviceDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  proceedButton: {
    backgroundColor: '#0261C2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  proceedButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  helpCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  helpContent: {
    flex: 1,
    marginLeft: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  mockModeRibbon: {
    backgroundColor: '#FFD700',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  mockModeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
