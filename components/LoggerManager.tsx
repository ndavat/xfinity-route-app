/**
 * Logger Management Component
 * React component for configuring and monitoring the logger
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import Logger from '../services/logging/Logger';
import { LogLevel } from '../services/logging/LoggerTypes';

interface LoggerManagerProps {
  visible: boolean;
  onClose: () => void;
}

export const LoggerManager: React.FC<LoggerManagerProps> = ({ visible, onClose }) => {
  const [stats, setStats] = useState<any>(null);
  const [performanceAnalysis, setPerformanceAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [selectedLogLevel, setSelectedLogLevel] = useState<LogLevel>(LogLevel.INFO);

  useEffect(() => {
    if (visible) {
      loadLoggerStats();
    }
  }, [visible]);

  const loadLoggerStats = async () => {
    try {
      const logger = Logger.getInstance();
      const currentStats = logger.getStats();
      const analysis = logger.getPerformanceAnalysis();
      
      setStats(currentStats);
      setPerformanceAnalysis(analysis);
    } catch (error) {
      console.error('Failed to load logger stats:', error);
    }
  };

  const handleExportLogs = async () => {
    setLoading(true);
    try {
      const logger = Logger.getInstance();
      const exportPath = await logger.exportLogs({
        format: 'txt',
        includeMetadata: true,
        compress: false
      });
      
      Alert.alert(
        'Export Complete',
        `Logs exported to: ${exportPath}`,
        [
          { text: 'OK' },
          { 
            text: 'Share', 
            onPress: () => logger.shareCurrentLogFile().catch(console.error)
          }
        ]
      );
    } catch (error) {
      Alert.alert('Export Failed', `Failed to export logs: ${error}`);
    } finally {
      setLoading(false);
      setExportModalVisible(false);
    }
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear All Logs',
      'Are you sure you want to delete all log files? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const logger = Logger.getInstance();
              await logger.clearAllLogs();
              await loadLoggerStats();
              Alert.alert('Success', 'All logs have been cleared');
            } catch (error) {
              Alert.alert('Error', `Failed to clear logs: ${error}`);
            }
          }
        }
      ]
    );
  };

  const handleLogLevelChange = async (level: LogLevel) => {
    try {
      const logger = Logger.getInstance();
      await logger.setLogLevel(level);
      setSelectedLogLevel(level);
      await loadLoggerStats();
      Alert.alert('Success', `Log level changed to ${LogLevel[level]}`);
    } catch (error) {
      Alert.alert('Error', `Failed to change log level: ${error}`);
    }
  };

  const renderPerformanceScore = () => {
    if (!performanceAnalysis) return null;

    const { score } = performanceAnalysis;
    const getScoreColor = (score: number) => {
      if (score >= 80) return '#4CAF50';
      if (score >= 60) return '#FF9800';
      return '#F44336';
    };

    return (
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Performance Score</Text>
        <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>
          {score}/100
        </Text>
      </View>
    );
  };

  const renderStats = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Session ID:</Text>
          <Text style={styles.statValue}>{stats.sessionId}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Entries:</Text>
          <Text style={styles.statValue}>
            {stats.performance?.totalLogEntries?.toLocaleString() || 0}
          </Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Files Created:</Text>
          <Text style={styles.statValue}>
            {stats.performance?.filesCreated || 0}
          </Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Errors Logged:</Text>
          <Text style={styles.statValue}>
            {stats.performance?.errorsLogged || 0}
          </Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Buffer Size:</Text>
          <Text style={styles.statValue}>{stats.bufferSize || 0}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Storage Permission:</Text>
          <Text style={[
            styles.statValue,
            { color: stats.permissions?.storagePermission ? '#4CAF50' : '#F44336' }
          ]}>
            {stats.permissions?.storagePermission ? 'Granted' : 'Denied'}
          </Text>
        </View>
      </View>
    );
  };

  const renderPerformanceIssues = () => {
    if (!performanceAnalysis?.issues?.length) return null;

    return (
      <View style={styles.issuesContainer}>
        <Text style={styles.sectionTitle}>Performance Issues</Text>
        {performanceAnalysis.issues.map((issue: string, index: number) => (
          <Text key={index} style={styles.issueText}>• {issue}</Text>
        ))}
      </View>
    );
  };

  const renderRecommendations = () => {
    if (!performanceAnalysis?.recommendations?.length) return null;

    return (
      <View style={styles.recommendationsContainer}>
        <Text style={styles.sectionTitle}>Recommendations</Text>
        {performanceAnalysis.recommendations.map((rec: string, index: number) => (
          <Text key={index} style={styles.recommendationText}>• {rec}</Text>
        ))}
      </View>
    );
  };

  const renderLogLevelSelector = () => {
    const levels = [
      { label: 'Debug', value: LogLevel.DEBUG },
      { label: 'Info', value: LogLevel.INFO },
      { label: 'Warning', value: LogLevel.WARN },
      { label: 'Error', value: LogLevel.ERROR },
      { label: 'Fatal', value: LogLevel.FATAL }
    ];

    return (
      <View style={styles.logLevelContainer}>
        <Text style={styles.sectionTitle}>Log Level</Text>
        {levels.map((level) => (
          <TouchableOpacity
            key={level.value}
            style={[
              styles.logLevelOption,
              selectedLogLevel === level.value && styles.logLevelSelected
            ]}
            onPress={() => handleLogLevelChange(level.value)}
          >
            <Text style={[
              styles.logLevelText,
              selectedLogLevel === level.value && styles.logLevelTextSelected
            ]}>
              {level.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Logger Management</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {renderPerformanceScore()}
          {renderStats()}
          {renderLogLevelSelector()}
          {renderPerformanceIssues()}
          {renderRecommendations()}

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setExportModalVisible(true)}
            >
              <Text style={styles.actionButtonText}>Export Logs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={async () => {
                try {
                  const logger = Logger.getInstance();
                  await logger.shareCurrentLogFile();
                } catch (error) {
                  Alert.alert('Share Failed', `Failed to share logs: ${error}`);
                }
              }}
            >
              <Text style={styles.actionButtonText}>Share Current Log</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={handleClearLogs}
            >
              <Text style={styles.actionButtonText}>Clear All Logs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={loadLoggerStats}
            >
              <Text style={styles.actionButtonText}>Refresh Stats</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Export Modal */}
        <Modal
          visible={exportModalVisible}
          animationType="fade"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Export Logs</Text>
              <Text style={styles.modalText}>
                Export all log files to a single file for sharing or analysis.
              </Text>
              
              {loading ? (
                <ActivityIndicator size="large" color="#007AFF" />
              ) : (
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setExportModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleExportLogs}
                  >
                    <Text style={styles.confirmButtonText}>Export</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333'
  },
  closeButton: {
    padding: 8
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500'
  },
  content: {
    flex: 1,
    padding: 16
  },
  scoreContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold'
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'right'
  },
  logLevelContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  logLevelOption: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  logLevelSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3'
  },
  logLevelText: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center'
  },
  logLevelTextSelected: {
    color: '#2196F3',
    fontWeight: '500'
  },
  issuesContainer: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  issueText: {
    fontSize: 14,
    color: '#E65100',
    marginVertical: 2
  },
  recommendationsContainer: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50'
  },
  recommendationText: {
    fontSize: 14,
    color: '#2E7D32',
    marginVertical: 2
  },
  actionsContainer: {
    marginTop: 16
  },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center'
  },
  shareButton: {
    backgroundColor: '#34C759'
  },
  clearButton: {
    backgroundColor: '#FF3B30'
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    width: '80%',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333333'
  },
  modalText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666666',
    lineHeight: 20
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  confirmButton: {
    backgroundColor: '#007AFF'
  },
  cancelButtonText: {
    color: '#333333',
    fontWeight: '500'
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '500'
  }
});

export default LoggerManager;
