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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { networkService, DhcpConfiguration, DnsConfiguration } from '../../services/network/NetworkService';
import { useMockMode } from '../../contexts/MockModeContext';
import { CustomToggle } from '../../components/CustomToggle';

export default function NetworkConfigurationScreen() {
  const navigation = useNavigation();
  const { isMockMode } = useMockMode();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'dhcp' | 'dns' | 'bridge'>('dhcp');
  
  // DHCP configuration
  const [dhcpConfig, setDhcpConfig] = useState<DhcpConfiguration | null>(null);
  
  // DNS configuration
  const [dnsConfig, setDnsConfig] = useState<DnsConfiguration | null>(null);
  
  // Bridge mode
  const [bridgeModeEnabled, setBridgeModeEnabled] = useState(false);
  const [canToggleBridge, setCanToggleBridge] = useState(true);

  useEffect(() => {
    loadNetworkConfiguration();
  }, []);

  const loadNetworkConfiguration = async () => {
    setIsLoading(true);
    try {
      // Load all network configurations
      const [dhcp, dns, bridgeStatus] = await Promise.all([
        networkService.getDhcpSettings(),
        networkService.getDnsSettings(),
        networkService.getBridgeModeStatus(),
      ]);
      
      setDhcpConfig(dhcp);
      setDnsConfig(dns);
      setBridgeModeEnabled(bridgeStatus.enabled);
      setCanToggleBridge(bridgeStatus.canToggle);
      
      if (isMockMode) {
        toast.info('Loaded mock network configuration');
      }
    } catch (error: any) {
      console.error('Error loading network configuration:', error);
      toast.error('Failed to load network settings');
      
      // Set default values if loading fails
      setDhcpConfig({
        enabled: true,
        startAddress: '10.0.0.100',
        endAddress: '10.0.0.250',
        leaseTime: 1440,
        subnet: '255.255.255.0',
        gateway: '10.0.0.1',
      });
      
      setDnsConfig({
        primaryDns: '8.8.8.8',
        secondaryDns: '8.8.4.4',
        useDhcpDns: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDhcp = async () => {
    if (!dhcpConfig) return;
    
    // Validate DHCP configuration
    if (!validateIpAddress(dhcpConfig.startAddress) || !validateIpAddress(dhcpConfig.endAddress)) {
      toast.error('Please enter valid IP addresses');
      return;
    }
    
    if (!validateIpAddress(dhcpConfig.gateway) || !validateIpAddress(dhcpConfig.subnet)) {
      toast.error('Please enter valid gateway and subnet mask');
      return;
    }
    
    setIsSaving(true);
    try {
      const success = await networkService.setDhcpSettings(dhcpConfig);
      if (success) {
        toast.success('DHCP settings saved successfully');
        await loadNetworkConfiguration();
      } else {
        toast.error('Failed to save DHCP settings');
      }
    } catch (error: any) {
      console.error('Error saving DHCP configuration:', error);
      toast.error(error.message || 'Failed to save DHCP settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDns = async () => {
    if (!dnsConfig) return;
    
    // Validate DNS configuration
    if (!dnsConfig.useDhcpDns) {
      if (!validateIpAddress(dnsConfig.primaryDns)) {
        toast.error('Please enter a valid primary DNS address');
        return;
      }
      
      if (dnsConfig.secondaryDns && !validateIpAddress(dnsConfig.secondaryDns)) {
        toast.error('Please enter a valid secondary DNS address');
        return;
      }
    }
    
    setIsSaving(true);
    try {
      const success = await networkService.setDnsSettings(dnsConfig);
      if (success) {
        toast.success('DNS settings saved successfully');
        await loadNetworkConfiguration();
      } else {
        toast.error('Failed to save DNS settings');
      }
    } catch (error: any) {
      console.error('Error saving DNS configuration:', error);
      toast.error(error.message || 'Failed to save DNS settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBridgeMode = async () => {
    if (!canToggleBridge) {
      toast.error('Bridge mode cannot be toggled at this time');
      return;
    }
    
    const message = bridgeModeEnabled
      ? 'Disabling bridge mode will re-enable router features including Wi-Fi and DHCP. The router will restart.'
      : 'Enabling bridge mode will disable most router features including Wi-Fi and DHCP. Your router will act as a modem only. The router will restart.';
    
    Alert.alert(
      bridgeModeEnabled ? 'Disable Bridge Mode?' : 'Enable Bridge Mode?',
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          style: bridgeModeEnabled ? 'default' : 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              const success = await networkService.setBridgeMode(!bridgeModeEnabled);
              if (success) {
                toast.success(`Bridge mode ${!bridgeModeEnabled ? 'enabled' : 'disabled'}. Router will restart...`);
                // Note: Router will restart, so connection will be lost
                setTimeout(() => {
                  Alert.alert(
                    'Router Restarting',
                    'The router is restarting to apply bridge mode changes. This may take 2-3 minutes.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                  );
                }, 1000);
              } else {
                toast.error('Failed to change bridge mode');
              }
            } catch (error: any) {
              console.error('Error toggling bridge mode:', error);
              toast.error(error.message || 'Failed to change bridge mode');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const validateIpAddress = (ip: string): boolean => {
    const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (!ipRegex.test(ip)) return false;
    
    const octets = ip.split('.').map(Number);
    return octets.every(octet => octet >= 0 && octet <= 255);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Network Configuration</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0261C2" />
          <Text style={styles.loadingText}>Loading network settings...</Text>
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
        <Text style={styles.title}>Network Configuration</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Tab Selector */}
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'dhcp' && styles.activeTab]}
            onPress={() => setActiveTab('dhcp')}
          >
            <Text style={[styles.tabText, activeTab === 'dhcp' && styles.activeTabText]}>
              DHCP
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'dns' && styles.activeTab]}
            onPress={() => setActiveTab('dns')}
          >
            <Text style={[styles.tabText, activeTab === 'dns' && styles.activeTabText]}>
              DNS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'bridge' && styles.activeTab]}
            onPress={() => setActiveTab('bridge')}
          >
            <Text style={[styles.tabText, activeTab === 'bridge' && styles.activeTabText]}>
              Bridge Mode
            </Text>
          </TouchableOpacity>
        </View>

        {/* DHCP Configuration */}
        {activeTab === 'dhcp' && dhcpConfig && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>DHCP Server Settings</Text>
              
              <CustomToggle
                value={dhcpConfig.enabled}
                onValueChange={(value) => setDhcpConfig({ ...dhcpConfig, enabled: value })}
                label="Enable DHCP Server"
                description="Automatically assign IP addresses to devices"
              />
              
              {dhcpConfig.enabled && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Start IP Address</Text>
                    <TextInput
                      style={styles.input}
                      value={dhcpConfig.startAddress}
                      onChangeText={(text) => setDhcpConfig({ ...dhcpConfig, startAddress: text })}
                      placeholder="10.0.0.100"
                      keyboardType="numeric"
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>End IP Address</Text>
                    <TextInput
                      style={styles.input}
                      value={dhcpConfig.endAddress}
                      onChangeText={(text) => setDhcpConfig({ ...dhcpConfig, endAddress: text })}
                      placeholder="10.0.0.250"
                      keyboardType="numeric"
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Lease Time (minutes)</Text>
                    <TextInput
                      style={styles.input}
                      value={dhcpConfig.leaseTime.toString()}
                      onChangeText={(text) => setDhcpConfig({ ...dhcpConfig, leaseTime: parseInt(text) || 1440 })}
                      placeholder="1440"
                      keyboardType="numeric"
                    />
                    <Text style={styles.helperText}>
                      Default: 1440 minutes (24 hours)
                    </Text>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Gateway IP</Text>
                    <TextInput
                      style={styles.input}
                      value={dhcpConfig.gateway}
                      onChangeText={(text) => setDhcpConfig({ ...dhcpConfig, gateway: text })}
                      placeholder="10.0.0.1"
                      keyboardType="numeric"
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Subnet Mask</Text>
                    <TextInput
                      style={styles.input}
                      value={dhcpConfig.subnet}
                      onChangeText={(text) => setDhcpConfig({ ...dhcpConfig, subnet: text })}
                      placeholder="255.255.255.0"
                      keyboardType="numeric"
                    />
                  </View>
                </>
              )}
              
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.disabledButton]}
                onPress={handleSaveDhcp}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={18} color="white" />
                    <Text style={styles.saveButtonText}>Save DHCP Settings</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            {!dhcpConfig.enabled && (
              <View style={styles.infoBox}>
                <MaterialIcons name="info" size={20} color="#FF6B6B" />
                <Text style={styles.warningText}>
                  Disabling DHCP requires devices to have static IP addresses configured. This is useful for advanced network setups like Pi-hole.
                </Text>
              </View>
            )}
          </>
        )}

        {/* DNS Configuration */}
        {activeTab === 'dns' && dnsConfig && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>DNS Server Settings</Text>
            
            <CustomToggle
              value={dnsConfig.useDhcpDns}
              onValueChange={(value) => setDnsConfig({ ...dnsConfig, useDhcpDns: value })}
              label="Use ISP DNS Servers"
              description="Automatically use DNS servers provided by your ISP"
            />
            
            {!dnsConfig.useDhcpDns && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Primary DNS Server</Text>
                  <TextInput
                    style={styles.input}
                    value={dnsConfig.primaryDns}
                    onChangeText={(text) => setDnsConfig({ ...dnsConfig, primaryDns: text })}
                    placeholder="8.8.8.8"
                    keyboardType="numeric"
                  />
                  <Text style={styles.helperText}>
                    Google DNS: 8.8.8.8, Cloudflare: 1.1.1.1
                  </Text>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Secondary DNS Server</Text>
                  <TextInput
                    style={styles.input}
                    value={dnsConfig.secondaryDns}
                    onChangeText={(text) => setDnsConfig({ ...dnsConfig, secondaryDns: text })}
                    placeholder="8.8.4.4"
                    keyboardType="numeric"
                  />
                  <Text style={styles.helperText}>
                    Google DNS: 8.8.4.4, Cloudflare: 1.0.0.1
                  </Text>
                </View>
              </>
            )}
            
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.disabledButton]}
              onPress={handleSaveDns}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialIcons name="save" size={18} color="white" />
                  <Text style={styles.saveButtonText}>Save DNS Settings</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Bridge Mode */}
        {activeTab === 'bridge' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bridge Mode Configuration</Text>
              
              <View style={styles.bridgeModeStatus}>
                <MaterialIcons 
                  name={bridgeModeEnabled ? "check-circle" : "cancel"} 
                  size={48} 
                  color={bridgeModeEnabled ? "#4CAF50" : "#FF6B6B"} 
                />
                <Text style={styles.bridgeModeStatusText}>
                  Bridge Mode is {bridgeModeEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              
              <Text style={styles.bridgeModeDescription}>
                {bridgeModeEnabled
                  ? 'Your router is operating in bridge mode. Most router features are disabled.'
                  : 'Your router is operating in full router mode with all features enabled.'}
              </Text>
              
              <TouchableOpacity
                style={[
                  styles.bridgeModeButton,
                  !canToggleBridge && styles.disabledButton,
                  bridgeModeEnabled && styles.dangerButton,
                ]}
                onPress={handleToggleBridgeMode}
                disabled={!canToggleBridge || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <MaterialIcons 
                      name={bridgeModeEnabled ? "router" : "settings-input-hdmi"} 
                      size={18} 
                      color="white" 
                    />
                    <Text style={styles.saveButtonText}>
                      {bridgeModeEnabled ? 'Disable Bridge Mode' : 'Enable Bridge Mode'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.infoBox}>
              <MaterialIcons name="warning" size={20} color="#FF6B6B" />
              <Text style={styles.warningText}>
                {bridgeModeEnabled
                  ? 'To access router settings while in bridge mode, connect directly to 192.168.100.1'
                  : 'Enabling bridge mode will disable Wi-Fi, DHCP, and routing features. Use this only if you have another router.'}
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
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0261C2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    margin: 16,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#856404',
  },
  bridgeModeStatus: {
    alignItems: 'center',
    marginVertical: 16,
  },
  bridgeModeStatusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#333',
  },
  bridgeModeDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  bridgeModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  dangerButton: {
    backgroundColor: '#FF6B6B',
  },
});
