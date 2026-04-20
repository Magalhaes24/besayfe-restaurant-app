import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ThemeProvider, useTheme } from './_theme';
import { ProfileProvider } from '../store/profileStore';
import { OrderProvider } from '../store/orderStore';
import { useFonts } from 'expo-font';

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
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="admin/index"
          options={{ headerShown: false }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_700Bold:      require('@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf'),
    Nunito_800ExtraBold: require('@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf'),
    Nunito_900Black:     require('@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <ProfileProvider>
        <OrderProvider>
          <NavigationStack />
        </OrderProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}
