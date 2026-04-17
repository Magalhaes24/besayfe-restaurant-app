import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTheme } from '../_theme';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.borderDefault,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: theme.brandPrimary,
        tabBarInactiveTintColor: theme.navInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Restaurantes',
          tabBarIcon: ({ color }) => (
            <Ionicons name="restaurant-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-circle-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
