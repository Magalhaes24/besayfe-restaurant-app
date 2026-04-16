import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AllergenEntry, restaurants } from '../../data';

// Enable LayoutAnimation on Android at module level
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CONTAINS_COLOR = '#E8541A';
const MAY_CONTAIN_COLOR = '#C47B0A';
const SAFE_COLOR = '#3A8C50';

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function AllergenRow({
  allergen,
  type,
}: {
  allergen: AllergenEntry;
  type: 'contains' | 'may_contain';
}) {
  const isContains = type === 'contains';
  return (
    <View style={styles.allergenRow}>
      <View
        style={[
          styles.allergenIcon,
          isContains ? styles.iconContains : styles.iconMayContain,
        ]}
      />
      <View style={styles.allergenTextBlock}>
        <Text
          style={[
            styles.allergenName,
            isContains ? styles.textContains : styles.textMayContain,
          ]}
        >
          {allergen.name_en}
        </Text>
        <Text style={styles.allergenNamePt}>{allergen.name_pt}</Text>
        {allergen.detail != null && allergen.detail !== '' && (
          <Text style={styles.allergenDetail}>{allergen.detail}</Text>
        )}
      </View>
    </View>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={styles.section}>
      <Pressable
        style={({ pressed }) => [styles.sectionHeaderRow, pressed && styles.sectionHeaderPressed]}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${open ? 'collapse' : 'expand'}`}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionToggle}>{open ? '▾' : '▸'}</Text>
      </Pressable>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

export default function DishDetailScreen() {
  const navigation = useNavigation();
  const { restaurantId, dishId } = useLocalSearchParams<{
    restaurantId: string;
    dishId: string;
  }>();

  const restIndex = parseInt(restaurantId ?? '0', 10);
  const dIndex = parseInt(dishId ?? '0', 10);
  const restaurant = restaurants[restIndex];
  const dish = restaurant?.dishes[dIndex];

  useEffect(() => {
    if (dish) {
      navigation.setOptions({ title: toTitleCase(dish.name) });
    }
  }, [dish, navigation]);

  if (!dish) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Dish not found.</Text>
      </View>
    );
  }

  const hasContains = dish.contains_allergens.length > 0;
  const hasMayContain = dish.may_contain_allergens.length > 0;
  const hasAnyAllergen = hasContains || hasMayContain;
  const hasIngredients = dish.ingredients.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View style={styles.heroCard}>
          <Text style={styles.dishName}>{toTitleCase(dish.name)}</Text>
          {dish.category != null && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{dish.category}</Text>
            </View>
          )}
        </View>

        {/* Ingredients */}
        {hasIngredients && (
          <CollapsibleSection title="Ingredients" defaultOpen={false}>
            <Text style={styles.ingredientsText}>
              {dish.ingredients.join(', ')}
            </Text>
          </CollapsibleSection>
        )}

        {/* Allergen sections */}
        {hasAnyAllergen ? (
          <>
            {hasContains && (
              <CollapsibleSection title="Contains" defaultOpen>
                {dish.contains_allergens.map((a) => (
                  <AllergenRow key={a.key} allergen={a} type="contains" />
                ))}
              </CollapsibleSection>
            )}
            {hasMayContain && (
              <CollapsibleSection title="May Contain" defaultOpen>
                {dish.may_contain_allergens.map((a) => (
                  <AllergenRow key={a.key} allergen={a} type="may_contain" />
                ))}
              </CollapsibleSection>
            )}
          </>
        ) : (
          <View
            style={styles.noAllergenCard}
            accessibilityLabel="No allergens detected for this dish"
          >
            <View style={styles.noAllergenIconContainer}>
              {/* Safe placeholder — replace with <Ionicons name="checkmark-circle" size={28} color={SAFE_COLOR} /> once @expo/vector-icons is installed */}
              <Text style={styles.noAllergenIconFallback}>✓</Text>
            </View>
            <Text style={styles.noAllergenTitle}>
              No allergen information available
            </Text>
            <Text style={styles.noAllergenSub}>
              This dish has no recorded allergen data.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#6B6B6B',
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
    gap: 12,
  },

  // Hero card — uniform 16px padding across all cards
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  dishName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Collapsible section
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 14,
  },
  sectionHeaderPressed: {
    backgroundColor: '#F7F7F7',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.1,
  },
  // #767676 = 4.54:1 contrast — passes WCAG AA (was #AAAAAA at 2.32:1)
  sectionToggle: {
    fontSize: 16,
    color: '#767676',
  },
  sectionBody: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },

  // Ingredients
  ingredientsText: {
    fontSize: 14,
    color: '#444444',
    lineHeight: 22,
  },

  // Allergen row
  allergenRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  allergenIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 3,
    flexShrink: 0,
  },
  iconContains: {
    backgroundColor: CONTAINS_COLOR,
  },
  iconMayContain: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: MAY_CONTAIN_COLOR,
  },
  allergenTextBlock: {
    flex: 1,
    gap: 1,
  },
  allergenName: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  textContains: {
    color: CONTAINS_COLOR,
  },
  textMayContain: {
    color: MAY_CONTAIN_COLOR,
  },
  // #6B6B6B = 4.6:1 contrast — passes WCAG AA (was #999999 at 2.85:1)
  allergenNamePt: {
    fontSize: 12,
    color: '#6B6B6B',
    fontWeight: '500',
  },
  // Safety detail text must be legible — removed italic and raised contrast (was italic #AAAAAA)
  allergenDetail: {
    fontSize: 12,
    color: '#555555',
  },

  // No allergens card
  noAllergenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  noAllergenIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EDFBF0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  noAllergenIconFallback: {
    fontSize: 24,
    color: SAFE_COLOR,
    fontWeight: '700',
  },
  noAllergenTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  noAllergenSub: {
    fontSize: 13,
    // #6B6B6B passes WCAG AA (was #999999 at 2.85:1)
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
