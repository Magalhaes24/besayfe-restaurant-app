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
import { useProfile } from '../../../store/profileStore';
import { MASTER_ALLERGENS } from '../../../data/allergens';
import { useTheme, typography, space, radius, shadow } from '../../_theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, removeAllergen, loading } = useProfile();
  const theme = useTheme();
  const s = makeStyles(theme);

  const allergenNames = new Map(MASTER_ALLERGENS.map(a => [a.key, a.name_pt]));

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['bottom']}>
        <View style={s.centerContent}>
          <Text style={s.loadingText}>A carregar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isEmpty = profile.allergens.length === 0;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <FlatList
        data={profile.allergens}
        keyExtractor={item => item.key}
        contentContainerStyle={s.listContent}
        scrollEnabled={!isEmpty}
        renderItem={({ item }) => {
          const allergenName = allergenNames.get(item.key) || item.key;
          const isSevere = item.severity === 'severe';
          const severityLabel = isSevere ? 'Grave' : 'Ligeiro';
          const severityColor = isSevere ? theme.riskHighAccent : theme.riskMedAccent;

          return (
            <View style={[s.allergenCard, { borderLeftColor: severityColor }]}>
              <View style={s.allergenHeader}>
                <View style={s.allergenInfo}>
                  <Text style={s.allergenName}>{allergenName}</Text>
                  <Text style={[s.severityText, { color: severityColor }]}>
                    {severityLabel}
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [s.removeButton, pressed && s.removeButtonPressed]}
                  onPress={() => removeAllergen(item.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${allergenName}`}
                >
                  <Ionicons name="close" size={16} color={theme.textSecondary} />
                </Pressable>
              </View>
              {item.notes ? (
                <Text style={s.allergenNotes}>{item.notes}</Text>
              ) : null}
            </View>
          );
        }}
        ListHeaderComponent={
          <View style={s.headerBlock}>
            <Text style={s.screenTitle}>Meus Alergénios</Text>
            <Text style={s.screenSubtitle}>
              Personalize os seus avisos de alergénios para ver alertas em tempo real nos menus.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={s.emptyStateBlock}>
            <View style={s.emptyIconWrapper}>
              <Ionicons name="leaf-outline" size={40} color={theme.brandPrimary} />
            </View>
            <Text style={s.emptyTitle}>Nenhum alergénio</Text>
            <Text style={s.emptyMessage}>
              Adicione as suas alergias alimentares para receber avisos personalizados ao consultar menus.
            </Text>
          </View>
        }
      />

      <Pressable
        style={({ pressed }) => [s.fab, pressed && s.fabPressed]}
        onPress={() => router.push('/(tabs)/profile/add')}
        accessibilityRole="button"
        accessibilityLabel="Adicionar alergénio"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
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
      paddingBottom: space['3xl'],
    },

    centerContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      ...typography.body,
      color: theme.textSecondary,
    },

    headerBlock: {
      marginTop: space['2xl'],
      marginBottom: space.xl,
      gap: space.xs,
    },
    screenTitle: {
      fontSize: 40,
      fontWeight: '800',
      letterSpacing: -1.5,
      color: theme.textPrimary,
      lineHeight: 46,
    },
    screenSubtitle: {
      ...typography.body,
      color: theme.textSecondary,
      lineHeight: 22,
    },

    emptyStateBlock: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space['3xl'],
      gap: space.md,
    },
    emptyIconWrapper: {
      width: 72,
      height: 72,
      borderRadius: radius.full,
      backgroundColor: theme.brandSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space.sm,
    },
    emptyTitle: {
      ...typography.h2,
      color: theme.textPrimary,
      textAlign: 'center',
    },
    emptyMessage: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center',
      maxWidth: '80%',
      lineHeight: 22,
    },

    // Allergen card: left severity bar instead of filled badge
    allergenCard: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: space.base,
      marginBottom: space.sm,
      borderLeftWidth: 4,
      borderWidth: 1,
      borderColor: theme.borderDefault,
      ...shadow.card,
    },
    allergenHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    allergenInfo: {
      flex: 1,
      gap: 3,
    },
    allergenName: {
      ...typography.h3,
      color: theme.textPrimary,
    },
    severityText: {
      ...typography.caption,
      fontWeight: '600',
    },
    allergenNotes: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      marginTop: space.sm,
      fontStyle: 'italic',
    },

    removeButton: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceSubtle,
      marginLeft: space.md,
    },
    removeButtonPressed: {
      backgroundColor: theme.borderDefault,
    },

    fab: {
      position: 'absolute',
      bottom: space.xl,
      right: space.base,
      width: 56,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: theme.brandPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.floating,
    },
    fabPressed: {
      opacity: 0.85,
    },
  });
}
