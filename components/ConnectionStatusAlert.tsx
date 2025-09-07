import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { RouterConnectionService } from '../services/RouterConnectionService';

interface ConnectionStatusAlertProps {
  onStatusChange?: (status: any) => void;
}

export const ConnectionStatusAlert: React.FC<ConnectionStatusAlertProps> = ({ onStatusChange }) => {
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    setIsLoading(true);
    try {
      const status = await RouterConnectionService.getConnectionStatus();
      setConnectionStatus(status);
      onStatusChange?.(status);
    } catch (error) {
      console.error('Failed to check connection status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showDetailedInfo = () => {
    if (!connectionStatus) return;

    const title = connectionStatus.canConnect ? 'Connection Status' : 'Connection Issue';
    const message = `
Environment: ${connectionStatus.environment}
Mode: ${connectionStatus.mode.toUpperCase()}
${connectionStatus.routerIP ? `Router IP: ${connectionStatus.routerIP}` : ''}
Reason: ${connectionStatus.reason}

${connectionStatus.suggestions.length > 0 ? 'Suggestions:\n' + connectionStatus.suggestions.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') : ''}
    `.trim();

    Alert.alert(title, message, [
      { text: 'Retry', onPress: checkConnectionStatus },
      { text: 'OK' }
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Checking connection...</Text>
      </View>
    );
  }

  if (!connectionStatus) {
    return null;
  }

  const isConnected = connectionStatus.canConnect;
  const isMockMode = connectionStatus.mode === 'mock';

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        isConnected ? styles.connectedContainer : styles.disconnectedContainer
      ]}
      onPress={showDetailedInfo}
    >
      <View style={styles.statusRow}>
        <View style={[
          styles.statusIndicator, 
          isConnected ? styles.connectedIndicator : styles.disconnectedIndicator
        ]} />
        <Text style={[
          styles.statusText,
          isConnected ? styles.connectedText : styles.disconnectedText
        ]}>
          {isConnected ? 'Router Connected' : 'Using Mock Data'}
        </Text>
        <Text style={styles.detailsText}>Tap for details</Text>
      </View>
      
      {isMockMode && (
        <Text style={styles.mockModeText}>
          📱 Demo mode - using sample data
        </Text>
      )}
      
      {connectionStatus.routerIP && (
        <Text style={styles.ipText}>
          Router: {connectionStatus.routerIP}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  connectedContainer: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  disconnectedContainer: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connectedIndicator: {
    backgroundColor: '#4caf50',
  },
  disconnectedIndicator: {
    backgroundColor: '#ff9800',
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  connectedText: {
    color: '#2e7d32',
  },
  disconnectedText: {
    color: '#f57c00',
  },
  detailsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  mockModeText: {
    fontSize: 12,
    color: '#f57c00',
    marginTop: 2,
  },
  ipText: {
    fontSize: 12,
    color: '#2e7d32',
    marginTop: 2,
  },
});

export default ConnectionStatusAlert;
