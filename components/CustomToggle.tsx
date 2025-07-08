import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface CustomToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void | Promise<void>;
  disabled?: boolean;
  label?: string;
  description?: string;
  small?: boolean;
}

export const CustomToggle: React.FC<CustomToggleProps> = ({
  value,
  onValueChange,
  disabled = false,
  label,
  description,
  small = false
}) => {
  if (small) {
    return (
      <TouchableOpacity
        style={[styles.smallToggle, value ? styles.toggleOn : styles.toggleOff]}
        onPress={() => !disabled && onValueChange(!value)}
        disabled={disabled}
      >
        <View style={[styles.smallThumb, value ? styles.thumbOn : styles.thumbOff]}>
          <MaterialIcons 
            name={value ? "check" : "close"} 
            size={12} 
            color="white" 
          />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.toggleContainer, disabled && styles.disabled]}
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
    >
      <View style={styles.textContainer}>
        {label && <Text style={styles.label}>{label}</Text>}
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      
      <View style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}>
        <View style={[styles.thumb, value ? styles.thumbOn : styles.thumbOff]}>
          <MaterialIcons 
            name={value ? "check" : "close"} 
            size={16} 
            color="white" 
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  disabled: {
    opacity: 0.5,
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
  toggle: {
    width: 60,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  smallToggle: {
    width: 40,
    height: 20,
    borderRadius: 10,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: '#0261C2',
    alignItems: 'flex-end',
  },
  toggleOff: {
    backgroundColor: '#ccc',
    alignItems: 'flex-start',
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbOn: {
    backgroundColor: '#ffffff',
  },
  thumbOff: {
    backgroundColor: '#ffffff',
  },
});
