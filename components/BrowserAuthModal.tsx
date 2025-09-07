import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking
} from 'react-native';
import { BrowserAuthService, AuthResult } from '../services/BrowserAuthService';

interface BrowserAuthModalProps {
  visible: boolean;
  routerIP: string;
  onClose: () => void;
  onAuthSuccess: (token: any) => void;
  onAuthFailed: (error: string) => void;
}

export const BrowserAuthModal: React.FC<BrowserAuthModalProps> = ({
  visible,
  routerIP,
  onClose,
  onAuthSuccess,
  onAuthFailed
}) => {
  const [step, setStep] = useState<'instructions' | 'manual' | 'auto' | 'success'>('instructions');
  const [isLoading, setIsLoading] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);

  useEffect(() => {
    if (visible) {
      setStep('instructions');
      setManualToken('');
      setAuthResult(null);
    }
  }, [visible]);

  const handleOpenBrowser = async () => {
    try {
      setIsLoading(true);
      await BrowserAuthService.openRouterLogin(routerIP);
      setStep('manual');
    } catch (error: any) {
      Alert.alert('Error', `Failed to open browser: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoExtraction = async () => {
    setIsLoading(true);
    setStep('auto');
    
    try {
      const result = await BrowserAuthService.attemptTokenExtraction(routerIP, 'admin', '');
      setAuthResult(result);
      
      if (result.success && result.token) {
        await BrowserAuthService.saveAuthToken(result.token);
        setStep('success');
        onAuthSuccess(result.token);
      } else {
        Alert.alert(
          'Auto-extraction Failed',
          result.message + '\n\nPlease try manual token entry.',
          [{ text: 'OK', onPress: () => setStep('manual') }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', `Auto-extraction failed: ${error.message}`);
      setStep('manual');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualTokenSubmit = async () => {
    if (!manualToken.trim()) {
      Alert.alert('Error', 'Please enter a valid token');
      return;
    }

    setIsLoading(true);
    try {
      const result = await BrowserAuthService.setManualToken(manualToken, routerIP);
      setAuthResult(result);
      
      if (result.success && result.token) {
        setStep('success');
        onAuthSuccess(result.token);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to save token: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderInstructions = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.title}>🌐 Browser Authentication</Text>
      <Text style={styles.subtitle}>Router: {routerIP}</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Instructions:</Text>
        <Text style={styles.instruction}>
          1. Click "Open Router Login" to open your router's web interface
        </Text>
        <Text style={styles.instruction}>
          2. Log in with your router credentials (usually admin/password)
        </Text>
        <Text style={styles.instruction}>
          3. Once logged in, return to this app
        </Text>
        <Text style={styles.instruction}>
          4. Try automatic token extraction or enter token manually
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]}
          onPress={handleOpenBrowser}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>🌐 Open Router Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={handleAutoExtraction}
        >
          <Text style={styles.secondaryButtonText}>🔄 Try Auto-Extract Token</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setStep('manual')}
        >
          <Text style={styles.secondaryButtonText}>✏️ Enter Token Manually</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderManualEntry = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.title}>✏️ Manual Token Entry</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔍 How to find your token:</Text>
        <Text style={styles.instruction}>
          1. Open browser developer tools (F12)
        </Text>
        <Text style={styles.instruction}>
          2. Go to Network tab and refresh the router page
        </Text>
        <Text style={styles.instruction}>
          3. Look for requests with authentication headers
        </Text>
        <Text style={styles.instruction}>
          4. Copy the token value and paste below
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Authentication Token:</Text>
        <TextInput
          style={styles.textInput}
          value={manualToken}
          onChangeText={setManualToken}
          placeholder="Paste your authentication token here..."
          multiline
          numberOfLines={3}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]}
          onPress={handleManualTokenSubmit}
          disabled={isLoading || !manualToken.trim()}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>💾 Save Token</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setStep('instructions')}
        >
          <Text style={styles.secondaryButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderAutoExtraction = () => (
    <View style={styles.content}>
      <Text style={styles.title}>🔄 Auto-Extracting Token</Text>
      
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0261C2" />
        <Text style={styles.loadingText}>
          Attempting to extract authentication token...
        </Text>
      </View>

      {authResult && !authResult.success && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {authResult.message}</Text>
        </View>
      )}
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.content}>
      <Text style={styles.title}>✅ Authentication Successful!</Text>
      
      <View style={styles.successContainer}>
        <Text style={styles.successText}>
          🎉 Authentication token has been saved successfully!
        </Text>
        <Text style={styles.successSubtext}>
          You can now use all router features in the app.
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, styles.primaryButton]}
        onPress={onClose}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    switch (step) {
      case 'instructions':
        return renderInstructions();
      case 'manual':
        return renderManualEntry();
      case 'auto':
        return renderAutoExtraction();
      case 'success':
        return renderSuccess();
      default:
        return renderInstructions();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        {renderContent()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0261C2',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    paddingLeft: 8,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#0261C2',
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 40,
  },
  successText: {
    fontSize: 18,
    color: '#2e7d32',
    textAlign: 'center',
    marginBottom: 12,
  },
  successSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default BrowserAuthModal;
