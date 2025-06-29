import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useMockMode } from '../contexts/MockModeContext';

export const MockModeIndicator: React.FC = () => {
  const { isMockMode } = useMockMode();

  if (!isMockMode) return null;

  return (
    <View style={styles.indicator}>
      <Text style={styles.indicatorText}>🧪 Mock Mode Active</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  indicator: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    margin: 16,
    alignItems: 'center',
  },
  indicatorText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '600',
  },
});
