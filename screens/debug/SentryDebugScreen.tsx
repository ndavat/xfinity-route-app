import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { Logger, error, info, warn } from '../../services';

const SentryDebugScreen = () => {
  const handleSendInfo = () => {
    info('This is an informational message from the debug screen.', {
      source: 'SentryDebugScreen',
      details: 'User clicked the "Send Info" button.',
    });
  };

  const handleSendWarning = () => {
    warn('This is a warning message.', {
      source: 'SentryDebugScreen',
      details: 'This is a test warning.',
    });
  };

  const handleSendError = () => {
    try {
      throw new Error('This is a test error from the debug screen.');
    } catch (e) {
      error('Caught a test error.', e, {
        source: 'SentryDebugScreen',
        recoveryAttempt: 'None',
      });
    }
  };

  const handleNativeCrash = () => {
    // This will cause a native crash to test Sentry's crash handling.
    const Sentry = require('@sentry/react-native');
    Sentry.nativeCrash();
  };

  const handleSetUser = () => {
    Logger.getInstance().setUser({
      id: '12345',
      email: 'test.user@example.com',
      username: 'testuser',
    });
    info('User has been set for Sentry reporting.');
  };

  return (
    <View style={styles.container}>
      <Button title="Send Info Log" onPress={handleSendInfo} />
      <Button title="Send Warning Log" onPress={handleSendWarning} />
      <Button title="Send Error Log" onPress={handleSendError} />
      <Button title="Trigger Native Crash" onPress={handleNativeCrash} />
      <Button title="Set User" onPress={handleSetUser} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default SentryDebugScreen;