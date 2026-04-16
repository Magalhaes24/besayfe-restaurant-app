import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#1A1A1A',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 17,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#F5F5F5' },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'besayfe', headerLargeTitle: true }}
        />
        {/* headerShown restored — dishes screen needs back affordance on web/Android */}
        <Stack.Screen
          name="[restaurantId]"
          options={{ headerShown: true }}
        />
      </Stack>
    </>
  );
}
