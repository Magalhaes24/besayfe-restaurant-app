import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dish, restaurants } from '../../data';

const CONTAINS_COLOR = '#E8541A';
const MAY_CONTAIN_COLOR = '#C47B0A';
const SAFE_COLOR = '#3A8C50';

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Section {
  title: string;
  data: Array<{ dish: Dish; dishIndex: number }>;
}

export default function DishesListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const restIndex = parseInt(restaurantId ?? '0', 10);
  const restaurant = restaurants[restIndex];

  useEffect(() => {
    if (restaurant) {
      navigation.setOptions({ title: restaurant.name });
    }
  }, [restaurant?.name]);

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Restaurant not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sectionMap = new Map<string, Section>();
  restaurant.dishes.forEach((dish, idx) => {
    const key = dish.category ?? 'Other';
    if (!sectionMap.has(key)) sectionMap.set(key, { title: key, data: [] });
    sectionMap.get(key)!.data.push({ dish, dishIndex: idx });
  });
  const sections: Section[] = Array.from(sectionMap.values());

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.dishIndex)}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>{toTitleCase(section.title)}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const { dish, dishIndex } = item;
          const containsAllergens = dish.contains_allergens.length > 0;
          const mayContainAllergens = dish.may_contain_allergens.length > 0;
          const hasAllergens = containsAllergens || mayContainAllergens;

          const allergenEntries = [
            ...dish.contains_allergens.map((a) => ({ name: a.name_en, type: 'contains' as const })),
            ...dish.may_contain_allergens.map((a) => ({ name: a.name_en, type: 'may' as const })),
          ];
          const visibleAllergens = allergenEntries.slice(0, 2);
          const overflowCount = allergenEntries.length - visibleAllergens.length;

          return (
            <Pressable
              style={({ pressed }) => [styles.dishCard, pressed && styles.dishCardPressed]}
              android_ripple={{ color: '#00000008', borderless: false }}
              accessibilityRole="button"
              accessibilityLabel={
                hasAllergens
                  ? `${toTitleCase(dish.name)}, allergens: ${allergenEntries.map((a) => a.name).join(', ')}`
                  : `${toTitleCase(dish.name)}, no allergens`
              }
              onPress={() => router.push(`/${restIndex}/${dishIndex}`)}
            >
              <View style={styles.dishRow}>
                <View style={styles.dishLeft}>
                  {/* Never truncate safety-critical dish names */}
                  <Text style={styles.dishName}>{toTitleCase(dish.name)}</Text>
                  {hasAllergens ? (
                    <View style={styles.allergenChips}>
                      {visibleAllergens.map((a, i) => (
                        <View
                          key={i}
                          style={[
                            styles.allergenChip,
                            a.type === 'contains' ? styles.chipContains : styles.chipMayContain,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              a.type === 'contains' ? styles.chipTextContains : styles.chipTextMay,
                            ]}
                          >
                            {a.name}
                          </Text>
                        </View>
                      ))}
                      {overflowCount > 0 && (
                        <View style={styles.allergenChipOverflow}>
                          <Text style={styles.chipTextOverflow}>+{overflowCount}</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.safeLabel}>No allergens</Text>
                  )}
                </View>
                <Text style={styles.chevron} accessibilityElementsHidden>›</Text>
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },

  // Sticky section header needs a solid background so it doesn't bleed over cards
  sectionHeaderContainer: {
    backgroundColor: '#F5F5F5',
    paddingTop: 20,
    paddingBottom: 6,
    paddingLeft: 4,
  },
  // #6B6B6B passes WCAG AA (was #888888 at 3.54:1)
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B6B6B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  dishCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dishCardPressed: {
    backgroundColor: '#F7F7F7',
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dishLeft: {
    flex: 1,
    marginRight: 8,
  },
  dishName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },

  // Allergen chip strip — visible allergen names directly on the card
  allergenChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  allergenChip: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipContains: {
    backgroundColor: '#FEF0EB',
  },
  chipMayContain: {
    backgroundColor: '#FEF7E8',
    borderWidth: 1,
    borderColor: MAY_CONTAIN_COLOR,
  },
  allergenChipOverflow: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#F0F0F0',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextContains: {
    color: CONTAINS_COLOR,
  },
  chipTextMay: {
    color: MAY_CONTAIN_COLOR,
  },
  chipTextOverflow: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B6B6B',
  },

  safeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SAFE_COLOR,
  },

  chevron: {
    fontSize: 20,
    color: '#BBBBBB',
  },
  itemSeparator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 16,
  },

  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#6B6B6B',
    textAlign: 'center',
  },
});
