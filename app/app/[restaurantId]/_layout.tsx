import { Stack, useLocalSearchParams } from 'expo-router';
import { restaurants } from '../../data';
import { useTheme } from '../_theme';
import React from 'react';

export default function RestaurantLayout() {
  const theme = useTheme();
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const index = parseInt(restaurantId ?? '0', 10);
  const restaurant = restaurants[index];
  const name = restaurant?.name ?? 'Restaurant';

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
      <Stack.Screen name="index" options={{ title: name }} />
      <Stack.Screen name="[dishId]" options={{ title: '' }} />
    </Stack>
  );
}
