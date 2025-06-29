import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';

interface MockModeContextType {
  isMockMode: boolean;
  toggleMockMode: () => Promise<void>;
  isLoading: boolean;
}

const MockModeContext = createContext<MockModeContextType | undefined>(undefined);

interface MockModeProviderProps {
  children: ReactNode;
}

export const MockModeProvider: React.FC<MockModeProviderProps> = ({ children }) => {
  const [isMockMode, setIsMockMode] = useState(true); // Default to Mock Mode for development
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMockModeState();
  }, []);

  const loadMockModeState = async () => {
    console.log('MockModeContext: Loading mock mode state...');
    try {
      const savedMode = await AsyncStorage.getItem('mockMode');
      console.log('MockModeContext: Saved mode from storage:', savedMode);
      
      // Default to Mock Mode if no saved preference, or use saved preference
      const shouldUseMockMode = savedMode === null ? true : savedMode === 'true';
      console.log('MockModeContext: Setting mode to:', shouldUseMockMode ? 'MOCK' : 'LIVE');
      
      setIsMockMode(shouldUseMockMode);
    } catch (error) {
      console.error('MockModeContext: Failed to load mock mode state:', error);
      // On error, default to Mock Mode for development
      console.log('MockModeContext: Defaulting to MOCK mode due to error');
      setIsMockMode(true);
    } finally {
      setIsLoading(false);
      console.log('MockModeContext: Loading complete');
    }
  };

  const toggleMockMode = async () => {
    console.log('MockMode: toggleMockMode called, current mode:', isMockMode);
    
    // Set loading state to prevent multiple toggles
    setIsLoading(true);
    
    try {
      const newMode = !isMockMode;
      console.log('MockMode: switching to mode:', newMode);
      
      // Show confirmation dialog first before making any changes
      Alert.alert(
        'Change Mode',
        `Switch to ${newMode ? 'Mock' : 'Live'} Mode? The app will reload to apply changes.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              console.log('MockMode: User cancelled mode change');
              setIsLoading(false);
            }
          },
          {
            text: 'Switch & Reload',
            onPress: async () => {
              try {
                console.log('MockMode: User confirmed mode change');
                
                // Save the new mode to AsyncStorage
                await AsyncStorage.setItem('mockMode', newMode.toString());
                console.log('MockMode: Saved new mode to AsyncStorage:', newMode);
                
                // Update state immediately for visual feedback
                setIsMockMode(newMode);
                
                // Force reload the app
                setTimeout(() => {
                  if (Updates.isEnabled) {
                    console.log('MockMode: Using Updates.reloadAsync()');
                    Updates.reloadAsync();
                  } else {
                    console.log('MockMode: Updates not available, simulating reload in development');
                    // In development mode, we'll just update the state and let React re-render
                    // The app should pick up the new mode from AsyncStorage on next load
                    setIsLoading(false);
                    Alert.alert(
                      'Mode Changed',
                      `Successfully switched to ${newMode ? 'Mock' : 'Live'} Mode!`,
                      [{ text: 'OK' }]
                    );
                  }
                }, 500); // Small delay to show the state change
                
              } catch (saveError) {
                console.error('MockMode: Failed to save mock mode state:', saveError);
                Alert.alert('Error', 'Failed to change mode. Please try again.');
                setIsLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('MockMode: Error in toggleMockMode:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <MockModeContext.Provider value={{ isMockMode, toggleMockMode, isLoading }}>
      {children}
    </MockModeContext.Provider>
  );
};

export const useMockMode = () => {
  const context = useContext(MockModeContext);
  if (!context) {
    throw new Error('useMockMode must be used within MockModeProvider');
  }
  return context;
};
