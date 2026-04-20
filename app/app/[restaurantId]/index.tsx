import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import H3Screen from './H3Screen';
import ViraScreen from './ViraScreen';
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Dish, restaurants } from '../../data';
import { useTheme, typography, space, radius } from '../_theme';
import { useProfile } from '../../store/profileStore';

function toTitleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

interface Section {
  title: string;
  data: Array<{ dish: Dish; dishIndex: number }>;
}

function RiskChip({
  name,
  type,
  theme,
  s,
}: {
  name: string;
  type: 'contains' | 'may';
  theme: ReturnType<typeof useTheme>;
  s: ReturnType<typeof makeStyles>;
}) {
  const isContains = type === 'contains';
  return (
    <View
      style={[s.chip, isContains ? s.chipContains : s.chipMay]}
      accessibilityLabel={isContains ? `Contém ${name}` : `Pode conter ${name}`}
    >
      <Ionicons
        name={isContains ? 'alert-circle' : 'alert-circle-outline'}
        size={10}
        color={isContains ? theme.riskHighAccent : theme.riskMedAccent}
        accessibilityElementsHidden
      />
      <Text style={[s.chipText, isContains ? s.chipTextContains : s.chipTextMay]}>
        {name}
      </Text>
    </View>
  );
}

export default function DishesListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const restIndex = parseInt(restaurantId ?? '0', 10);
  const restaurant = restaurants[restIndex];
  const theme = useTheme();
  const s = makeStyles(theme);

  const { profile } = useProfile();
  const userKeys = useMemo(
    () => new Set(profile.allergens.map(a => a.key)),
    [profile.allergens]
  );
  const hasProfileAllergens = profile.allergens.length > 0;

  useEffect(() => {
    if (restaurant) {
      navigation.setOptions({ title: restaurant.name });
    }
  }, [restaurant?.name]);

  if (!restaurant) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.errorState}>
          <Text style={s.errorText}>Restaurante não encontrado.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (restaurant.name === 'H3') {
    return <H3Screen restIndex={restIndex} />;
  }
  if (restaurant.name === 'Vira') {
    return <ViraScreen restIndex={restIndex} />;
  }

  const sectionMap = new Map<string, Section>();
  restaurant.dishes.forEach((dish, idx) => {
    const key = dish.category ?? 'Outros';
    if (!sectionMap.has(key)) sectionMap.set(key, { title: key, data: [] });
    sectionMap.get(key)!.data.push({ dish, dishIndex: idx });
  });
  const sections: Section[] = Array.from(sectionMap.values());

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.dishIndex)}
        contentContainerStyle={s.listContent}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <View style={s.sectionHeaderContainer}>
            <Text style={s.sectionHeader}>{toTitleCase(section.title)}</Text>
            <View style={s.sectionCountBadge}>
              <Text style={s.sectionCount}>{section.data.length}</Text>
            </View>
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const { dish, dishIndex } = item;
          const isFirst = index === 0;
          const isLast = index === section.data.length - 1;

          const containsAllergens = dish.contains_allergens.length > 0;
          const mayContainAllergens = dish.may_contain_allergens.length > 0;
          const hasAllergens = containsAllergens || mayContainAllergens;

          const allergenEntries = hasProfileAllergens
            ? [
                ...dish.contains_allergens
                  .filter(a => userKeys.has(a.key))
                  .map(a => ({ name: a.name_en, type: 'contains' as const })),
                ...dish.may_contain_allergens
                  .filter(a => userKeys.has(a.key))
                  .map(a => ({ name: a.name_en, type: 'may' as const })),
              ]
            : [
                ...dish.contains_allergens.map(a => ({ name: a.name_en, type: 'contains' as const })),
                ...dish.may_contain_allergens.map(a => ({ name: a.name_en, type: 'may' as const })),
              ];

          const dishHasAnyAllergens =
            dish.contains_allergens.length > 0 || dish.may_contain_allergens.length > 0;
          const isPersonalSafe = hasProfileAllergens && allergenEntries.length === 0 && dishHasAnyAllergens;
          const hasMatchingAllergens = hasProfileAllergens && allergenEntries.length > 0;

          const visibleAllergens = allergenEntries.slice(0, 2);
          const overflowCount = allergenEntries.length - visibleAllergens.length;

          const a11yLabel = isPersonalSafe
            ? `${toTitleCase(dish.name)}: seguro para si`
            : hasAllergens
            ? `${toTitleCase(dish.name)}: ${dish.contains_allergens.length > 0 ? `Contém ${dish.contains_allergens.map(a => a.name_en).join(', ')}. ` : ''}${dish.may_contain_allergens.length > 0 ? `Pode conter ${dish.may_contain_allergens.map(a => a.name_en).join(', ')}.` : ''}`
            : `${toTitleCase(dish.name)}: sem alergénios`;

          return (
            <Pressable
              style={({ pressed }) => [
                s.dishRow,
                isFirst && s.dishRowFirst,
                isLast && s.dishRowLast,
                hasMatchingAllergens && s.dishRowDanger,
                pressed && s.dishRowPressed,
              ]}
              android_ripple={{ color: theme.ripple, borderless: false }}
              accessibilityRole="button"
              accessibilityLabel={a11yLabel}
              onPress={() => router.push(`/${restIndex}/${dishIndex}`)}
            >
              <View style={s.dishRowContent}>
                <View style={s.dishLeft}>
                  <Text style={s.dishName}>{toTitleCase(dish.name)}</Text>

                  {isPersonalSafe ? (
                    <View style={s.safeLabelRow}>
                      <Ionicons name="checkmark-circle" size={12} color={theme.riskSafeAccent} accessibilityElementsHidden />
                      <Text style={s.safeLabel}>Seguro para si</Text>
                    </View>
                  ) : hasAllergens ? (
                    <View style={s.chipStrip}>
                      {visibleAllergens.map((a, i) => (
                        <RiskChip key={i} name={a.name} type={a.type} theme={theme} s={s} />
                      ))}
                      {overflowCount > 0 && (
                        <View style={s.chipOverflow}>
                          <Text style={s.chipOverflowText}>+{overflowCount}</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={s.safeLabelRow}>
                      <Ionicons name="checkmark-circle" size={12} color={theme.riskSafeAccent} accessibilityElementsHidden />
                      <Text style={s.safeLabel}>Sem alergénios</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={14} color={theme.textTertiary} />
              </View>
              {!isLast && <View style={s.rowSeparator} />}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    listContent: {
      paddingHorizontal: space.base,
      paddingTop: space.sm,
      paddingBottom: space['2xl'],
    },

    sectionHeaderContainer: {
      backgroundColor: theme.background,
      paddingTop: space.lg,
      paddingBottom: space.xs,
      paddingLeft: space.xs,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
    },
    sectionHeader: {
      ...typography.label,
      color: theme.textSecondary,
    },
    sectionCountBadge: {
      backgroundColor: theme.borderDefault,
      borderRadius: radius.full,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    sectionCount: {
      ...typography.caption,
      color: theme.textTertiary,
      fontSize: 10,
      fontWeight: '600',
    },

    // Grouped section card rows
    dishRow: {
      backgroundColor: theme.surface,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: theme.borderDefault,
    },
    dishRowFirst: {
      borderTopWidth: 1,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
    },
    dishRowLast: {
      borderBottomWidth: 1,
      borderBottomLeftRadius: radius.lg,
      borderBottomRightRadius: radius.lg,
      marginBottom: space.sm,
    },
    dishRowDanger: {
      borderColor: theme.riskHighBorder,
      borderLeftWidth: 2,
      borderRightWidth: 2,
    },
    dishRowPressed: {
      backgroundColor: theme.surfaceSubtle,
    },
    dishRowContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space.base,
      paddingVertical: space.md,
    },
    dishLeft: {
      flex: 1,
      marginRight: space.sm,
      gap: space.xs,
    },
    dishName: {
      ...typography.h3,
      color: theme.textPrimary,
    },

    // Chip strip
    chipStrip: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space.xs,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.full,
      paddingHorizontal: space.sm,
      paddingVertical: 3,
      gap: 4,
    },
    chipContains: {
      backgroundColor: theme.riskHighFill,
      borderWidth: 1,
      borderColor: theme.riskHighBorder,
    },
    chipMay: {
      backgroundColor: theme.riskMedFill,
      borderWidth: 1,
      borderColor: theme.riskMedBorder,
    },
    chipText: {
      ...typography.chip,
    },
    chipTextContains: {
      color: theme.riskHighText,
    },
    chipTextMay: {
      color: theme.riskMedText,
    },
    chipOverflow: {
      borderRadius: radius.full,
      paddingHorizontal: space.sm,
      paddingVertical: 3,
      backgroundColor: theme.borderDefault,
    },
    chipOverflowText: {
      ...typography.chip,
      color: theme.textSecondary,
    },

    safeLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    safeLabel: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.riskSafeText,
    },

    rowSeparator: {
      height: 1,
      backgroundColor: theme.borderDefault,
      marginLeft: space.base,
    },

    errorState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space['2xl'],
    },
    errorText: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });
}
