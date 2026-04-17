import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../../../store/profileStore';
import { MASTER_ALLERGENS, type AllergenSeverity } from '../../../data/allergens';
import { useTheme, typography, space, radius, shadow } from '../../_theme';

export default function AddAllergenScreen() {
  const router = useRouter();
  const { profile, addAllergen } = useProfile();
  const theme = useTheme();

  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [severity, setSeverity] = useState<AllergenSeverity>('mild');
  const [notes, setNotes] = useState('');

  const s = makeStyles(theme);

  const existingKeys = new Set(profile.allergens.map(a => a.key));
  const filtered = useMemo(() => {
    return MASTER_ALLERGENS.filter(
      a =>
        !existingKeys.has(a.key) &&
        (a.name_pt.toLowerCase().includes(search.toLowerCase()) ||
          a.name_en.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search, existingKeys]);

  const selectedAllergen = MASTER_ALLERGENS.find(a => a.key === selectedKey);

  const handleAdd = async () => {
    if (!selectedKey) return;
    await addAllergen({
      key: selectedKey,
      severity,
      notes,
      addedAt: new Date().toISOString(),
    });
    router.back();
  };

  const severityOptions: Array<{
    value: AllergenSeverity;
    label: string;
    icon: 'alert-circle' | 'alert-circle-outline';
    color: string;
  }> = [
    { value: 'mild', label: 'Ligeiro', icon: 'alert-circle-outline', color: theme.riskMedAccent },
    { value: 'severe', label: 'Grave', icon: 'alert-circle', color: theme.riskHighAccent },
  ];

  if (selectedAllergen) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.confirmScroll} keyboardShouldPersistTaps="handled">
          {/* Allergen display card */}
          <View style={s.allergenCard}>
            <View style={s.allergenCardIcon}>
              <Ionicons name="leaf" size={24} color={theme.brandPrimary} />
            </View>
            <Text style={s.allergenCardTitle}>{selectedAllergen.name_pt}</Text>
            <Text style={s.allergenCardSubtitle}>{selectedAllergen.name_en}</Text>
          </View>

          {/* Severity */}
          <View style={s.formSection}>
            <Text style={s.formLabel}>Nível de Severidade</Text>
            <View style={s.severityRow}>
              {severityOptions.map(opt => {
                const isSelected = severity === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      s.severityBtn,
                      isSelected && {
                        borderColor: opt.color,
                        backgroundColor: opt.color + '15',
                      },
                    ]}
                    onPress={() => setSeverity(opt.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={opt.label}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={isSelected ? opt.color : theme.textTertiary}
                    />
                    <Text
                      style={[
                        s.severityBtnLabel,
                        { color: isSelected ? opt.color : theme.textSecondary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          <View style={s.formSection}>
            <Text style={s.formLabel}>Notas (Opcional)</Text>
            <TextInput
              style={[s.notesInput, { borderColor: theme.borderDefault, color: theme.textPrimary }]}
              placeholder="Ex: Reação apenas quando cru"
              placeholderTextColor={theme.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Actions */}
          <View style={s.actionRow}>
            <Pressable
              style={({ pressed }) => [s.cancelBtn, pressed && s.cancelBtnPressed]}
              onPress={() => {
                setSelectedKey(null);
                setNotes('');
                setSeverity('mild');
              }}
            >
              <Text style={s.cancelBtnText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.addBtn, pressed && s.addBtnPressed]}
              onPress={handleAdd}
            >
              <Text style={s.addBtnText}>Adicionar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.headerBlock}>
        <Text style={s.screenTitle}>Adicionar Alergénio</Text>
        <Text style={s.screenSubtitle}>Selecione uma alergia alimentar.</Text>
      </View>

      <View style={s.searchBlock}>
        <View style={s.searchWrapper}>
          <Ionicons name="search-outline" size={18} color={theme.textTertiary} />
          <TextInput
            style={[s.searchInput, { color: theme.textPrimary }]}
            placeholder="Procurar alergénio..."
            placeholderTextColor={theme.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} accessibilityLabel="Limpar pesquisa">
              <Ionicons name="close-circle" size={16} color={theme.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.key}
        contentContainerStyle={s.listContent}
        renderItem={({ item, index }) => {
          const isFirst = index === 0;
          const isLast = index === filtered.length - 1;
          return (
            <Pressable
              style={({ pressed }) => [
                s.allergenRow,
                isFirst && s.allergenRowFirst,
                isLast && s.allergenRowLast,
                pressed && s.allergenRowPressed,
              ]}
              onPress={() => setSelectedKey(item.key)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name_pt}, ${item.name_en}`}
            >
              <View style={s.allergenRowContent}>
                <View>
                  <Text style={s.allergenPrimary}>{item.name_pt}</Text>
                  <Text style={s.allergenSecondary}>{item.name_en}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={theme.textTertiary} />
              </View>
              {!isLast && <View style={s.rowSeparator} />}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyBlock}>
            <Ionicons name="search-outline" size={32} color={theme.textTertiary} />
            <Text style={s.emptyText}>
              {search ? 'Nenhum resultado encontrado.' : 'Todos os alergénios já foram adicionados.'}
            </Text>
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

    // Search screen
    headerBlock: {
      paddingHorizontal: space.base,
      paddingTop: space.base,
      paddingBottom: space.sm,
      gap: space.xs,
    },
    screenTitle: {
      ...typography.h2,
      color: theme.textPrimary,
    },
    screenSubtitle: {
      ...typography.bodySmall,
      color: theme.textSecondary,
    },

    searchBlock: {
      paddingHorizontal: space.base,
      paddingVertical: space.sm,
    },
    searchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.borderDefault,
      borderRadius: radius.md,
      paddingHorizontal: space.base,
      gap: space.sm,
    },
    searchInput: {
      flex: 1,
      ...typography.body,
      paddingVertical: space.sm,
    },

    listContent: {
      paddingHorizontal: space.base,
      paddingBottom: space.xl,
    },

    // Grouped allergen rows
    allergenRow: {
      backgroundColor: theme.surface,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: theme.borderDefault,
    },
    allergenRowFirst: {
      borderTopWidth: 1,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
    },
    allergenRowLast: {
      borderBottomWidth: 1,
      borderBottomLeftRadius: radius.lg,
      borderBottomRightRadius: radius.lg,
    },
    allergenRowPressed: {
      backgroundColor: theme.surfaceSubtle,
    },
    allergenRowContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.base,
      paddingVertical: space.md,
    },
    allergenPrimary: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '600',
    },
    allergenSecondary: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: 2,
    },
    rowSeparator: {
      height: 1,
      backgroundColor: theme.borderDefault,
      marginLeft: space.base,
    },

    emptyBlock: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space['2xl'],
      gap: space.md,
    },
    emptyText: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center',
    },

    // Confirmation screen
    confirmScroll: {
      paddingHorizontal: space.base,
      paddingTop: space.lg,
      paddingBottom: space['3xl'],
      gap: space.xl,
    },

    allergenCard: {
      backgroundColor: theme.surface,
      borderRadius: radius.xl,
      padding: space.xl,
      alignItems: 'center',
      gap: space.sm,
      borderWidth: 1,
      borderColor: theme.borderDefault,
      ...shadow.card,
    },
    allergenCardIcon: {
      width: 56,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: theme.brandSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space.xs,
    },
    allergenCardTitle: {
      ...typography.h2,
      color: theme.textPrimary,
      textAlign: 'center',
    },
    allergenCardSubtitle: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
    },

    formSection: {
      gap: space.sm,
    },
    formLabel: {
      ...typography.label,
      color: theme.textSecondary,
    },

    severityRow: {
      flexDirection: 'row',
      gap: space.sm,
    },
    severityBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.sm,
      paddingVertical: space.base,
      paddingHorizontal: space.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.borderDefault,
      backgroundColor: theme.surface,
    },
    severityBtnLabel: {
      ...typography.body,
      fontWeight: '600',
    },

    notesInput: {
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: space.base,
      paddingVertical: space.sm,
      minHeight: 80,
      textAlignVertical: 'top',
      ...typography.body,
      backgroundColor: theme.surface,
    },

    actionRow: {
      flexDirection: 'row',
      gap: space.sm,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: space.base,
      borderRadius: radius.md,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.borderDefault,
      alignItems: 'center',
    },
    cancelBtnPressed: {
      backgroundColor: theme.surfaceSubtle,
    },
    cancelBtnText: {
      ...typography.body,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    addBtn: {
      flex: 1,
      paddingVertical: space.base,
      borderRadius: radius.md,
      backgroundColor: theme.brandPrimary,
      alignItems: 'center',
    },
    addBtnPressed: {
      opacity: 0.85,
    },
    addBtnText: {
      ...typography.body,
      color: '#FFFFFF',
      fontWeight: '600',
    },
  });
}
