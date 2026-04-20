import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
// Nunito weights loaded in _layout.tsx
const FONT_BOLD  = 'Nunito_700Bold';
const FONT_XBOLD = 'Nunito_800ExtraBold';
const FONT_BLACK = 'Nunito_900Black';
import {
  SectionList,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dish, restaurants } from '../../data';
import { useProfile } from '../../store/profileStore';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const RED   = '#CE0019';
const BLACK = '#111111';
const WHITE = '#ffffff';
const PAPER = '#f2ede7';       // warm craft-paper off-white
const INK   = '#1c1c1c';      // near-black body text
const MUTED = '#8a7f78';      // muted warm grey

// ─── V! Logo wordmark (text-based) ───────────────────────────────────────────
function ViraWordmark() {
  return (
    <View style={s.wordmark}>
      <Text style={s.wordmarkV}>V!</Text>
      <View style={s.wordmarkDivider} />
      <Text style={s.wordmarkSub}>FRANGOS</Text>
    </View>
  );
}

// ─── Allergen status (inline text) ───────────────────────────────────────────
function AllergenStatus({ contains, may, safe }: { contains: number; may: number; safe: boolean }) {
  if (safe)                          return <Text style={s.statusSafe}>Seguro para si</Text>;
  if (contains === 0 && may === 0)   return <Text style={s.statusClean}>Sem alergénios</Text>;
  const parts: string[] = [];
  if (contains > 0) parts.push(`${contains} contém`);
  if (may > 0)      parts.push(`${may} pode conter`);
  return <Text style={s.statusAlert}>{parts.join(' · ')}</Text>;
}

// ─── Dish row ─────────────────────────────────────────────────────────────────
function DishRow({
  dish,
  dishIndex,
  restIndex,
  containsCount,
  mayCount,
  isPersonalSafe,
  isLast,
}: {
  dish: Dish;
  dishIndex: number;
  restIndex: number;
  containsCount: number;
  mayCount: number;
  isPersonalSafe: boolean;
  isLast: boolean;
}) {
  const router = useRouter();

  return (
    <Pressable
      style={({ pressed }) => [s.row, pressed && s.rowPressed]}
      onPress={() => router.push(`/${restIndex}/${dishIndex}`)}
      accessibilityRole="button"
      accessibilityLabel={dish.name}
    >
      {/* Red left strip — the only decoration */}
      <View style={s.rowStrip} />

      <View style={s.rowBody}>
        <Text style={s.dishName}>{dish.name.toUpperCase()}</Text>
        <AllergenStatus contains={containsCount} may={mayCount} safe={isPersonalSafe} />
      </View>

      {/* Chevron — minimal, red */}
      <Text style={s.rowChevron}>→</Text>

      {!isLast && <View style={s.rowDivider} />}
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
interface SectionData {
  title: string;
  data: Array<{ dish: Dish; dishIndex: number }>;
}

export default function ViraScreen({ restIndex }: { restIndex: number }) {
  const navigation = useNavigation();
  const restaurant = restaurants[restIndex];

  const { profile } = useProfile();
  const userKeys = useMemo(
    () => new Set(profile.allergens.map(a => a.key)),
    [profile.allergens]
  );
  const hasProfileAllergens = profile.allergens.length > 0;

  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: RED },
      headerTintColor: WHITE,
      headerShadowVisible: false,
      headerTitle: () => <ViraWordmark />,
    });
  }, []);

  const sections = useMemo<SectionData[]>(() => {
    if (!restaurant) return [];
    const map = new Map<string, SectionData>();
    restaurant.dishes.forEach((dish, dishIndex) => {
      const cat = dish.category ?? 'Outros';
      if (!map.has(cat)) map.set(cat, { title: cat, data: [] });
      map.get(cat)!.data.push({ dish, dishIndex });
    });
    return Array.from(map.values());
  }, [restaurant]);

  if (!restaurant) return null;

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <SectionList
        sections={sections}
        keyExtractor={item => String(item.dishIndex)}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={s.listContent}
        renderSectionHeader={({ section }) => (
          <View style={s.sectionHead}>
            {/* Poster-style category headline */}
            <Text style={s.sectionTitle}>{section.title.toUpperCase()}</Text>
            <View style={s.sectionRule} />
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const { dish, dishIndex } = item;
          const cf = hasProfileAllergens
            ? dish.contains_allergens.filter(a => userKeys.has(a.key))
            : dish.contains_allergens;
          const mf = hasProfileAllergens
            ? dish.may_contain_allergens.filter(a => userKeys.has(a.key))
            : dish.may_contain_allergens;
          const isPersonalSafe =
            hasProfileAllergens &&
            cf.length === 0 &&
            mf.length === 0 &&
            (dish.contains_allergens.length > 0 || dish.may_contain_allergens.length > 0);

          return (
            <DishRow
              dish={dish}
              dishIndex={dishIndex}
              restIndex={restIndex}
              containsCount={cf.length}
              mayCount={mf.length}
              isPersonalSafe={isPersonalSafe}
              isLast={index === section.data.length - 1}
            />
          );
        }}
        ListFooterComponent={
          <View style={s.footer}>
            {/* V! large mark */}
            <Text style={s.footerMark}>V!</Text>
            <Text style={s.footerLine}>The New Piri Piri Chicken</Text>
            <Text style={s.footerSub}>GRILLED & CUBED TO PERFECTION</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAPER,
  },

  listContent: {
    paddingBottom: 0,
  },

  // ── Wordmark ──────────────────────────────────────────────────────────────
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmarkV: {
    fontSize: 24,
    fontFamily: FONT_BLACK,
    color: WHITE,
    letterSpacing: -1,
  },
  wordmarkDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  wordmarkSub: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 3,
  },

  // ── Section header — poster headline ──────────────────────────────────────
  sectionHead: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 28,
    fontFamily: FONT_BLACK,
    color: RED,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  sectionRule: {
    height: 2,
    backgroundColor: RED,
    marginTop: 10,
    marginBottom: 2,
    width: '100%',
  },

  // ── Dish row — flat editorial list item ───────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    marginHorizontal: 20,
    marginTop: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  rowPressed: {
    backgroundColor: '#faf6f2',
  },
  rowStrip: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: RED,
  },
  rowBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 4,
  },
  rowChevron: {
    fontSize: 14,
    color: RED,
    fontWeight: '700',
    paddingRight: 16,
  },
  rowDivider: {
    position: 'absolute',
    bottom: 0,
    left: 17,
    right: 0,
    height: 1,
    backgroundColor: '#e8e1d9',
  },

  dishName: {
    fontSize: 14,
    fontFamily: FONT_BLACK,
    color: INK,
    letterSpacing: 0.3,
    lineHeight: 18,
  },

  // Allergen status lines
  statusSafe:  { fontSize: 11, fontFamily: FONT_BOLD, color: '#27ae60' },
  statusClean: { fontSize: 11, fontFamily: FONT_BOLD, color: MUTED },
  statusAlert: { fontSize: 11, fontFamily: FONT_BOLD, color: RED },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    backgroundColor: BLACK,
    paddingTop: 48,
    paddingBottom: 52,
    paddingHorizontal: 24,
  },
  footerMark: {
    fontSize: 64,
    fontFamily: FONT_BLACK,
    color: RED,
    letterSpacing: -3,
    lineHeight: 60,
    marginBottom: 16,
  },
  footerLine: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  footerSub: {
    fontSize: 9,
    fontFamily: FONT_BOLD,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 3,
  },
});
