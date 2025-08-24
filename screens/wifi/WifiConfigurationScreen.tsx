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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { Picker } from '@react-native-picker/picker';
import { WifiConfiguration, WifiBand, AuthMode } from '../../services/network/WifiService';
import { WifiServiceFactory } from '../../services/network/WifiServiceFactory';
import { useMockMode } from '../../contexts/MockModeContext';
import { CustomToggle } from '../../components/CustomToggle';

export default function WifiConfigurationScreen() {
  const navigation = useNavigation();
  const { isMockMode } = useMockMode();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedBand, setSelectedBand] = useState<WifiBand>('2.4GHz');
  
  // Get the appropriate service based on mock mode
  const wifiService = WifiServiceFactory.getService(isMockMode);
  
  // Wi-Fi configuration states
  const [wifiConfig2_4, setWifiConfig2_4] = useState<WifiConfiguration | null>(null);
  const [wifiConfig5, setWifiConfig5] = useState<WifiConfiguration | null>(null);
  
  // Channel lists
  const [channels2_4, setChannels2_4] = useState<number[]>([]);
  const [channels5, setChannels5] = useState<number[]>([]);
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadWifiConfiguration();
  }, []);

  const loadWifiConfiguration = async () => {
    setIsLoading(true);
    try {
      // Load configuration for both bands
      const [config2_4, config5] = await Promise.all([
        wifiService.getWifiConfiguration('2.4GHz'),
        wifiService.getWifiConfiguration('5GHz'),
      ]);
      
      setWifiConfig2_4(config2_4);
      setWifiConfig5(config5);
      
      // Load available channels
      const [chs2_4, chs5] = await Promise.all([
        wifiService.getAvailableChannels('2.4GHz'),
        wifiService.getAvailableChannels('5GHz'),
      ]);
      
      setChannels2_4(chs2_4);
      setChannels5(chs5);
      
      
    } catch (error: any) {
      console.error('Error loading Wi-Fi configuration:', error);
      toast.error('Failed to load Wi-Fi settings');
      
      // Set default values if loading fails
      setWifiConfig2_4({
        ssid: '',
        band: '2.4GHz',
        authMode: 'WPA2-PSK',
        password: '',
        channel: 0,
        enabled: true,
        broadcastSSID: true,
        wpsEnabled: false,
      });
      
      setWifiConfig5({
        ssid: '',
        band: '5GHz',
        authMode: 'WPA2-PSK',
        password: '',
        channel: 0,
        enabled: true,
        broadcastSSID: true,
        wpsEnabled: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentConfig = (): WifiConfiguration | null => {
    return selectedBand === '2.4GHz' ? wifiConfig2_4 : wifiConfig5;
  };

  const setCurrentConfig = (config: WifiConfiguration) => {
    if (selectedBand === '2.4GHz') {
      setWifiConfig2_4(config);
    } else {
      setWifiConfig5(config);
    }
  };

  const handleSave = async () => {
    const config = getCurrentConfig();
    if (!config) return;
    
    // Validate configuration
    if (!config.ssid || config.ssid.trim().length === 0) {
      toast.error('Please enter a network name (SSID)');
      return;
    }
    
    if (config.authMode !== 'Open' && (!config.password || config.password.length < 8)) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    setIsSaving(true);
    try {
      const success = await wifiService.setWifiConfiguration(config);
      if (success) {
        toast.success(`${selectedBand} Wi-Fi settings saved successfully`);
        // Reload configuration to confirm changes
        await loadWifiConfiguration();
      } else {
        toast.error('Failed to save Wi-Fi settings');
      }
    } catch (error: any) {
      console.error('Error saving Wi-Fi configuration:', error);
      toast.error(error.message || 'Failed to save Wi-Fi settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleWifi = async (enabled: boolean) => {
    try {
      const success = await wifiService.toggleWifi(enabled, selectedBand);
      if (success) {
        const config = getCurrentConfig();
        if (config) {
          config.enabled = enabled;
          setCurrentConfig({ ...config });
        }
        toast.success(`${selectedBand} Wi-Fi ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        toast.error('Failed to toggle Wi-Fi');
      }
    } catch (error) {
      console.error('Error toggling Wi-Fi:', error);
      toast.error('Failed to toggle Wi-Fi');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Wi-Fi Configuration</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0261C2" />
          <Text style={styles.loadingText}>Loading Wi-Fi settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const config = getCurrentConfig();
  const channels = selectedBand === '2.4GHz' ? channels2_4 : channels5;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Wi-Fi Configuration</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <MaterialIcons name="save" size={24} color="white" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Band Selector */}
        <View style={styles.bandSelector}>
          <TouchableOpacity
            style={[styles.bandTab, selectedBand === '2.4GHz' && styles.activeBandTab]}
            onPress={() => setSelectedBand('2.4GHz')}
          >
            <Text style={[styles.bandTabText, selectedBand === '2.4GHz' && styles.activeBandTabText]}>
              2.4 GHz
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bandTab, selectedBand === '5GHz' && styles.activeBandTab]}
            onPress={() => setSelectedBand('5GHz')}
          >
            <Text style={[styles.bandTabText, selectedBand === '5GHz' && styles.activeBandTabText]}>
              5 GHz
            </Text>
          </TouchableOpacity>
        </View>

        {config && (
          <>
            {/* Wi-Fi Enable Toggle */}
            <View style={styles.card}>
              <CustomToggle
                value={config.enabled}
                onValueChange={handleToggleWifi}
                label={`Enable ${selectedBand} Wi-Fi`}
                description={config.enabled ? 'Wi-Fi is currently enabled' : 'Wi-Fi is currently disabled'}
              />
            </View>

            {/* Network Name (SSID) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Network Settings</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Network Name (SSID)</Text>
                <TextInput
                  style={styles.input}
                  value={config.ssid}
                  onChangeText={(text) => setCurrentConfig({ ...config, ssid: text })}
                  placeholder="Enter network name"
                  maxLength={32}
                  editable={config.enabled}
                />
              </View>

              {/* Broadcast SSID */}
              <CustomToggle
                value={config.broadcastSSID}
                onValueChange={(value) => setCurrentConfig({ ...config, broadcastSSID: value ?? false })}
                label="Broadcast Network Name"
                description="Make this network visible to devices"
                disabled={!config.enabled}
              />
            </View>

            {/* Security Settings */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Security Settings</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Security Mode</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={config.authMode}
                    onValueChange={(value: AuthMode) => setCurrentConfig({ ...config, authMode: value })}
                    enabled={config.enabled}
                  >
                    <Picker.Item label="Open (No Security)" value="Open" />
                    <Picker.Item label="WPA-PSK" value="WPA-PSK" />
                    <Picker.Item label="WPA2-PSK (Recommended)" value="WPA2-PSK" />
                    <Picker.Item label="WPA3-PSK" value="WPA3-PSK" />
                    <Picker.Item label="WPA2/WPA3-PSK" value="WPA2/WPA3-PSK" />
                  </Picker>
                </View>
              </View>

              {config.authMode !== 'Open' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={config.password}
                      onChangeText={(text) => setCurrentConfig({ ...config, password: text })}
                      placeholder="Enter password (8-63 characters)"
                      secureTextEntry={!showPassword}
                      maxLength={63}
                      editable={config.enabled}
                    />
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <MaterialIcons
                        name={showPassword ? 'visibility-off' : 'visibility'}
                        size={24}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.helperText}>
                    Use a strong password with at least 8 characters
                  </Text>
                </View>
              )}

              {/* WPS */}
              <CustomToggle
                value={config.wpsEnabled}
                onValueChange={(value) => setCurrentConfig({ ...config, wpsEnabled: value ?? false })}
                label="Enable WPS"
                description="Allow devices to connect using WPS button"
                disabled={!config.enabled || config.authMode === 'Open'}
              />
            </View>

            {/* Channel Settings */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Channel Settings</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Channel</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={config.channel}
                    onValueChange={(value: number) => setCurrentConfig({ ...config, channel: value })}
                    enabled={config.enabled}
                  >
                    <Picker.Item label="Auto" value={0} />
                    {channels.map((ch) => (
                      <Picker.Item key={ch} label={`Channel ${ch}`} value={ch} />
                    ))}
                  </Picker>
                </View>
                <Text style={styles.helperText}>
                  Auto mode will select the best channel automatically
                </Text>
              </View>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <MaterialIcons name="info" size={20} color="#0261C2" />
              <Text style={styles.infoText}>
                Changes to Wi-Fi settings may temporarily disconnect devices. The router may need to restart for some changes to take effect.
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
  saveButton: {
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
  bandSelector: {
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
  bandTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeBandTab: {
    backgroundColor: '#0261C2',
  },
  bandTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeBandTabText: {
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
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#444',
    fontWeight: '500',
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingRight: 50,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    padding: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    margin: 16,
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#0261C2',
  },
});
