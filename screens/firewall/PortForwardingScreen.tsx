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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { Picker } from '@react-native-picker/picker';
import { 
  firewallService, 
  PortForwardingRule, 
  Protocol,
  FirewallConfiguration,
  FirewallLevel 
} from '../../services/network/FirewallService';
import { useMockMode } from '../../contexts/MockModeContext';
import { CustomToggle } from '../../components/CustomToggle';

export default function PortForwardingScreen() {
  const navigation = useNavigation();
  const { isMockMode } = useMockMode();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'firewall' | 'upnp'>('rules');
  
  // Port forwarding
  const [portRules, setPortRules] = useState<PortForwardingRule[]>([]);
  const [showAddRule, setShowAddRule] = useState(false);
  const [editingRule, setEditingRule] = useState<PortForwardingRule | null>(null);
  
  // New rule form
  const [newRule, setNewRule] = useState<Partial<PortForwardingRule>>({
    serviceName: '',
    externalPort: 0,
    internalPort: 0,
    internalIp: '',
    protocol: 'TCP',
    enabled: true,
  });
  
  // Firewall settings
  const [firewallConfig, setFirewallConfig] = useState<FirewallConfiguration | null>(null);
  
  // UPnP
  const [upnpEnabled, setUpnpEnabled] = useState(false);
  const [upnpDevices, setUpnpDevices] = useState<any[]>([]);

  useEffect(() => {
    loadFirewallConfiguration();
  }, []);

  const loadFirewallConfiguration = async () => {
    setIsLoading(true);
    try {
      const [rules, firewall, upnp] = await Promise.all([
        firewallService.getPortForwardingRules(),
        firewallService.getFirewallSettings(),
        firewallService.isUpnpEnabled(),
      ]);
      
      setPortRules(rules);
      setFirewallConfig(firewall);
      setUpnpEnabled(upnp);
      
      if (upnp) {
        // Load UPnP devices if enabled
        const devices = await firewallService.getUpnpDevices();
        setUpnpDevices(devices);
      }
      
      
    } catch (error: any) {
      console.error('Error loading firewall configuration:', error);
      if (error.message.includes('Xfinity mobile app')) {
        Alert.alert(
          'Port Forwarding Restricted',
          'Port forwarding must be configured through the Xfinity mobile app. This app can use UPnP as a workaround.',
          [
            { text: 'OK' },
            { 
              text: 'Enable UPnP', 
              onPress: async () => {
                await handleToggleUpnp(true);
              }
            }
          ]
        );
      } else {
        toast.error('Failed to load firewall settings');
      }
      
      // Set default values
      setFirewallConfig({
        level: 'Typical',
        enablePingBlock: false,
        enableIpv6Firewall: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (!validateRule(newRule)) return;
    
    setIsSaving(true);
    try {
      const rule: PortForwardingRule = {
        id: `rule_${Date.now()}`,
        serviceName: newRule.serviceName!,
        externalPort: newRule.externalPort!,
        internalPort: newRule.internalPort!,
        internalIp: newRule.internalIp!,
        protocol: newRule.protocol!,
        enabled: newRule.enabled!,
      };
      
      const success = await firewallService.addPortForwardingRule(rule);
      if (success) {
        toast.success('Port forwarding rule added successfully');
        setShowAddRule(false);
        setNewRule({
          serviceName: '',
          externalPort: 0,
          internalPort: 0,
          internalIp: '',
          protocol: 'TCP',
          enabled: true,
        });
        await loadFirewallConfiguration();
      } else {
        toast.error('Failed to add port forwarding rule');
      }
    } catch (error: any) {
      console.error('Error adding port forwarding rule:', error);
      toast.error(error.message || 'Failed to add port forwarding rule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule || !validateRule(editingRule)) return;
    
    setIsSaving(true);
    try {
      const success = await firewallService.updatePortForwardingRule(editingRule);
      if (success) {
        toast.success('Port forwarding rule updated successfully');
        setEditingRule(null);
        await loadFirewallConfiguration();
      } else {
        toast.error('Failed to update port forwarding rule');
      }
    } catch (error: any) {
      console.error('Error updating port forwarding rule:', error);
      toast.error(error.message || 'Failed to update port forwarding rule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    Alert.alert(
      'Delete Rule',
      'Are you sure you want to delete this port forwarding rule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await firewallService.removePortForwardingRule(ruleId);
              if (success) {
                toast.success('Port forwarding rule deleted');
                await loadFirewallConfiguration();
              } else {
                toast.error('Failed to delete rule');
              }
            } catch (error) {
              toast.error('Failed to delete rule');
            }
          },
        },
      ]
    );
  };

  const handleSaveFirewall = async () => {
    if (!firewallConfig) return;
    
    setIsSaving(true);
    try {
      const success = await firewallService.setFirewallSettings(firewallConfig);
      if (success) {
        toast.success('Firewall settings saved successfully');
        await loadFirewallConfiguration();
      } else {
        toast.error('Failed to save firewall settings');
      }
    } catch (error: any) {
      console.error('Error saving firewall settings:', error);
      toast.error(error.message || 'Failed to save firewall settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleUpnp = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      const success = await firewallService.setUpnpEnabled(enabled);
      if (success) {
        setUpnpEnabled(enabled);
        toast.success(`UPnP ${enabled ? 'enabled' : 'disabled'} successfully`);
        if (enabled) {
          // Reload to get UPnP devices
          await loadFirewallConfiguration();
        } else {
          setUpnpDevices([]);
        }
      } else {
        toast.error('Failed to change UPnP settings');
      }
    } catch (error: any) {
      console.error('Error toggling UPnP:', error);
      toast.error(error.message || 'Failed to change UPnP settings');
    } finally {
      setIsSaving(false);
    }
  };

  const validateRule = (rule: Partial<PortForwardingRule>): boolean => {
    if (!rule.serviceName || rule.serviceName.trim().length === 0) {
      toast.error('Please enter a service name');
      return false;
    }
    
    if (!rule.externalPort || rule.externalPort < 1 || rule.externalPort > 65535) {
      toast.error('External port must be between 1 and 65535');
      return false;
    }
    
    if (!rule.internalPort || rule.internalPort < 1 || rule.internalPort > 65535) {
      toast.error('Internal port must be between 1 and 65535');
      return false;
    }
    
    if (!validateIpAddress(rule.internalIp || '')) {
      toast.error('Please enter a valid internal IP address');
      return false;
    }
    
    return true;
  };

  const validateIpAddress = (ip: string): boolean => {
    const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (!ipRegex.test(ip)) return false;
    
    const octets = ip.split('.').map(Number);
    return octets.every(octet => octet >= 0 && octet <= 255);
  };

  const renderPortRule = ({ item }: { item: PortForwardingRule }) => (
    <View style={styles.ruleCard}>
      <View style={styles.ruleHeader}>
        <Text style={styles.ruleName}>{item.serviceName}</Text>
        <CustomToggle
          value={item.enabled}
          onValueChange={async (value) => {
            const updatedRule = { ...item, enabled: value ?? false };
            setPortRules(rules => rules.map(r => r.id === item.id ? updatedRule : r));
            await firewallService.updatePortForwardingRule(updatedRule);
          }}
          small
        />
      </View>
      <View style={styles.ruleDetails}>
        <Text style={styles.ruleText}>
          External: {item.externalPort} → Internal: {item.internalIp}:{item.internalPort}
        </Text>
        <Text style={styles.ruleProtocol}>Protocol: {item.protocol}</Text>
      </View>
      <View style={styles.ruleActions}>
        <TouchableOpacity
          style={styles.ruleActionButton}
          onPress={() => setEditingRule(item)}
        >
          <MaterialIcons name="edit" size={20} color="#0261C2" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ruleActionButton}
          onPress={() => handleDeleteRule(item.id)}
        >
          <MaterialIcons name="delete" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Port Forwarding & Firewall</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0261C2" />
          <Text style={styles.loadingText}>Loading firewall settings...</Text>
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
        <Text style={styles.title}>Port Forwarding & Firewall</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Tab Selector */}
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rules' && styles.activeTab]}
            onPress={() => setActiveTab('rules')}
          >
            <Text style={[styles.tabText, activeTab === 'rules' && styles.activeTabText]}>
              Port Rules
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'firewall' && styles.activeTab]}
            onPress={() => setActiveTab('firewall')}
          >
            <Text style={[styles.tabText, activeTab === 'firewall' && styles.activeTabText]}>
              Firewall
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upnp' && styles.activeTab]}
            onPress={() => setActiveTab('upnp')}
          >
            <Text style={[styles.tabText, activeTab === 'upnp' && styles.activeTabText]}>
              UPnP
            </Text>
          </TouchableOpacity>
        </View>

        {/* Port Forwarding Rules */}
        {activeTab === 'rules' && (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Port Forwarding Rules</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowAddRule(true)}
                >
                  <MaterialIcons name="add" size={24} color="#0261C2" />
                </TouchableOpacity>
              </View>
              
              {portRules.length === 0 ? (
                <Text style={styles.emptyText}>No port forwarding rules configured</Text>
              ) : (
                <FlatList
                  data={portRules}
                  renderItem={renderPortRule}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              )}
            </View>

            {/* Add/Edit Rule Form */}
            {(showAddRule || editingRule) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {editingRule ? 'Edit Port Forwarding Rule' : 'Add Port Forwarding Rule'}
                </Text>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Service Name</Text>
                  <TextInput
                    style={styles.input}
                    value={editingRule ? editingRule.serviceName : newRule.serviceName}
                    onChangeText={(text) => {
                      if (editingRule) {
                        setEditingRule({ ...editingRule, serviceName: text });
                      } else {
                        setNewRule({ ...newRule, serviceName: text });
                      }
                    }}
                    placeholder="e.g., Web Server, Game Server"
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>External Port</Text>
                  <TextInput
                    style={styles.input}
                    value={String(editingRule ? editingRule.externalPort : newRule.externalPort || '')}
                    onChangeText={(text) => {
                      const port = parseInt(text) || 0;
                      if (editingRule) {
                        setEditingRule({ ...editingRule, externalPort: port });
                      } else {
                        setNewRule({ ...newRule, externalPort: port });
                      }
                    }}
                    placeholder="1-65535"
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Internal IP Address</Text>
                  <TextInput
                    style={styles.input}
                    value={editingRule ? editingRule.internalIp : newRule.internalIp}
                    onChangeText={(text) => {
                      if (editingRule) {
                        setEditingRule({ ...editingRule, internalIp: text });
                      } else {
                        setNewRule({ ...newRule, internalIp: text });
                      }
                    }}
                    placeholder="e.g., 10.0.0.100"
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Internal Port</Text>
                  <TextInput
                    style={styles.input}
                    value={String(editingRule ? editingRule.internalPort : newRule.internalPort || '')}
                    onChangeText={(text) => {
                      const port = parseInt(text) || 0;
                      if (editingRule) {
                        setEditingRule({ ...editingRule, internalPort: port });
                      } else {
                        setNewRule({ ...newRule, internalPort: port });
                      }
                    }}
                    placeholder="1-65535"
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Protocol</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editingRule ? editingRule.protocol : newRule.protocol}
                      onValueChange={(value: Protocol) => {
                        if (editingRule) {
                          setEditingRule({ ...editingRule, protocol: value });
                        } else {
                          setNewRule({ ...newRule, protocol: value });
                        }
                      }}
                    >
                      <Picker.Item label="TCP" value="TCP" />
                      <Picker.Item label="UDP" value="UDP" />
                      <Picker.Item label="Both" value="Both" />
                    </Picker>
                  </View>
                </View>
                
                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.formButton, styles.cancelButton]}
                    onPress={() => {
                      setShowAddRule(false);
                      setEditingRule(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.formButton, styles.saveButton, isSaving && styles.disabledButton]}
                    onPress={editingRule ? handleUpdateRule : handleAddRule}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        {editingRule ? 'Update' : 'Add'} Rule
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {/* Firewall Settings */}
        {activeTab === 'firewall' && firewallConfig && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Firewall Settings</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Security Level</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={firewallConfig.level}
                  onValueChange={(value: FirewallLevel) => 
                    setFirewallConfig({ ...firewallConfig, level: value })
                  }
                >
                  <Picker.Item label="Low - Minimal protection" value="Low" />
                  <Picker.Item label="Typical - Recommended" value="Typical" />
                  <Picker.Item label="High - Maximum protection" value="High" />
                  <Picker.Item label="Custom - Advanced settings" value="Custom" />
                </Picker>
              </View>
              <Text style={styles.helperText}>
                {firewallConfig.level === 'Low' && 'Allows most inbound connections. Use with caution.'}
                {firewallConfig.level === 'Typical' && 'Blocks most unsolicited inbound connections.'}
                {firewallConfig.level === 'High' && 'Blocks all unsolicited inbound connections including ICMP.'}
                {firewallConfig.level === 'Custom' && 'Configure advanced firewall rules manually.'}
              </Text>
            </View>
            
            <CustomToggle
              value={firewallConfig.enablePingBlock}
              onValueChange={(value) => 
                setFirewallConfig({ ...firewallConfig, enablePingBlock: value ?? false })
              }
              label="Block ICMP Ping"
              description="Prevent your router from responding to ping requests"
            />
            
            <CustomToggle
              value={firewallConfig.enableIpv6Firewall}
              onValueChange={(value) => 
                setFirewallConfig({ ...firewallConfig, enableIpv6Firewall: value ?? false })
              }
              label="Enable IPv6 Firewall"
              description="Apply firewall rules to IPv6 traffic"
            />
            
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.disabledButton]}
              onPress={handleSaveFirewall}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialIcons name="save" size={18} color="white" />
                  <Text style={styles.saveButtonText}>Save Firewall Settings</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* UPnP Settings */}
        {activeTab === 'upnp' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>UPnP Settings</Text>
              
              <CustomToggle
                value={upnpEnabled}
                onValueChange={handleToggleUpnp}
                label="Enable UPnP"
                description="Allow devices to automatically configure port forwarding"
                disabled={isSaving}
              />
              
              {upnpEnabled && (
                <>
                  <Text style={styles.sectionTitle}>UPnP Devices</Text>
                  {upnpDevices.length === 0 ? (
                    <Text style={styles.emptyText}>No UPnP devices found</Text>
                  ) : (
                    upnpDevices.map((device, index) => (
                      <View key={index} style={styles.upnpDevice}>
                        <Text style={styles.upnpDeviceName}>{device.name}</Text>
                        <Text style={styles.upnpDeviceInfo}>
                          IP: {device.ip} | MAC: {device.mac}
                        </Text>
                        {device.mappings.length > 0 && (
                          <Text style={styles.upnpMappings}>
                            {device.mappings.length} port mapping(s)
                          </Text>
                        )}
                      </View>
                    ))
                  )}
                </>
              )}
            </View>
            
            <View style={styles.infoBox}>
              <MaterialIcons name="info" size={20} color="#0261C2" />
              <Text style={styles.infoText}>
                UPnP allows devices like game consoles and media servers to automatically open ports. 
                This is convenient but may pose security risks if untrusted devices are on your network.
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0261C2',
  },
  addButton: {
    padding: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  ruleCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  ruleDetails: {
    marginBottom: 8,
  },
  ruleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  ruleProtocol: {
    fontSize: 12,
    color: '#888',
  },
  ruleActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  ruleActionButton: {
    padding: 8,
    marginLeft: 8,
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
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  formButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#0261C2',
    marginLeft: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
    color: '#333',
  },
  upnpDevice: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  upnpDeviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  upnpDeviceInfo: {
    fontSize: 14,
    color: '#666',
  },
  upnpMappings: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
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
