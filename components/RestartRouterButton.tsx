import React, { useState } from 'react';
import { TouchableOpacity, Text, Alert, ActivityIndicator, StyleSheet, View } from 'react-native';
import { RouterService } from '../services/ServiceInterfaces';

interface Props {
  routerService: RouterService;
  style?: any;
}

export const RestartRouterButton: React.FC<Props> = ({ routerService, style }) => {
  const [isRestarting, setIsRestarting] = useState(false);

  const handleRestart = async () => {
    Alert.alert(
      'Restart Router',
      'This will restart your router and temporarily disconnect all devices. The router will be unavailable for approximately 2 minutes. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restart', 
          style: 'destructive',
          onPress: performRestart 
        }
      ]
    );
  };

  const performRestart = async () => {
    setIsRestarting(true);
    try {
      const result = await routerService.restartRouter();
      
      Alert.alert(
        result.success ? 'Success' : 'Error',
        result.message + (result.estimatedDowntime ? `\n\nEstimated downtime: ${result.estimatedDowntime} seconds` : ''),
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to restart router: ' + error.message);
    } finally {
      setIsRestarting(false);
    }
  };

  if (!routerService.isRestartSupported()) {
    return null;
  }

  return (
    <TouchableOpacity 
      style={[styles.restartButton, style]}
      onPress={handleRestart}
      disabled={isRestarting}
    >
      <View style={styles.buttonContent}>
        {isRestarting ? (
          <>
            <ActivityIndicator color="white" size="small" />
            <Text style={[styles.buttonText, styles.loadingText]}>Restarting...</Text>
          </>
        ) : (
          <Text style={styles.buttonText}>Restart Router</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  restartButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginLeft: 8,
  },
});
