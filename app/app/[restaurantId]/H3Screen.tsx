import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dish, restaurants } from '../../data';
import { useProfile } from '../../store/profileStore';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const BLUE    = '#1a9ed4';
const BLACK   = '#171717';
const WHITE   = '#ffffff';
const GRAY    = '#666666';
const BORDER  = '#e8e8e8';
const FOOTER  = '#171717';

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

// ─── Allergen status line ─────────────────────────────────────────────────────
function AllergenLine({ contains, may, safe }: { contains: number; may: number; safe: boolean }) {
  if (safe) return <Text style={s.safeText}>● Seguro para si</Text>;
  if (contains === 0 && may === 0) return <Text style={s.safeText}>● Sem alergénios</Text>;
  const parts: string[] = [];
  if (contains > 0) parts.push(`${contains} contém`);
  if (may > 0)      parts.push(`${may} pode conter`);
  return <Text style={s.alertText}>● {parts.join(' · ')}</Text>;
}

// ─── Single card ──────────────────────────────────────────────────────────────
function MenuCard({
  dish,
  dishIndex,
  restIndex,
  containsCount,
  mayCount,
  isPersonalSafe,
}: {
  dish: Dish;
  dishIndex: number;
  restIndex: number;
  containsCount: number;
  mayCount: number;
  isPersonalSafe: boolean;
}) {
  const router = useRouter();
  const uri = DISH_IMAGE[dish.name] ?? PH;

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]}
      onPress={() => router.push(`/${restIndex}/${dishIndex}`)}
      accessibilityRole="button"
      accessibilityLabel={dish.name}
    >
      {/* Full-bleed food photo */}
      <Image source={{ uri }} style={s.photo} resizeMode="cover" />

      {/* Content block */}
      <View style={s.content}>
        {/* Two-part heading — hook / reveal */}
        <Text style={s.name}>{dish.name.toUpperCase()}</Text>
        {dish.category ? (
          <Text style={s.tagline}>{dish.category.toUpperCase()}</Text>
        ) : null}

        {/* Brand divider — centered horizontal rule */}
        <View style={s.rule} />

        {/* Allergen status */}
        <AllergenLine
          contains={containsCount}
          may={mayCount}
          safe={isPersonalSafe}
        />

        {/* CTA — understated, text-only */}
        <Text style={s.cta}>info nutricional</Text>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
const MAX_GRID = 800;
const GAP = 16;

export default function H3Screen({ restIndex }: { restIndex: number }) {
  const navigation = useNavigation();
  const restaurant = restaurants[restIndex];
  const { width: W } = useWindowDimensions();

  // On wide screens, push the grid inward so it stays centered in ~MAX_GRID px.
  const PAD = useMemo(() => (W > MAX_GRID + 24 ? Math.floor((W - MAX_GRID) / 2) : 12), [W]);

  const { profile } = useProfile();
  const userKeys = useMemo(
    () => new Set(profile.allergens.map(a => a.key)),
    [profile.allergens]
  );
  const hasProfileAllergens = profile.allergens.length > 0;

  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: WHITE },
      headerTintColor: BLACK,
      headerShadowVisible: true,
      headerTitle: () => (
        <Image
          source={{ uri: 'https://www.h3.com/wp-content/uploads/2025/02/H3_logo_base-azul-150x150.png' }}
          style={{ width: 34, height: 34 }}
          resizeMode="contain"
        />
      ),
    });
  }, []);

  // ── Build flat row list: 'header' | 'pair' ──────────────────────────────────
  type DishItem = { dish: Dish; dishIndex: number };
  type Row =
    | { type: 'header'; category: string; key: string }
    | { type: 'pair'; left: DishItem; right: DishItem | null; key: string };

  const rows = useMemo<Row[]>(() => {
    if (!restaurant) return [];
    const grouped = new Map<string, DishItem[]>();
    restaurant.dishes.forEach((dish, dishIndex) => {
      const cat = dish.category ?? 'Outros';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push({ dish, dishIndex });
    });

    const result: Row[] = [];
    grouped.forEach((dishes, category) => {
      result.push({ type: 'header', category, key: `h-${category}` });
      for (let i = 0; i < dishes.length; i += 2) {
        result.push({
          type: 'pair',
          left: dishes[i],
          right: dishes[i + 1] ?? null,
          key: `p-${dishes[i].dishIndex}`,
        });
      }
    });
    return result;
  }, [restaurant]);

  if (!restaurant) return null;

  const renderCard = (item: DishItem) => {
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
      <MenuCard
        dish={dish}
        dishIndex={dishIndex}
        restIndex={restIndex}
        containsCount={cf.length}
        mayCount={mf.length}
        isPersonalSafe={isPersonalSafe}
      />
    );
  };

  const footer = (
    <View style={[s.footer, { marginTop: GAP }]}>
      <View style={s.footerDivider} />
      <Text style={s.footerCopy}>© H3 New Hamburgology · 2007–2025</Text>
      <Text style={s.footerSub}>New Hamburgology</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <FlatList
        data={rows}
        keyExtractor={item => item.key}
        contentContainerStyle={{ paddingTop: 16 }}
        ListFooterComponent={footer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={[s.categoryHeader, { paddingHorizontal: PAD }]}>
                <View style={s.categoryRule} />
                <Text style={s.categoryLabel}>{item.category.toUpperCase()}</Text>
                <View style={s.categoryRule} />
              </View>
            );
          }
          return (
            <View style={[s.pair, { paddingHorizontal: PAD, gap: GAP, marginBottom: GAP }]}>
              {renderCard(item.left)}
              {item.right ? renderCard(item.right) : <View style={s.cardPlaceholder} />}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },

  // Pair row — two cards side by side
  pair: {
    flexDirection: 'row',
  },
  cardPlaceholder: {
    flex: 1,
  },

  // Category header — centered label with flanking rules
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    marginTop: 8,
  },
  categoryRule: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: GRAY,
    letterSpacing: 2,
  },

  // Card
  card: {
    flex: 1,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    overflow: 'hidden',
  },

  // Photo fills the card; aspectRatio keeps height proportional
  photo: {
    width: '100%',
    aspectRatio: 3 / 2,
    backgroundColor: '#f0f0f0',
  },

  // Content block below the photo
  content: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 5,
  },

  // Dish name — heavy weight, uppercase, tight tracking
  name: {
    fontSize: 13,
    fontWeight: '800',
    color: BLACK,
    letterSpacing: 0.3,
    lineHeight: 17,
  },

  // Tagline / category — lighter, smaller, grey
  tagline: {
    fontSize: 10,
    fontWeight: '500',
    color: GRAY,
    letterSpacing: 1.0,
  },

  // Centred horizontal divider — the H3 brand separator
  rule: {
    height: 1,
    width: 32,
    backgroundColor: BORDER,
    alignSelf: 'center',
    marginVertical: 3,
  },

  // Allergen status lines
  safeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#27ae60',
    letterSpacing: 0.2,
  },
  alertText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B42318',
    letterSpacing: 0.2,
  },

  // "info nutricional" — understated text link
  cta: {
    fontSize: 11,
    fontWeight: '600',
    color: BLUE,
    letterSpacing: 0.2,
    marginTop: 1,
    textDecorationLine: 'underline',
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
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.5,
  },
  footerSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
