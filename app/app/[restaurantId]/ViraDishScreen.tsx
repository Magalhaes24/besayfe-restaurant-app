import { useNavigation } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
// Nunito weights loaded in _layout.tsx
const FONT_BOLD  = 'Nunito_700Bold';
const FONT_XBOLD = 'Nunito_800ExtraBold';
const FONT_BLACK = 'Nunito_900Black';
import {
  Image,
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
import { useProfile } from '../../store/profileStore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const RED   = '#CE0019';
const BLACK = '#111111';
const WHITE = '#ffffff';
const PAPER = '#f2ede7';
const INK   = '#1c1c1c';
const MUTED = '#8a7f78';
const RULE  = '#ddd6cc';

// ─── Dish → image map ─────────────────────────────────────────────────────────
const CDN = 'https://virafrangos.pt/wp-content/uploads/2025/07';
const PH  = 'https://blocks.astratic.com/img/general-img-landscape.png';

const DISH_IMAGE: Record<string, string> = {
  'Caixa Grande (36 cubos)':     `${CDN}/3-home-scaled.jpeg`,
  'Caixa Individual (18 cubos)': `${CDN}/3-home-scaled.jpeg`,
  'Sandes Grande':                `${CDN}/4-home_2-scaled.jpeg`,
  'Sandes Pequena':               `${CDN}/4-home_2-scaled.jpeg`,
  'Churros de Batata':            `${CDN}/5-home.jpg`,
  'Salada Rica':                  `${CDN}/5-home.jpg`,
  'Arroz Torrado':                `${CDN}/5-home.jpg`,
  'Limonada Lima-Limão':          `${CDN}/7-home-e1752161176743.jpeg`,
  'Cerveja Piri-Piri':            `${CDN}/7-home-e1752161176743.jpeg`,
  'Berliner':                     `${CDN}/8-home.jpeg`,
};

// ─── V! Logo wordmark ─────────────────────────────────────────────────────────
function ViraWordmark() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ fontSize: 24, fontFamily: FONT_BLACK, color: WHITE, letterSpacing: -1 }}>V!</Text>
      <View style={{ width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.35)' }} />
      <Text style={{ fontSize: 10, fontFamily: FONT_BOLD, color: 'rgba(255,255,255,0.75)', letterSpacing: 3 }}>FRANGOS</Text>
    </View>
  );
}

// ─── Collapsible allergen section ─────────────────────────────────────────────
function Section({
  label,
  accentColor,
  defaultOpen = true,
  children,
}: {
  label: string;
  accentColor: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(v => !v);
  };

  return (
    <View style={s.section}>
      {/* Left-border strip — Vira's editorial accent */}
      <View style={[s.sectionStrip, { backgroundColor: accentColor }]} />
      <View style={s.sectionInner}>
        <Pressable
          style={({ pressed }) => [s.sectionHeader, pressed && { opacity: 0.7 }]}
          onPress={toggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
        >
          <Text style={[s.sectionLabel, { color: accentColor }]}>{label}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={accentColor} />
        </Pressable>
        {open && <View style={s.sectionBody}>{children}</View>}
      </View>
    </View>
  );
}

// ─── Single allergen row ──────────────────────────────────────────────────────
function AllergenRow({ allergen, type }: { allergen: AllergenEntry; type: 'contains' | 'may' }) {
  const color = type === 'contains' ? '#B42318' : '#92400E';
  const dot   = type === 'contains' ? RED       : '#D97706';

  return (
    <View style={s.allergenRow}>
      <View style={[s.allergenDot, { backgroundColor: dot }]} />
      <View style={s.allergenInfo}>
        <Text style={[s.allergenEn, { color }]}>{allergen.name_en}</Text>
        {allergen.name_pt ? <Text style={s.allergenPt}>{allergen.name_pt}</Text> : null}
        {allergen.detail  ? <Text style={s.allergenDetail}>{allergen.detail}</Text> : null}
      </View>
    </View>
  );
}

// ─── Personal banner ─────────────────────────────────────────────────────────
function PersonalBanner({
  matchedContains,
  matchedMay,
  profile,
}: {
  matchedContains: AllergenEntry[];
  matchedMay: AllergenEntry[];
  profile: ReturnType<typeof useProfile>['profile'];
}) {
  const hasMatches  = matchedContains.length > 0 || matchedMay.length > 0;
  const userMap     = new Map(profile.allergens.map(a => [a.key, a]));
  const accentColor = hasMatches ? RED : '#27ae60';
  const bgColor     = hasMatches ? '#FEF3F2' : '#ECFDF5';

  return (
    <View style={[s.banner, { backgroundColor: bgColor }]}>
      {/* Left strip instead of border */}
      <View style={[s.bannerStrip, { backgroundColor: accentColor }]} />
      <View style={s.bannerContent}>
        <View style={s.bannerHead}>
          <Ionicons
            name={hasMatches ? 'warning' : 'checkmark-circle'}
            size={15}
            color={accentColor}
          />
          <Text style={[s.bannerTitle, { color: accentColor }]}>PARA SI</Text>
        </View>

        {hasMatches ? (
          <View style={s.bannerList}>
            {[...matchedContains.map(a => ({ a, t: 'contains' as const })),
              ...matchedMay.map(a => ({ a, t: 'may' as const }))]
              .map(({ a, t }) => {
                const sev = userMap.get(a.key)?.severity === 'severe' ? 'Grave' : 'Ligeiro';
                const c   = t === 'contains' ? '#B42318' : '#92400E';
                const dot = t === 'contains' ? RED       : '#D97706';
                return (
                  <View key={a.key} style={s.bannerRow}>
                    <View style={[s.bannerDot, { backgroundColor: dot }]} />
                    <View style={s.bannerRowText}>
                      <Text style={[s.bannerRowName, { color: c }]}>{a.name_en}</Text>
                      <Text style={s.bannerRowSub}>{a.name_pt} · {sev}</Text>
                    </View>
                  </View>
                );
              })}
          </View>
        ) : (
          <Text style={[s.bannerOk, { color: '#27ae60' }]}>
            Nenhum dos seus alergénios neste prato.
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ViraDishScreen({
  restIndex,
  dishIndex,
}: {
  restIndex: number;
  dishIndex: number;
}) {
  const navigation  = useNavigation();
  const restaurant  = restaurants[restIndex];
  const dish        = restaurant?.dishes[dishIndex];

  const { profile } = useProfile();
  const userKeys = useMemo(
    () => new Set(profile.allergens.map(a => a.key)),
    [profile.allergens]
  );
  const hasProfile = profile.allergens.length > 0;

  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: RED },
      headerTintColor: WHITE,
      headerShadowVisible: false,
      headerTitle: () => <ViraWordmark />,
    });
  }, []);

  if (!dish) return null;

  const matchedContains = dish.contains_allergens.filter(a => userKeys.has(a.key));
  const matchedMay      = dish.may_contain_allergens.filter(a => userKeys.has(a.key));
  const hasContains     = dish.contains_allergens.length > 0;
  const hasMay          = dish.may_contain_allergens.length > 0;
  const hasIngredients  = dish.ingredients.length > 0;
  const isVerified      = dish.data_verified === true;

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Full-bleed photo ── */}
        <Image
          source={{ uri: DISH_IMAGE[dish.name] ?? PH }}
          style={s.photo}
          resizeMode="cover"
        />

        {/* ── Red accent bar — Vira's only decoration ── */}
        <View style={s.redBar} />

        {/* ── Poster headline block ── */}
        <View style={s.headline}>
          {dish.category ? (
            <Text style={s.headlineEyebrow}>{dish.category.toUpperCase()}</Text>
          ) : null}
          <Text style={s.headlineName}>{dish.name.toUpperCase()}</Text>
          <Text style={s.headlineTagline}>The New Piri Piri Chicken</Text>
        </View>

        {/* ── Allergen status bar ── */}
        <View style={s.statusBar}>
          {hasContains && (
            <View style={[s.statusPill, s.statusPillRed]}>
              <Text style={s.statusPillTextRed}>CONTÉM ALERGÉNIOS</Text>
            </View>
          )}
          {hasMay && (
            <View style={[s.statusPill, s.statusPillAmber]}>
              <Text style={s.statusPillTextAmber}>PODE CONTER</Text>
            </View>
          )}
          {!hasContains && !hasMay && (
            <View style={[s.statusPill, s.statusPillGreen]}>
              <Text style={s.statusPillTextGreen}>SEM ALERGÉNIOS</Text>
            </View>
          )}
        </View>

        {/* ── Body ── */}
        <View style={s.body}>

          {hasProfile && (
            <PersonalBanner
              matchedContains={matchedContains}
              matchedMay={matchedMay}
              profile={profile}
            />
          )}

          {hasContains && (
            <Section label="CONTÉM" accentColor={RED} defaultOpen>
              {dish.contains_allergens.map(a => (
                <AllergenRow key={a.key} allergen={a} type="contains" />
              ))}
            </Section>
          )}

          {hasMay && (
            <Section label="PODE CONTER" accentColor="#92400E" defaultOpen={!hasContains}>
              {dish.may_contain_allergens.map(a => (
                <AllergenRow key={a.key} allergen={a} type="may" />
              ))}
            </Section>
          )}

          {!hasContains && !hasMay && (
            isVerified ? (
              <View style={s.verifiedBlock}>
                <View style={[s.sectionStrip, { backgroundColor: '#27ae60' }]} />
                <View style={s.verifiedInner}>
                  <Ionicons name="checkmark-circle" size={22} color="#27ae60" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[s.sectionLabel, { color: '#27ae60' }]}>SEM ALERGÉNIOS</Text>
                    <Text style={s.verifiedSub}>Verificado como isento de alergénios.</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={s.verifiedBlock}>
                <View style={[s.sectionStrip, { backgroundColor: '#D97706' }]} />
                <View style={s.verifiedInner}>
                  <Ionicons name="help-circle" size={22} color="#D97706" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[s.sectionLabel, { color: '#92400E' }]}>DADOS NÃO DISPONÍVEIS</Text>
                    <Text style={s.verifiedSub}>
                      Contacta o restaurante antes de pedir.
                    </Text>
                  </View>
                </View>
              </View>
            )
          )}

          {hasIngredients && (
            <Section label="INGREDIENTES" accentColor={MUTED} defaultOpen={false}>
              <Text style={s.ingredients}>{dish.ingredients.join(', ')}.</Text>
            </Section>
          )}
        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerMark}>V!</Text>
          <Text style={s.footerLine}>The New Piri Piri Chicken</Text>
          <Text style={s.footerSub}>GRILLED & CUBED TO PERFECTION</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAPER,
  },

  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#e8e0d5',
  },

  // 6px red bar — bolder than H3's 4px blue
  redBar: {
    height: 6,
    backgroundColor: RED,
  },

  // Poster headline
  headline: {
    backgroundColor: WHITE,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    gap: 4,
  },
  headlineEyebrow: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    color: MUTED,
    letterSpacing: 2.5,
    marginBottom: 2,
  },
  headlineName: {
    fontSize: 30,
    fontFamily: FONT_BLACK,
    color: INK,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  headlineTagline: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    color: RED,
    letterSpacing: 0.3,
    fontStyle: 'italic',
    marginTop: 6,
  },

  // Allergen status bar — flat, no rounded corners
  statusBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    borderTopWidth: 1,
    borderTopColor: RULE,
    backgroundColor: WHITE,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderLeftWidth: 3,
  },
  statusPillRed:        { backgroundColor: '#FEF3F2', borderLeftColor: RED },
  statusPillAmber:      { backgroundColor: '#FFFBEB', borderLeftColor: '#D97706' },
  statusPillGreen:      { backgroundColor: '#ECFDF5', borderLeftColor: '#27ae60' },
  statusPillTextRed:    { fontSize: 10, fontFamily: FONT_XBOLD, color: '#B42318', letterSpacing: 1 },
  statusPillTextAmber:  { fontSize: 10, fontFamily: FONT_XBOLD, color: '#92400E', letterSpacing: 1 },
  statusPillTextGreen:  { fontSize: 10, fontFamily: FONT_XBOLD, color: '#27ae60', letterSpacing: 1 },

  // Body
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 16,
    backgroundColor: PAPER,
  },

  // Personal banner — left strip, no border box
  banner: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  bannerStrip: {
    width: 4,
    alignSelf: 'stretch',
    flexShrink: 0,
  },
  bannerContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  bannerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerTitle: {
    fontSize: 10,
    fontFamily: FONT_BLACK,
    letterSpacing: 2,
  },
  bannerList: { gap: 8 },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bannerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 4,
    flexShrink: 0,
  },
  bannerRowText: { flex: 1, gap: 2 },
  bannerRowName: { fontSize: 13, fontFamily: FONT_BOLD },
  bannerRowSub:  { fontSize: 11, fontFamily: FONT_BOLD, color: MUTED },
  bannerOk:      { fontSize: 13, fontFamily: FONT_BOLD },

  // Allergen section — left strip + flat background
  section: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    overflow: 'hidden',
  },
  sectionStrip: {
    width: 4,
    alignSelf: 'stretch',
    flexShrink: 0,
  },
  sectionInner: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sectionLabel: {
    flex: 1,
    fontSize: 10,
    fontFamily: FONT_BLACK,
    letterSpacing: 2,
  },
  sectionBody: {
    gap: 14,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  // Allergen row
  allergenRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  allergenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  allergenInfo:   { flex: 1, gap: 2 },
  allergenEn:     { fontSize: 15, fontFamily: FONT_BOLD, lineHeight: 20 },
  allergenPt:     { fontSize: 12, fontFamily: FONT_BOLD, color: MUTED },
  allergenDetail: { fontSize: 12, fontFamily: FONT_BOLD, color: MUTED, lineHeight: 17 },

  // Verified / unknown block (same strip style)
  verifiedBlock: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    overflow: 'hidden',
  },
  verifiedInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  verifiedSub: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    color: MUTED,
    lineHeight: 18,
  },

  // Ingredients
  ingredients: {
    fontSize: 14,
    fontFamily: FONT_BOLD,
    color: MUTED,
    lineHeight: 22,
  },

  // Footer
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
