import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IngredientChipProps {
  name: string;
  confidence?: number;
  onRemove: () => void;
  isUncertain?: boolean;
}

export const IngredientChip: React.FC<IngredientChipProps> = ({ 
  name, 
  confidence, 
  onRemove,
  isUncertain 
}) => {
  return (
    <View style={[styles.chip, isUncertain && styles.uncertainChip]}>
      <Text style={[styles.chipText, isUncertain && styles.uncertainText]}>
        {name}
      </Text>
      {confidence !== undefined && (
        <Text style={styles.confidence}>
          {Math.round(confidence * 100)}%
        </Text>
      )}
      <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
        <Ionicons 
          name="close-circle" 
          size={18} 
          color={isUncertain ? '#E67E22' : '#666'} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  uncertainChip: {
    backgroundColor: '#FFF5EB',
    borderWidth: 1,
    borderColor: '#E67E22',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  uncertainText: {
    color: '#E67E22',
  },
  confidence: {
    fontSize: 11,
    color: '#999',
    marginLeft: 6,
  },
  removeButton: {
    marginLeft: 4,
    padding: 2,
  },
});
