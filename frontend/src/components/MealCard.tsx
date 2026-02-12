import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MealOption {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  prep_time_min: number;
  ingredients: { name: string; amount: string }[];
  steps: string[];
  why_it_fits: string;
  shopping_addons?: string[];
}

interface MealCardProps {
  meal: MealOption;
  onSelect: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const MealCard: React.FC<MealCardProps> = ({ meal, onSelect, isExpanded, onToggleExpand }) => {
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onToggleExpand} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.mealName}>{meal.name}</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.prepTime}>{meal.prep_time_min} min</Text>
          </View>
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>

      <View style={styles.macros}>
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{meal.calories}</Text>
          <Text style={styles.macroLabel}>cal</Text>
        </View>
        <View style={styles.macroDivider} />
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{meal.protein_g}g</Text>
          <Text style={styles.macroLabel}>protein</Text>
        </View>
        <View style={styles.macroDivider} />
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{meal.carbs_g}g</Text>
          <Text style={styles.macroLabel}>carbs</Text>
        </View>
        <View style={styles.macroDivider} />
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{meal.fat_g}g</Text>
          <Text style={styles.macroLabel}>fat</Text>
        </View>
      </View>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.whyFits}>{meal.why_it_fits}</Text>
          
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {meal.ingredients.map((ing, idx) => (
            <Text key={idx} style={styles.ingredient}>
              • {ing.name} - {ing.amount}
            </Text>
          ))}

          {meal.shopping_addons && meal.shopping_addons.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: '#E67E22' }]}>Shopping List</Text>
              {meal.shopping_addons.map((item, idx) => (
                <Text key={idx} style={[styles.ingredient, { color: '#E67E22' }]}>
                  • {item}
                </Text>
              ))}
            </>
          )}

          <Text style={styles.sectionTitle}>Steps</Text>
          {meal.steps.map((step, idx) => (
            <Text key={idx} style={styles.step}>
              {idx + 1}. {step}
            </Text>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.selectButton} onPress={onSelect}>
        <Text style={styles.selectButtonText}>Log This Meal</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerContent: {
    flex: 1,
  },
  mealName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prepTime: {
    fontSize: 13,
    color: '#666',
  },
  macros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  macroDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  whyFits: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
    marginBottom: 8,
  },
  ingredient: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
    paddingLeft: 8,
  },
  step: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
    paddingLeft: 8,
    lineHeight: 20,
  },
  selectButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  selectButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
