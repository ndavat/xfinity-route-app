import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Share,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LogManager, LogEntry, LogLevel, LogManagerConfig } from '../services/LogManager';
import { toast } from 'sonner-native';

export default function LogViewerScreen() {
  const navigation = useNavigation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [config, setConfig] = useState<LogManagerConfig>(LogManager.getConfig());
  const [showSettings, setShowSettings] = useState(false);

  const levels: (LogLevel | 'all')[] = ['all', 'error', 'warn', 'info', 'debug'];

  useEffect(() => {
    loadLogs();
    loadConfig();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, selectedLevel, searchText]);

  const loadLogs = () => {
    const allLogs = LogManager.getLogs();
    setLogs(allLogs);
  };

  const loadConfig = () => {
    setConfig(LogManager.getConfig());
  };

  const filterLogs = () => {
    let filtered = logs;

    if (selectedLevel !== 'all') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(search) ||
        log.source?.toLowerCase().includes(search)
      );
    }

    setFilteredLogs(filtered);
  };

  const getLogColor = (level: LogLevel): string => {
    switch (level) {
      case 'error': return '#F44336';
      case 'warn': return '#FF9800';
      case 'info': return '#2196F3';
      case 'debug': return '#9E9E9E';
      default: return '#333';
    }
  };

  const getLogIcon = (level: LogLevel): string => {
    switch (level) {
      case 'error': return 'error';
      case 'warn': return 'warning';
      case 'info': return 'info';
      case 'debug': return 'bug-report';
      default: return 'info';
    }
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all logs? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await LogManager.clearLogs();
            loadLogs();
            toast.success('Logs cleared');
          },
        },
      ]
    );
  };

  const handleExportLogs = async () => {
    try {
      const logText = LogManager.exportLogs();
      
      if (Platform.OS === 'android') {
        await Share.share({
          message: logText,
          title: 'Application Logs',
        });
      } else {
        Alert.alert(
          'Export Logs',
          'Logs exported successfully',
          [{ text: 'OK' }]
        );
      }
      toast.success('Logs exported');
    } catch (error) {
      toast.error('Failed to export logs');
    }
  };

  const handleConfigChange = async (key: keyof LogManagerConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    await LogManager.saveConfig(newConfig);
    toast.success('Settings saved');
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleString();
  };

  const renderLogEntry = (log: LogEntry, index: number) => (
    <TouchableOpacity
      key={log.id}
      style={[styles.logEntry, index % 2 === 0 && styles.logEntryEven]}
      onPress={() => showLogDetails(log)}
    >
      <View style={styles.logHeader}>
        <View style={styles.logLevelContainer}>
          <MaterialIcons
            name={getLogIcon(log.level) as any}
            size={16}
            color={getLogColor(log.level)}
          />
          <Text style={[styles.logLevel, { color: getLogColor(log.level) }]}>
            {log.level.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.logTimestamp}>
          {formatTimestamp(log.timestamp)}
        </Text>
      </View>
      
      <Text style={styles.logMessage} numberOfLines={2}>
        {log.message}
      </Text>
      
      {log.source && (
        <Text style={styles.logSource} numberOfLines={1}>
          Source: {log.source}
        </Text>
      )}
    </TouchableOpacity>
  );

  const showLogDetails = (log: LogEntry) => {
    const details = [
      `Level: ${log.level.toUpperCase()}`,
      `Time: ${formatTimestamp(log.timestamp)}`,
      `Message: ${log.message}`,
      log.source ? `Source: ${log.source}` : null,
      log.data ? `Data: ${JSON.stringify(log.data, null, 2)}` : null,
    ].filter(Boolean).join('\n\n');

    Alert.alert('Log Details', details, [{ text: 'OK' }]);
  };

  const renderSettings = () => (
    <View style={styles.settingsContainer}>
      <Text style={styles.settingsTitle}>Log Settings</Text>
      
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Enable Logging</Text>
        <Switch
          value={config.enabled}
          onValueChange={(value) => handleConfigChange('enabled', value)}
        />
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Show Alerts</Text>
        <Switch
          value={config.showAlerts}
          onValueChange={(value) => handleConfigChange('showAlerts', value)}
        />
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Alert on Errors</Text>
        <Switch
          value={config.alertOnError}
          onValueChange={(value) => handleConfigChange('alertOnError', value)}
        />
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Alert on Warnings</Text>
        <Switch
          value={config.alertOnWarn}
          onValueChange={(value) => handleConfigChange('alertOnWarn', value)}
        />
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Persist Logs</Text>
        <Switch
          value={config.persistLogs}
          onValueChange={(value) => handleConfigChange('persistLogs', value)}
        />
      </View>

      <Text style={styles.settingDescription}>
        Max Logs: {config.maxLogs} | Level: {config.logLevel.toUpperCase()}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Application Logs</Text>
        <TouchableOpacity
          onPress={() => setShowSettings(!showSettings)}
          style={styles.settingsButton}
        >
          <MaterialIcons name="settings" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {showSettings && renderSettings()}

      {/* Controls */}
      <View style={styles.controls}>
        {/* Level Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.levelFilter}>
          {levels.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.levelButton,
                selectedLevel === level && styles.levelButtonActive
              ]}
              onPress={() => setSelectedLevel(level)}
            >
              <Text style={[
                styles.levelButtonText,
                selectedLevel === level && styles.levelButtonTextActive
              ]}>
                {level === 'all' ? 'All' : level.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search logs..."
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <MaterialIcons name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={loadLogs}>
          <MaterialIcons name="refresh" size={20} color="#2196F3" />
          <Text style={styles.actionButtonText}>Refresh</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleExportLogs}>
          <MaterialIcons name="share" size={20} color="#4CAF50" />
          <Text style={styles.actionButtonText}>Export</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleClearLogs}>
          <MaterialIcons name="delete" size={20} color="#F44336" />
          <Text style={styles.actionButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Logs List */}
      <ScrollView style={styles.logsList}>
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log, index) => renderLogEntry(log, index))
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="info" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>
              {logs.length === 0 ? 'No logs available' : 'No logs match your filter'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Showing {filteredLogs.length} of {logs.length} logs
        </Text>
      </View>
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
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    padding: 4,
  },
  settingsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 14,
    color: '#333',
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  controls: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  levelFilter: {
    marginBottom: 12,
  },
  levelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  levelButtonActive: {
    backgroundColor: '#2196F3',
  },
  levelButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  levelButtonTextActive: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  logsList: {
    flex: 1,
  },
  logEntry: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logEntryEven: {
    backgroundColor: '#fafafa',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logLevel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  logTimestamp: {
    fontSize: 11,
    color: '#666',
  },
  logMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  logSource: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  footer: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
  },
});
