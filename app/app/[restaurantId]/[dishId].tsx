import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import H3DishScreen from './H3DishScreen';
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
import { Ionicons } from '@expo/vector-icons';
import { AllergenEntry, restaurants } from '../../data';
import { useTheme, typography, space, radius, shadow } from '../_theme';
import { useProfile } from '../../store/profileStore';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function toTitleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function AllergenRow({
  allergen,
  type,
  s,
  theme,
}: {
  allergen: AllergenEntry;
  type: 'contains' | 'may_contain';
  s: ReturnType<typeof makeStyles>;
  theme: ReturnType<typeof useTheme>;
}) {
  const isContains = type === 'contains';
  const a11yPrefix = isContains ? 'Contém' : 'Pode conter';

  return (
    <View
      style={s.allergenRow}
      accessibilityLabel={`${a11yPrefix}: ${allergen.name_en}${allergen.name_pt ? `, ${allergen.name_pt}` : ''}${allergen.detail ? `. ${allergen.detail}` : ''}`}
    >
      <Ionicons
        name={isContains ? 'alert-circle' : 'alert-circle-outline'}
        size={16}
        color={isContains ? theme.riskHighAccent : theme.riskMedAccent}
        style={{ marginTop: 2, flexShrink: 0 }}
        accessibilityElementsHidden
      />
      <View style={s.allergenTextBlock}>
        <Text style={[s.allergenName, isContains ? s.nameContains : s.nameMay]}>
          {allergen.name_en}
        </Text>
        {allergen.name_pt ? (
          <Text style={s.allergenNamePt}>{allergen.name_pt}</Text>
        ) : null}
        {allergen.detail != null && allergen.detail !== '' && (
          <Text style={s.allergenDetail}>{allergen.detail}</Text>
        )}
      </View>
    </View>
  );
}

function PersonalAlertBanner({
  matchedContains,
  matchedMay,
  theme,
  s,
  profile,
}: {
  matchedContains: AllergenEntry[];
  matchedMay: AllergenEntry[];
  theme: ReturnType<typeof useTheme>;
  s: ReturnType<typeof makeStyles>;
  profile: ReturnType<typeof useProfile>['profile'];
}) {
  const hasMatches = matchedContains.length > 0 || matchedMay.length > 0;
  const userAllergenMap = new Map(profile.allergens.map(a => [a.key, a]));

  return (
    <View
      style={[s.personalBanner, hasMatches ? s.personalBannerAlert : s.personalBannerSafe]}
      accessibilityLabel={
        hasMatches
          ? `Avisos de alergénios para si: ${matchedContains.map(a => a.name_en).concat(matchedMay.map(a => a.name_en)).join(', ')}`
          : 'Este prato é seguro para si'
      }
    >
      <View style={s.personalBannerHeader}>
        <Ionicons
          name={hasMatches ? 'warning' : 'checkmark-circle'}
          size={16}
          color={hasMatches ? theme.riskHighAccent : theme.riskSafeAccent}
          accessibilityElementsHidden
        />
        <Text style={[s.personalBannerTitle, hasMatches ? s.personalBannerTitleAlert : s.personalBannerTitleSafe]}>
          Para Si
        </Text>
      </View>

      {hasMatches ? (
        <View style={s.personalBannerContent}>
          {matchedContains.map(allergen => {
            const userAllergen = userAllergenMap.get(allergen.key);
            const severityLabel = userAllergen?.severity === 'severe' ? 'Grave' : 'Ligeiro';
            return (
              <View key={allergen.key} style={[s.personalAllergenRow, s.personalAllergenRowContains]}>
                <Ionicons name="alert-circle" size={12} color={theme.riskHighAccent} style={{ marginTop: 3, flexShrink: 0 }} />
                <View style={s.personalAllergenInfo}>
                  <Text style={s.personalAllergenName}>{allergen.name_en}</Text>
                  <Text style={s.personalAllergenSecondary}>
                    {allergen.name_pt} · {severityLabel}
                  </Text>
                </View>
              </View>
            );
          })}
          {matchedMay.map(allergen => {
            const userAllergen = userAllergenMap.get(allergen.key);
            const severityLabel = userAllergen?.severity === 'severe' ? 'Grave' : 'Ligeiro';
            return (
              <View key={allergen.key} style={[s.personalAllergenRow, s.personalAllergenRowMay]}>
                <Ionicons name="alert-circle-outline" size={12} color={theme.riskMedAccent} style={{ marginTop: 3, flexShrink: 0 }} />
                <View style={s.personalAllergenInfo}>
                  <Text style={s.personalAllergenName}>{allergen.name_en}</Text>
                  <Text style={s.personalAllergenSecondary}>
                    {allergen.name_pt} · {severityLabel}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={s.personalBannerSafeText}>
          Nenhum dos seus alergénios neste prato
        </Text>
      )}
    </View>
  );
}

function CollapsibleSection({
  title,
  accentColor,
  fillColor,
  borderColor,
  defaultOpen = true,
  children,
  s,
}: {
  title: string;
  accentColor: string;
  fillColor: string;
  borderColor: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  s: ReturnType<typeof makeStyles>;
  theme: ReturnType<typeof useTheme>;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(v => !v);
  };

  return (
    <View style={[s.section, { borderColor, backgroundColor: fillColor }]}>
      <Pressable
        style={({ pressed }) => [
          s.sectionHeaderRow,
          { borderLeftColor: accentColor },
          pressed && s.sectionHeaderPressed,
        ]}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${open ? 'recolher' : 'expandir'}`}
        accessibilityState={{ expanded: open }}
      >
        <Text style={[s.sectionTitle, { color: accentColor }]}>{title}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={accentColor}
          accessibilityElementsHidden
        />
      </Pressable>
      {open && (
        <View style={[s.sectionBody, { borderTopColor: borderColor }]}>
          {children}
        </View>
      )}
    </View>
  );
}

export default function DishDetailScreen() {
  const navigation = useNavigation();
  const { restaurantId, dishId } = useLocalSearchParams<{
    restaurantId: string;
    dishId: string;
  }>();
  const theme = useTheme();
  const s = makeStyles(theme);

  const { profile } = useProfile();
  const userKeys = useMemo(
    () => new Set(profile.allergens.map(a => a.key)),
    [profile.allergens]
  );
  const hasProfileAllergens = profile.allergens.length > 0;

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
      <View style={s.centered}>
        <Text style={s.errorText}>Prato não encontrado.</Text>
      </View>
    );
  }

  if (restaurant?.name === 'H3') {
    return <H3DishScreen restIndex={restIndex} dishIndex={dIndex} />;
  }

  const matchedContains = dish.contains_allergens.filter(a => userKeys.has(a.key));
  const matchedMay = dish.may_contain_allergens.filter(a => userKeys.has(a.key));

  const hasContains = dish.contains_allergens.length > 0;
  const hasMayContain = dish.may_contain_allergens.length > 0;
  const hasAnyAllergen = hasContains || hasMayContain;
  const hasIngredients = dish.ingredients.length > 0;
  const isVerified = dish.data_verified === true;

  const heroTopBorderColor = hasContains
    ? theme.riskHighAccent
    : hasMayContain
    ? theme.riskMedAccent
    : theme.riskSafeAccent;

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View style={[s.heroCard, { borderTopColor: heroTopBorderColor }]}>
          {restaurant && (
            <Text style={s.heroRestaurant}>{restaurant.name.toUpperCase()}</Text>
          )}
          <Text style={s.dishName}>{toTitleCase(dish.name)}</Text>

          <View style={s.heroBadgeRow}>
            {dish.category != null && (
              <View style={s.categoryBadge}>
                <Text style={s.categoryText}>{toTitleCase(dish.category)}</Text>
              </View>
            )}
            {hasAnyAllergen && (
              <>
                {hasContains && (
                  <View style={[s.heroRiskBadge, s.heroRiskContains]}>
                    <Ionicons name="alert-circle" size={11} color={theme.riskHighAccent} accessibilityElementsHidden />
                    <Text style={[s.heroRiskText, { color: theme.riskHighText }]}>Contém alergénios</Text>
                  </View>
                )}
                {!hasContains && hasMayContain && (
                  <View style={[s.heroRiskBadge, s.heroRiskMay]}>
                    <Ionicons name="alert-circle-outline" size={11} color={theme.riskMedAccent} accessibilityElementsHidden />
                    <Text style={[s.heroRiskText, { color: theme.riskMedText }]}>Pode conter alergénios</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Personal Alert Banner */}
        {hasProfileAllergens && (
          <PersonalAlertBanner
            matchedContains={matchedContains}
            matchedMay={matchedMay}
            theme={theme}
            s={s}
            profile={profile}
          />
        )}

        {/* Allergen sections */}
        {hasAnyAllergen ? (
          <>
            {hasContains && (
              <CollapsibleSection
                title="Contém"
                accentColor={theme.riskHighText}
                fillColor={theme.riskHighFill}
                borderColor={theme.riskHighBorder}
                defaultOpen
                s={s}
                theme={theme}
              >
                {dish.contains_allergens.map(a => (
                  <AllergenRow key={a.key} allergen={a} type="contains" s={s} theme={theme} />
                ))}
              </CollapsibleSection>
            )}

            {hasMayContain && (
              <CollapsibleSection
                title="Pode Conter"
                accentColor={theme.riskMedText}
                fillColor={theme.riskMedFill}
                borderColor={theme.riskMedBorder}
                defaultOpen={!hasContains}
                s={s}
                theme={theme}
              >
                {dish.may_contain_allergens.map(a => (
                  <AllergenRow key={a.key} allergen={a} type="may_contain" s={s} theme={theme} />
                ))}
              </CollapsibleSection>
            )}
          </>
        ) : isVerified ? (
          <View style={s.statusCard} accessibilityLabel="Sem alergénios detectados neste prato">
            <View style={[s.statusIconContainer, s.statusIconSafe]}>
              <Ionicons name="checkmark-circle" size={28} color={theme.riskSafeAccent} />
            </View>
            <Text style={s.statusTitle}>Sem alergénios</Text>
            <Text style={s.statusSub}>
              Este prato foi verificado como isento de alergénios.
            </Text>
          </View>
        ) : (
          <View
            style={[s.statusCard, s.statusCardUnknown]}
            accessibilityLabel="Informação de alergénios não disponível para este prato"
          >
            <View style={[s.statusIconContainer, s.statusIconUnknown]}>
              <Ionicons name="help-circle" size={28} color={theme.riskUnknownAccent} />
            </View>
            <Text style={s.statusTitle}>Dados não disponíveis</Text>
            <Text style={[s.statusSub, s.statusSubUnknown]}>
              Contacta o restaurante antes de pedir. Não temos informação de alergénios verificada para este prato.
            </Text>
          </View>
        )}

        {/* Ingredients */}
        {hasIngredients && (
          <CollapsibleSection
            title="Ingredientes"
            accentColor={theme.brandPrimary}
            fillColor={theme.surface}
            borderColor={theme.borderDefault}
            defaultOpen={false}
            s={s}
            theme={theme}
          >
            <Text style={s.ingredientsText}>
              {dish.ingredients.join(', ')}
            </Text>
          </CollapsibleSection>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      ...typography.body,
      color: theme.textSecondary,
    },
    scrollContent: {
      padding: space.base,
      paddingBottom: space['3xl'],
      gap: space.md,
    },

    // Hero card
    heroCard: {
      backgroundColor: theme.surface,
      borderRadius: radius.xl,
      padding: space.base,
      gap: space.sm,
      ...shadow.card,
      borderTopWidth: 3,
    },
    heroRestaurant: {
      ...typography.label,
      color: theme.textTertiary,
      letterSpacing: 1,
    },
    dishName: {
      ...typography.h2,
      color: theme.textPrimary,
    },
    heroBadgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space.xs,
      marginTop: 2,
    },
    categoryBadge: {
      alignSelf: 'flex-start',
      backgroundColor: theme.brandSubtle,
      borderRadius: radius.full,
      paddingHorizontal: space.sm,
      paddingVertical: 3,
    },
    categoryText: {
      ...typography.chip,
      color: theme.brandSubtleText,
    },
    heroRiskBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      borderRadius: radius.full,
      paddingHorizontal: space.sm,
      paddingVertical: 3,
    },
    heroRiskContains: {
      backgroundColor: theme.riskHighFill,
      borderWidth: 1,
      borderColor: theme.riskHighBorder,
    },
    heroRiskMay: {
      backgroundColor: theme.riskMedFill,
      borderWidth: 1,
      borderColor: theme.riskMedBorder,
    },
    heroRiskText: {
      ...typography.chip,
      fontWeight: '600',
    },

    // Collapsible section
    section: {
      borderRadius: radius.lg,
      borderWidth: 1,
      overflow: 'hidden',
      ...shadow.card,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: space.base,
      paddingLeft: space.md,
      borderLeftWidth: 4,
    },
    sectionHeaderPressed: {
      opacity: 0.85,
    },
    sectionTitle: {
      ...typography.h3,
      letterSpacing: 0,
    },
    sectionBody: {
      borderTopWidth: 1,
      paddingHorizontal: space.base,
      paddingVertical: space.md,
      gap: space.sm,
    },

    // Allergen row
    allergenRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space.sm,
      paddingVertical: space.xs,
    },
    allergenTextBlock: {
      flex: 1,
      gap: 2,
    },
    allergenName: {
      ...typography.allergenName,
    },
    nameContains: {
      color: theme.riskHighText,
    },
    nameMay: {
      color: theme.riskMedText,
    },
    allergenNamePt: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    allergenDetail: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      marginTop: 1,
    },

    ingredientsText: {
      ...typography.body,
      color: theme.textSecondary,
    },

    // Status cards
    statusCard: {
      backgroundColor: theme.riskSafeFill,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: theme.riskSafeBorder,
      padding: space.xl,
      alignItems: 'center',
      gap: space.sm,
      ...shadow.card,
    },
    statusCardUnknown: {
      backgroundColor: theme.riskUnknownFill,
      borderColor: theme.riskUnknownBorder,
    },
    statusIconContainer: {
      width: 56,
      height: 56,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space.xs,
    },
    statusIconSafe: {
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.riskSafeBorder,
    },
    statusIconUnknown: {
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.riskUnknownBorder,
    },
    statusTitle: {
      ...typography.h3,
      color: theme.textPrimary,
      textAlign: 'center',
    },
    statusSub: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    statusSubUnknown: {
      color: theme.riskUnknownText,
      fontWeight: '500',
    },

    // Personal Alert Banner
    personalBanner: {
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: space.base,
      gap: space.sm,
      ...shadow.card,
    },
    personalBannerAlert: {
      backgroundColor: theme.riskHighFill,
      borderColor: theme.riskHighBorder,
      borderLeftWidth: 4,
      borderLeftColor: theme.riskHighAccent,
    },
    personalBannerSafe: {
      backgroundColor: theme.riskSafeFill,
      borderColor: theme.riskSafeBorder,
      borderLeftWidth: 4,
      borderLeftColor: theme.riskSafeAccent,
    },
    personalBannerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
    },
    personalBannerTitle: {
      ...typography.h3,
    },
    personalBannerTitleAlert: {
      color: theme.riskHighText,
    },
    personalBannerTitleSafe: {
      color: theme.riskSafeText,
    },
    personalBannerContent: {
      gap: space.sm,
    },
    personalAllergenRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space.sm,
      paddingVertical: space.xs,
    },
    personalAllergenRowContains: {
      borderLeftWidth: 3,
      borderLeftColor: theme.riskHighAccent,
      paddingLeft: space.sm,
    },
    personalAllergenRowMay: {
      borderLeftWidth: 3,
      borderLeftColor: theme.riskMedAccent,
      paddingLeft: space.sm,
    },
    personalAllergenInfo: {
      flex: 1,
      gap: 2,
    },
    personalAllergenName: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '600',
    },
    personalAllergenSecondary: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    personalBannerSafeText: {
      ...typography.body,
      color: theme.riskSafeText,
      fontWeight: '600',
    },
  });
}
