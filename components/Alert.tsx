import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type AlertType = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  type: AlertType;
  title?: string;
  message: string;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  messageStyle?: TextStyle;
}

export default function Alert({
  type = 'info',
  title,
  message,
  containerStyle,
  titleStyle,
  messageStyle,
}: AlertProps) {
  const getAlertColor = () => {
    switch (type) {
      case 'info': return '#2196F3';
      case 'success': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'error': return '#F44336';
      default: return '#2196F3';
    }
  };
  
  const getAlertIcon = () => {
    switch (type) {
      case 'info': return 'info';
      case 'success': return 'check-circle';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };
  
  const getBackgroundColor = () => {
    switch (type) {
      case 'info': return '#E3F2FD';
      case 'success': return '#E8F5E9';
      case 'warning': return '#FFF3E0';
      case 'error': return '#FFEBEE';
      default: return '#E3F2FD';
    }
  };

  return (
    <View 
      style={[
        styles.container, 
        { backgroundColor: getBackgroundColor() },
        { borderLeftColor: getAlertColor() },
        containerStyle
      ]}
    >
      <MaterialIcons 
        name={getAlertIcon() as any} 
        size={24} 
        color={getAlertColor()} 
        style={styles.icon} 
      />
      
      <View style={styles.content}>
        {title && (
          <Text style={[
            styles.title, 
            { color: getAlertColor() },
            titleStyle
          ]}>
            {title}
          </Text>
        )}
        
        <Text style={[
          styles.message,
          messageStyle
        ]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginVertical: 8,
  },
  icon: {
    marginRight: 12,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#333',
  },
});