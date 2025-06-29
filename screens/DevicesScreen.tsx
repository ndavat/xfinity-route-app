import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { DeviceList } from '../components/DeviceList';
import { MockModeIndicator } from '../components/MockModeIndicator';
import { ServiceFactory } from '../services/ServiceInterfaces';
import { useMockMode } from '../contexts/MockModeContext';

export default function DevicesScreen() {
  const navigation = useNavigation();
  const { isMockMode } = useMockMode();
  const [searchQuery, setSearchQuery] = useState('');

  // Create device service based on current mode
  const deviceService = ServiceFactory.createDeviceService(isMockMode);

  const handleSettings = () => {
    (navigation as any).navigate('Settings');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Mock Mode Ribbon */}
      {isMockMode && (
        <View style={styles.mockModeRibbon}>
          <Text style={styles.mockModeText}>MODE: MOCK</Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Devices</Text>
        <TouchableOpacity onPress={handleSettings} style={styles.settingsButton}>
          <MaterialIcons name="settings" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search devices..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <MaterialIcons name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <DeviceList 
        deviceService={deviceService}
        style={styles.deviceList}
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
  settingsButton: {
    padding: 8,
  },
  backButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  deviceList: {
    flex: 1,
    marginTop: 8,
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
