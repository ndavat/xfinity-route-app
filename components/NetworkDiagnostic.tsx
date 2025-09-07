import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { RouterConnectionService } from '../services/RouterConnectionService';

interface NetworkDiagnosticProps {
  onDiagnosisComplete?: (diagnosis: any) => void;
}

export const NetworkDiagnostic: React.FC<NetworkDiagnosticProps> = ({ onDiagnosisComplete }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastDiagnosis, setLastDiagnosis] = useState<any>(null);

  const runDiagnostic = async () => {
    setIsRunning(true);
    try {
      console.log('🔍 Running network diagnostic...');
      const diagnosis = await RouterConnectionService.diagnoseNetworkIssue();
      setLastDiagnosis(diagnosis);
      onDiagnosisComplete?.(diagnosis);
      
      // Show diagnosis in alert
      const message = `
Issue: ${diagnosis.issue}

${diagnosis.description}

Suggestions:
${diagnosis.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}
      `.trim();
      
      Alert.alert('Network Diagnostic Results', message, [
        { text: 'OK' }
      ]);
      
    } catch (error) {
      console.error('Diagnostic failed:', error);
      Alert.alert('Diagnostic Error', 'Failed to run network diagnostic. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, isRunning && styles.buttonDisabled]}
        onPress={runDiagnostic}
        disabled={isRunning}
      >
        <View style={styles.buttonContent}>
          {isRunning ? (
            <>
              <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
              <Text style={styles.buttonText}>Running Diagnostic...</Text>
            </>
          ) : (
            <>
              <Text style={styles.buttonIcon}>🔍</Text>
              <Text style={styles.buttonText}>Network Diagnostic</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
      
      {lastDiagnosis && (
        <View style={styles.lastResult}>
          <Text style={styles.lastResultTitle}>Last Diagnosis:</Text>
          <Text style={styles.lastResultText}>{lastDiagnosis.issue}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  spinner: {
    marginRight: 8,
  },
  lastResult: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  lastResultTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  lastResultText: {
    fontSize: 12,
    color: '#333',
  },
});

export default NetworkDiagnostic;
