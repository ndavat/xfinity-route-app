import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  color?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'small' | 'medium' | 'large';
  iconName?: string;
  outline?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({ 
  title, 
  color = 'primary', 
  size = 'medium', 
  iconName,
  outline = false,
  loading = false,
  fullWidth = false,
  style,
  disabled,
  ...rest 
}: ButtonProps) {
  // Determine background color based on variant
  const getBackgroundColor = () => {
    if (outline) return 'transparent';
    
    switch (color) {
      case 'primary': return '#0261C2';
      case 'secondary': return '#6c757d';
      case 'danger': return '#D32F2F';
      case 'success': return '#43a047';
      case 'warning': return '#FF9800';
      default: return '#0261C2';
    }
  };
  
  // Determine text/border color
  const getTextColor = () => {
    if (outline) {
      switch (color) {
        case 'primary': return '#0261C2';
        case 'secondary': return '#6c757d';
        case 'danger': return '#D32F2F';
        case 'success': return '#43a047';
        case 'warning': return '#FF9800';
        default: return '#0261C2';
      }
    }
    
    return 'white';
  };
  
  // Determine border color when outlined
  const getBorderColor = () => {
    if (!outline) return 'transparent';
    
    switch (color) {
      case 'primary': return '#0261C2';
      case 'secondary': return '#6c757d';
      case 'danger': return '#D32F2F';
      case 'success': return '#43a047';
      case 'warning': return '#FF9800';
      default: return '#0261C2';
    }
  };
  
  // Determine padding based on size
  const getPadding = () => {
    switch (size) {
      case 'small': return { paddingVertical: 6, paddingHorizontal: 12 };
      case 'medium': return { paddingVertical: 10, paddingHorizontal: 16 };
      case 'large': return { paddingVertical: 14, paddingHorizontal: 20 };
      default: return { paddingVertical: 10, paddingHorizontal: 16 };
    }
  };
  
  // Determine font size based on size
  const getFontSize = () => {
    switch (size) {
      case 'small': return 14;
      case 'medium': return 16;
      case 'large': return 18;
      default: return 16;
    }
  };
  
  // Determine icon size based on button size
  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'medium': return 18;
      case 'large': return 22;
      default: return 18;
    }
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: outline ? 1 : 0,
          ...getPadding(),
          opacity: disabled ? 0.6 : 1,
          width: fullWidth ? '100%' : 'auto',
        },
        style,
      ]}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={outline ? getTextColor() : 'white'} 
        />
      ) : (
        <View style={styles.content}>
          {iconName && (
            <MaterialIcons 
              name={iconName as any}
              size={getIconSize()} 
              color={getTextColor()} 
              style={styles.icon} 
            />
          )}
          <Text 
            style={[
              styles.text, 
              { 
                color: getTextColor(),
                fontSize: getFontSize(),
              }
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: 'bold',
  },
  icon: {
    marginRight: 6,
  },
});