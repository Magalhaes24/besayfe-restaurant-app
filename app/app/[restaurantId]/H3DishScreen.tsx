import { useNavigation } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
const BLUE   = '#1a9ed4';
const BLACK  = '#171717';
const WHITE  = '#ffffff';
const GRAY   = '#666666';
const BORDER = '#e8e8e8';
const FOOTER = '#171717';

// ─── Dish → image map ─────────────────────────────────────────────────────────
const CDN = 'https://www.h3.com/wp-content/uploads';
const B   = `${CDN}/2025/03/H3_Site_Hamburgueres_640x356_Benedictementa`;
const N   = `${CDN}/2025/02/imagem-com-nome`;
const PH  = 'https://blocks.astratic.com/img/general-img-landscape.png';

const DISH_IMAGE: Record<string, string> = {
  'Grelhado':                   `${B}-02.png`,
  'Limão':                      `${B}-02.png`,
  'Com molho':                  `${B}-03.png`,
  'Tuga':                       `${B}-05.png`,
  'Dente de alho':              `${B}-05.png`,
  'Louro':                      `${B}-05.png`,
  'Champignon':                 `${B}-04.png`,
  'Cheese':                     `${B}-08.png`,
  'Med':                        `${B}-06.png`,
  'Carbonara':                  `${B}-07.png`,
  'Benedict':                   `${B}-09.png`,
  'French':                     `${CDN}/2025/06/H3_Francesinha_Site_Barra_1334x888.jpg`,
  'Superbread':                 `${B}-11.png`,
  'Pica-Pau (Refresh)':         `${CDN}/2025/10/H3_PicaPau_Site_Barra_1334x888_Selo.jpg`,
  'Croquetes*':                 `${N}-33.png`,
  'Salada BLT*':                `${N}-37.png`,
  'Grelhado no pão':            `${B}-11.png`,
  'Tuga no pão':                `${B}-11.png`,
  'Med no pão':                 `${B}-11.png`,
  'Carbonara no pão':           `${B}-11.png`,
  'Cheese no pão':              `${B}-11.png`,
  'Cheese Bacon no pão':        `${B}-11.png`,
  'Benedict no pão':            `${B}-11.png`,
  'Arroz Thai':                 `${N}-34.png`,
  'Salada c/ vinagreta h3':     `${N}-37.png`,
  'Limonada de limão':          `${N}-38.png`,
  'Limonada de morango':        `${N}-38.png`,
  'Limonada de maracujá':       `${N}-38.png`,
  'Limonada de romã':           `${N}-38.png`,
  'Chá preto':                  `${N}-38.png`,
  'Chá de limão':               `${N}-38.png`,
  'Cerveja':                    `${N}-38.png`,
  'Vinho':                      `${N}-38.png`,
  'M. mousse doce de leite':    `${N}-39.png`,
  'M. mousse de avelã e choc.': `${N}-39.png`,
  'Mousse de chocolate h3':     `${N}-40.png`,
  'Everydae de morango*':       `${N}-42.png`,
  'Everydae de maracujá*':      `${N}-42.png`,
  'Everydae de caramelo*':      `${N}-42.png`,
  'Pavlova de morango*':        `${N}-39.png`,
  'Pavlova de maracujá*':       `${N}-39.png`,
  'Bolo de chocolate*':         `${N}-41.png`,
};

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
      <Pressable
        style={({ pressed }) => [s.sectionHeader, pressed && { opacity: 0.7 }]}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityHint={open ? 'Toca para fechar' : 'Toca para abrir'}
      >
        <Text style={[s.sectionLabel, { color: accentColor }]}>{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={13} color={accentColor} />
      </Pressable>

      {open && <View style={s.sectionBody}>{children}</View>}
    </View>
  );
}

// ─── Single allergen row ───────────────────────────────────────────────────────
function AllergenRow({ allergen, type }: { allergen: AllergenEntry; type: 'contains' | 'may' }) {
  const color = type === 'contains' ? '#B42318' : '#92400E';
  const dot   = type === 'contains' ? '#B42318' : '#D97706';

  return (
    <View style={s.allergenRow}>
      <View style={[s.allergenDot, { backgroundColor: dot }]} />
      <View style={s.allergenInfo}>
        <Text style={[s.allergenEn, { color }]}>{allergen.name_en}</Text>
        {allergen.name_pt ? (
          <Text style={s.allergenPt}>{allergen.name_pt}</Text>
        ) : null}
        {allergen.detail ? (
          <Text style={s.allergenDetail}>{allergen.detail}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Personal alert ───────────────────────────────────────────────────────────
function PersonalBanner({
  matchedContains,
  matchedMay,
  profile,
}: {
  matchedContains: AllergenEntry[];
  matchedMay: AllergenEntry[];
  profile: ReturnType<typeof useProfile>['profile'];
}) {
  const hasMatches = matchedContains.length > 0 || matchedMay.length > 0;
  const userMap = new Map(profile.allergens.map(a => [a.key, a]));
  const accentColor = hasMatches ? '#B42318' : '#27ae60';
  const bgColor     = hasMatches ? '#FEF3F2' : '#ECFDF5';

  return (
    <View style={[s.banner, { backgroundColor: bgColor, borderColor: accentColor }]}>
      <View style={s.bannerHead}>
        <Ionicons
          name={hasMatches ? 'warning' : 'checkmark-circle'}
          size={15}
          color={accentColor}
        />
        <Text style={[s.bannerTitle, { color: accentColor }]}>Para Si</Text>
      </View>

      {hasMatches ? (
        <View style={s.bannerList}>
          {[...matchedContains.map(a => ({ a, t: 'contains' as const })),
            ...matchedMay.map(a => ({ a, t: 'may' as const }))]
            .map(({ a, t }) => {
              const sev = userMap.get(a.key)?.severity === 'severe' ? 'Grave' : 'Ligeiro';
              const c   = t === 'contains' ? '#B42318' : '#92400E';
              const dot = t === 'contains' ? '#B42318' : '#D97706';
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
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function H3DishScreen({
  restIndex,
  dishIndex,
}: {
  restIndex: number;
  dishIndex: number;
}) {
  const navigation = useNavigation();
  const restaurant = restaurants[restIndex];
  const dish = restaurant?.dishes[dishIndex];

  const { profile } = useProfile();
  const userKeys = useMemo(
    () => new Set(profile.allergens.map(a => a.key)),
    [profile.allergens]
  );
  const hasProfile = profile.allergens.length > 0;

  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: WHITE },
      headerTintColor: BLACK,
      headerShadowVisible: true,
      headerTitle: () => (
        <Image
          source={{ uri: 'https://www.h3.com/wp-content/uploads/2025/02/H3_logo_base-azul-150x150.png' }}
          style={{ width: 32, height: 32 }}
          resizeMode="contain"
        />
      ),
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
        <View style={s.page}>

          {/* ── Full-bleed photo ── */}
          <Image
            source={{ uri: DISH_IMAGE[dish.name] ?? PH }}
            style={s.photo}
            resizeMode="cover"
          />

          {/* ── Blue accent line (brand marker) ── */}
          <View style={s.blueAccent} />

          {/* ── Dish identity block ── */}
          <View style={s.identity}>
            <Text style={s.dishName}>{dish.name.toUpperCase()}</Text>
            {dish.category ? (
              <Text style={s.dishCategory}>{dish.category.toUpperCase()}</Text>
            ) : null}
            <View style={s.identityRule} />
            <Text style={s.newHamburgology}>New Hamburgology</Text>
          </View>

          {/* ── Risk summary strip ── */}
          {(hasContains || hasMay) ? (
            <View style={s.riskStrip}>
              {hasContains && (
                <View style={[s.riskPill, { borderColor: '#FECDCA', backgroundColor: '#FEF3F2' }]}>
                  <View style={[s.pillDot, { backgroundColor: '#B42318' }]} />
                  <Text style={[s.pillText, { color: '#B42318' }]}>Contém alergénios</Text>
                </View>
              )}
              {hasMay && (
                <View style={[s.riskPill, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
                  <View style={[s.pillDot, { backgroundColor: '#D97706' }]} />
                  <Text style={[s.pillText, { color: '#92400E' }]}>Pode conter</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={s.riskStrip}>
              <View style={[s.riskPill, { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}>
                <View style={[s.pillDot, { backgroundColor: '#27ae60' }]} />
                <Text style={[s.pillText, { color: '#27ae60' }]}>Sem alergénios</Text>
              </View>
            </View>
          )}

          {/* ── Body ── */}
          <View style={s.body}>

            {/* Personal alert */}
            {hasProfile && (
              <PersonalBanner
                matchedContains={matchedContains}
                matchedMay={matchedMay}
                profile={profile}
              />
            )}

            {/* Contém */}
            {hasContains && (
              <Section label="CONTÉM" accentColor="#B42318" defaultOpen>
                {dish.contains_allergens.map(a => (
                  <AllergenRow key={a.key} allergen={a} type="contains" />
                ))}
              </Section>
            )}

            {/* Pode Conter */}
            {hasMay && (
              <Section label="PODE CONTER" accentColor="#92400E" defaultOpen={!hasContains}>
                {dish.may_contain_allergens.map(a => (
                  <AllergenRow key={a.key} allergen={a} type="may" />
                ))}
              </Section>
            )}

            {/* No allergens / unknown */}
            {!hasContains && !hasMay && (
              isVerified ? (
                <View style={[s.statusCard, { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="checkmark-circle" size={26} color="#27ae60" />
                  <Text style={[s.statusTitle, { color: '#27ae60' }]}>Sem alergénios</Text>
                  <Text style={s.statusSub}>Verificado como isento de alergénios.</Text>
                </View>
              ) : (
                <View style={[s.statusCard, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
                  <Ionicons name="help-circle" size={26} color="#D97706" />
                  <Text style={[s.statusTitle, { color: '#92400E' }]}>Dados não disponíveis</Text>
                  <Text style={s.statusSub}>
                    Contacta o restaurante antes de pedir. Não temos informação verificada para este prato.
                  </Text>
                </View>
              )
            )}

            {/* Ingredientes */}
            {hasIngredients && (
              <Section label="INGREDIENTES" accentColor={BLUE} defaultOpen={false}>
                <Text style={s.ingredients}>{dish.ingredients.join(', ')}.</Text>
              </Section>
            )}
          </View>

          {/* ── Footer ── */}
          <View style={s.footer}>
            <View style={s.footerDivider} />
            <Text style={s.footerCopy}>© H3 New Hamburgology · 2007–2025</Text>
            <Text style={s.footerSub}>New Hamburgology</Text>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },

  // Centered content column — constrains width on wide screens
  page: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },

  // Full-bleed photo, 3:2 ratio
  photo: {
    width: '100%',
    aspectRatio: 3 / 2,
    backgroundColor: '#f0f0f0',
  },

  // Thin H3 blue line under the photo — brand marker
  blueAccent: {
    height: 4,
    backgroundColor: BLUE,
  },

  // Dish identity block
  identity: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  dishName: {
    fontSize: 24,
    fontWeight: '900',
    color: BLACK,
    letterSpacing: 0.3,
    lineHeight: 28,
  },
  dishCategory: {
    fontSize: 10,
    fontWeight: '600',
    color: GRAY,
    letterSpacing: 1.5,
  },
  identityRule: {
    width: 40,
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 4,
  },
  newHamburgology: {
    fontSize: 11,
    fontWeight: '400',
    color: BLUE,
    letterSpacing: 0.5,
    fontStyle: 'italic',
  },

  // Risk pills
  riskStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  riskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 2,
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Body
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },

  // Personal banner
  banner: {
    borderWidth: 1,
    borderRadius: 2,
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
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  bannerList: {
    gap: 8,
  },
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
  bannerRowText: {
    flex: 1,
    gap: 2,
  },
  bannerRowName: {
    fontSize: 13,
    fontWeight: '600',
  },
  bannerRowSub: {
    fontSize: 11,
    color: GRAY,
  },
  bannerOk: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Section
  section: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 14,
    gap: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
  },
  sectionLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  sectionBody: {
    gap: 12,
    paddingBottom: 4,
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
    marginTop: 4,
    flexShrink: 0,
  },
  allergenInfo: {
    flex: 1,
    gap: 2,
  },
  allergenEn: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  allergenPt: {
    fontSize: 12,
    color: GRAY,
  },
  allergenDetail: {
    fontSize: 12,
    color: GRAY,
    lineHeight: 17,
  },

  // Status cards
  statusCard: {
    borderWidth: 1,
    borderRadius: 2,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusSub: {
    fontSize: 13,
    color: GRAY,
    textAlign: 'center',
    lineHeight: 19,
  },

  // Ingredients
  ingredients: {
    fontSize: 14,
    color: GRAY,
    lineHeight: 22,
  },

  // Footer
  footer: {
    backgroundColor: FOOTER,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 8,
  },
  footerDivider: {
    width: 40,
    height: 2,
    backgroundColor: BLUE,
    marginBottom: 8,
  },
  footerCopy: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
  footerSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
