import { Stack, useLocalSearchParams } from 'expo-router';
import { restaurants } from '../../data';

export default function RestaurantLayout() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const index = parseInt(restaurantId ?? '0', 10);
  const restaurant = restaurants[index];
  const name = restaurant?.name ?? 'Restaurant';

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#1A1A1A',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#F5F5F5' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: name }}
      />
      <Stack.Screen
        name="[dishId]"
        options={{ title: '' }}
      />
    </Stack>
  );
}
