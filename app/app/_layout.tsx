import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ThemeProvider, useTheme } from './_theme';
import { ProfileProvider } from '../store/profileStore';

function NavigationStack() {
  const theme = useTheme();

  return (
    <>
      <StatusBar style={theme.statusBar} />
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
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="[restaurantId]"
          options={{ headerShown: true }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ProfileProvider>
        <NavigationStack />
      </ProfileProvider>
    </ThemeProvider>
  );
}
