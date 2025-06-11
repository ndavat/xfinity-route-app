import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { RouterConnectionService } from '../services/RouterConnectionService';

export function EnvironmentAlert() {
  const advice = RouterConnectionService.getConnectionAdvice();
  
  if (advice.canConnectToRouter) {
    return null; // Don't show anything if connection is possible
  }

  return (
    <View style={styles.alertContainer}>
      <MaterialIcons name="warning" size={24} color="#ff9800" />
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle}>Router Connection Limited</Text>
        <Text style={styles.alertMessage}>{advice.reason}</Text>
        <Text style={styles.solutionsTitle}>Solutions:</Text>
        {advice.solutions.map((solution, index) => (
          <Text key={index} style={styles.solutionText}>
            • {solution}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  alertContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    alignItems: 'flex-start',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f57c00',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  solutionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  solutionText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    lineHeight: 18,
  },
});
