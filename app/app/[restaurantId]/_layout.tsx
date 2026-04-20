import { Stack } from 'expo-router';
import { useTheme } from '../_theme';
import React from 'react';

export default function RestaurantLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.headerBg },
        headerTintColor: theme.brandPrimary,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
          color: theme.headerText,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: '' }} />
      <Stack.Screen name="[dishId]" options={{ title: '' }} />
    </Stack>
  );
}
