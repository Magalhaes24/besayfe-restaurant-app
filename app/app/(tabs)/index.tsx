import { useRouter } from 'expo-router';
import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { restaurants } from '../../data';
import { useTheme, typography, space, radius } from '../_theme';

const ACCENT_SHADES = ['#73AC84', '#5C8C6E', '#4A7C5A', '#8FBF9F', '#638E74'];

function accentShade(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return ACCENT_SHADES[Math.abs(hash) % ACCENT_SHADES.length];
}

export default function RestaurantListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <FlatList
        data={restaurants}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        contentContainerStyle={s.listContent}
        renderItem={({ item, index }) => {
          const shade = accentShade(item.name);
          return (
            <Pressable
              style={({ pressed }) => [s.card, pressed && s.cardPressed]}
              android_ripple={{ color: theme.ripple, borderless: false }}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.total_dishes} pratos`}
              onPress={() => router.push(`/${index}`)}
            >
              <View style={[s.accentBar, { backgroundColor: shade }]} />
              <View style={s.cardInner}>
                <View style={[s.avatar, { backgroundColor: shade + '22' }]}>
                  <Text style={[s.avatarText, { color: shade }]}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={s.cardText}>
                  <Text style={s.restaurantName}>{item.name}</Text>
                  <Text style={s.dishCount}>{item.total_dishes} pratos</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
              </View>
            </Pressable>
          );
        }}
        ListHeaderComponent={
          <View style={s.hero}>
            <Text style={s.heroMark}>besayfe</Text>
            <Text style={s.heroTagline}>Consulta alergénios antes de pedir.</Text>
          </View>
        }
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
      paddingBottom: space['2xl'],
    },

    hero: {
      paddingTop: space['2xl'],
      paddingBottom: space.xl,
      gap: space.xs,
    },
    heroMark: {
      fontSize: 40,
      fontWeight: '800',
      letterSpacing: -1.5,
      color: theme.brandPrimary,
      lineHeight: 46,
    },
    heroTagline: {
      ...typography.body,
      color: theme.textSecondary,
    },

    card: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      marginBottom: space.sm,
      borderWidth: 1,
      borderColor: theme.borderDefault,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    cardPressed: {
      backgroundColor: theme.surfaceSubtle,
    },
    accentBar: {
      width: 4,
      alignSelf: 'stretch',
    },
    cardInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: space.base,
      gap: space.md,
    },

    avatar: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarText: {
      fontSize: 17,
      fontWeight: '700',
    },

    cardText: {
      flex: 1,
    },
    restaurantName: {
      ...typography.h3,
      color: theme.textPrimary,
      marginBottom: 2,
    },
    dishCount: {
      ...typography.caption,
      color: theme.textSecondary,
    },
  });
}
