import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, ScrollView, Alert, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { RouterConnectionService } from '../services/RouterConnectionService';
import { Device } from '../types/Device';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DeviceControlScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  useEffect(() => {
    // Check for valid device data immediately
    const params = route.params as { device?: Device };
    if (!params?.device?.mac || !params?.device?.ip) {
      console.error('Invalid or missing device data:', params?.device);
      toast.error('Error: Device information is incomplete');
      navigation.goBack();
      return;
    }
  }, []);

  // Get device data with proper type checking
  const params = route.params as { device?: Device };
  const device = params?.device || null;
  
  // Redirect if no device data
  if (!device) {
    return (
      <View style={styles.container}>
        <Text>Loading device information...</Text>
      </View>
    );
  }
  
  const [customName, setCustomName] = useState(device.customName || device.hostname || device.ip);
  const [isBlocked, setIsBlocked] = useState(Boolean(device.isBlocked));
  const [isSaving, setIsSaving] = useState(false);
  
  // Temporary block
  const [tempBlockDuration, setTempBlockDuration] = useState('60');
  const [isTemporaryBlock, setIsTemporaryBlock] = useState(false);
  
  // Schedule block
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 8 * 60 * 60 * 1000)); // 8 hours later
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Record<string, boolean>>({
    Monday: true,
    Tuesday: true,
    Wednesday: true,
    Thursday: true,
    Friday: true,
    Saturday: false,
    Sunday: false,
  });

  useEffect(() => {
    // You can fetch any additional device info here if needed
  }, [device.mac]);

  const saveCustomName = async () => {
    setIsSaving(true);
    try {
      const result = await RouterConnectionService.storeDeviceName(device.mac, customName);
      if (result) {
        toast.success('Device name updated');
      } else {
        toast.error('Failed to update name');
      }
    } catch (error) {
      console.error('Error saving device name:', error);
      toast.error('Error saving name');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleBlockDevice = async () => {
    setIsSaving(true);
    try {
      let result;
      
      if (!isBlocked) {
        if (isTemporaryBlock) {
          // Temporary block
          const durationMinutes = parseInt(tempBlockDuration, 10);
          result = await RouterConnectionService.blockDevice(device.mac, durationMinutes);
          toast.success(`Device blocked for ${tempBlockDuration} minutes`);
        } else {
          // Permanent block
          result = await RouterConnectionService.blockDevice(device.mac);
          toast.success('Device blocked');
        }
      } else {
        // Unblock
        result = await RouterConnectionService.unblockDevice(device.mac);
        toast.success('Device unblocked');
      }
      
      if (result) {
        setIsBlocked(!isBlocked);
      }
    } catch (error) {
      console.error('Error toggling block:', error);
      toast.error('Error updating block status');
    } finally {
      setIsSaving(false);
    }
  };

  const saveSchedule = async () => {
    setIsSaving(true);
    try {
      const formattedStartTime = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;
      const formattedEndTime = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
      
      const selectedDaysList = Object.keys(selectedDays).filter(day => selectedDays[day]);
      
      const result = await RouterConnectionService.scheduleDeviceBlock(
        device.mac, 
        formattedStartTime, 
        formattedEndTime, 
        selectedDaysList
      );
      
      if (result) {
        toast.success('Schedule saved');
      } else {
        toast.error('Failed to save schedule');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Error saving schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmBlockDevice = () => {
    Alert.alert(
      isBlocked ? 'Unblock Device' : 'Block Device',
      isBlocked 
        ? `Are you sure you want to unblock ${device.customName || device.hostname || 'this device'}?` 
        : `Are you sure you want to block ${device.customName || device.hostname || 'this device'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: toggleBlockDevice, style: 'destructive' },
      ]
    );
  };

  const formatTimeString = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const onChangeStartTime = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || startTime;
    setShowStartTimePicker(Platform.OS === 'ios');
    setStartTime(currentDate);
  };

  const onChangeEndTime = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || endTime;
    setShowEndTimePicker(Platform.OS === 'ios');
    setEndTime(currentDate);
  };

  const renderDaySelector = () => (
    <View style={styles.daysContainer}>
      {Object.keys(selectedDays).map((day) => (
        <TouchableOpacity
          key={day}
          style={[
            styles.dayButton,
            selectedDays[day] && styles.dayButtonSelected,
          ]}
          onPress={() => setSelectedDays({
            ...selectedDays,
            [day]: !selectedDays[day],
          })}
        >
          <Text 
            style={[
              styles.dayText,
              selectedDays[day] && styles.dayTextSelected,
            ]}
          >
            {day.substring(0, 3)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Redirect back if no device data
  useEffect(() => {
    const params = route.params as { device?: Device };
    if (!params?.device) {
      console.error('No device data provided to DeviceControlScreen');
      toast.error('Error: Device information not available');
      navigation.goBack();
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Device Control</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.deviceSummary}>
            <View style={styles.connectionTypeIndicator}>
              <MaterialIcons 
                name={device.connectionType === 'WiFi' ? 'wifi' : 'lan'} 
                size={24} 
                color={device.isBlocked ? '#999' : '#0261C2'} 
              />
            </View>
            <View style={styles.deviceDetails}>
              <Text style={styles.deviceName}>
                {device.customName || device.hostname || 'Unknown Device'}
              </Text>
              <Text style={styles.deviceMac}>{device.mac}</Text>
              <View style={styles.connectionDetails}>
                <Text style={styles.ipAddress}>{device.ip}</Text>
                <Text style={[styles.connectionBadge, device.connectionType === 'WiFi' ? styles.wifiBadge : styles.ethernetBadge]}>
                  {device.connectionType}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Device Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={customName}
              onChangeText={setCustomName}
              placeholder={device.hostname || "Enter custom name"}
              placeholderTextColor="#999"
            />
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={saveCustomName}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.blockHeader}>
            <Text style={styles.sectionTitle}>Access Control</Text>
            <View style={styles.blockStatus}>
              <Text style={isBlocked ? styles.blockedText : styles.allowedText}>
                {isBlocked ? 'Blocked' : 'Allowed'}
              </Text>
              <Switch
                value={isBlocked}
                onValueChange={() => confirmBlockDevice()}
                trackColor={{ false: '#ddd', true: '#ff8a80' }}
                thumbColor={isBlocked ? '#f44336' : '#43a047'}
              />
            </View>
          </View>
          
          {!isBlocked && (
            <View style={styles.blockOptionsContainer}>
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Temporary Block</Text>
                <Switch
                  value={isTemporaryBlock}
                  onValueChange={setIsTemporaryBlock}
                />
              </View>
              
              {isTemporaryBlock && (
                <View style={styles.durationContainer}>
                  <Text style={styles.durationLabel}>Duration (minutes):</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={tempBlockDuration}
                      onValueChange={(value) => setTempBlockDuration(value.toString())}
                      style={styles.picker}
                    >
                      <Picker.Item label="15 minutes" value="15" />
                      <Picker.Item label="30 minutes" value="30" />
                      <Picker.Item label="1 hour" value="60" />
                      <Picker.Item label="2 hours" value="120" />
                      <Picker.Item label="4 hours" value="240" />
                      <Picker.Item label="8 hours" value="480" />
                      <Picker.Item label="12 hours" value="720" />
                      <Picker.Item label="24 hours" value="1440" />
                    </Picker>
                  </View>
                </View>
              )}
            </View>
          )}
          
          <TouchableOpacity
            style={[
              styles.blockButton,
              isBlocked ? styles.unblockButton : styles.blockButtonColor,
            ]}
            onPress={confirmBlockDevice}
            disabled={isSaving}
          >
            <MaterialIcons
              name={isBlocked ? 'check-circle' : 'block'}
              size={18}
              color="white"
            />
            <Text style={styles.blockButtonText}>
              {isBlocked ? 'Unblock Device' : isTemporaryBlock ? `Block for ${tempBlockDuration} minutes` : 'Block Device'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.sectionTitle}>Schedule Access</Text>
            <Switch
              value={isScheduleEnabled}
              onValueChange={setIsScheduleEnabled}
            />
          </View>
          
          {isScheduleEnabled && (
            <>
              <View style={styles.scheduleOptions}>
                <Text style={styles.scheduleLabel}>Block from</Text>
                <TouchableOpacity 
                  style={styles.timeButton}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Text style={styles.timeText}>{formatTimeString(startTime)}</Text>
                  <MaterialIcons name="access-time" size={18} color="#0261C2" />
                </TouchableOpacity>
                
                <Text style={styles.scheduleLabel}>until</Text>
                <TouchableOpacity 
                  style={styles.timeButton}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Text style={styles.timeText}>{formatTimeString(endTime)}</Text>
                  <MaterialIcons name="access-time" size={18} color="#0261C2" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.daysLabel}>On these days:</Text>
              {renderDaySelector()}
              
              <TouchableOpacity
                style={[styles.saveScheduleButton, isSaving && styles.disabledButton]}
                onPress={saveSchedule}
                disabled={isSaving}
              >
                <MaterialIcons name="schedule" size={18} color="white" />
                <Text style={styles.saveScheduleText}>Save Schedule</Text>
              </TouchableOpacity>
            </>
          )}
          
          {showStartTimePicker && (
            <DateTimePicker
              value={startTime}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={onChangeStartTime}
            />
          )}
          
          {showEndTimePicker && (
            <DateTimePicker
              value={endTime}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={onChangeEndTime}
            />
          )}
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deviceSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionTypeIndicator: {
    backgroundColor: '#f0f0f0',
    borderRadius: 24,
    padding: 12,
    marginRight: 16,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  deviceMac: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  connectionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  ipAddress: {
    fontSize: 14,
    color: '#444',
  },
  connectionBadge: {
    fontSize: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  wifiBadge: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
  },
  ethernetBadge: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#0261C2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  blockStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blockedText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    marginRight: 8,
  },
  allowedText: {
    color: '#43a047',
    fontWeight: 'bold',
    marginRight: 8,
  },
  blockOptionsContainer: {
    marginVertical: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  optionLabel: {
    fontSize: 16,
  },
  durationContainer: {
    marginTop: 12,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  durationLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  picker: {
    height: 120,
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  blockButtonColor: {
    backgroundColor: '#D32F2F',
  },
  unblockButton: {
    backgroundColor: '#43a047',
  },
  blockButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scheduleOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  scheduleLabel: {
    fontSize: 16,
    marginRight: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  timeText: {
    fontSize: 16,
    marginRight: 8,
  },
  daysLabel: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    margin: 4,
  },
  dayButtonSelected: {
    backgroundColor: '#0261C2',
    borderColor: '#0261C2',
  },
  dayText: {
    fontSize: 14,
  },
  dayTextSelected: {
    color: 'white',
  },
  saveScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#0261C2',
  },
  saveScheduleText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
});