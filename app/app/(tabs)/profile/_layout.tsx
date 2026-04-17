import { Stack } from 'expo-router';
import { useTheme } from '../../_theme';
import React from 'react';

export default function ProfileLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.headerBg },
        headerTintColor: theme.brandPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
          color: theme.headerText,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Meus Alergénios',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Adicionar Alergénio',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
