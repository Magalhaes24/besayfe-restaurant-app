import { useRouter } from 'expo-router';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { restaurants } from '../data';

// Deterministic accent colour per restaurant name — 6 brand-safe hues
const AVATAR_COLORS = ['#E8541A', '#C47B0A', '#2F7EBF', '#4A9B6F', '#7B5EA7', '#BF3A3A'];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function RestaurantListScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            android_ripple={{ color: '#00000008', borderless: false }}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.total_dishes} dishes`}
            onPress={() => router.push(`/${index}`)}
          >
            <View style={styles.cardInner}>
              <View style={[styles.iconCircle, { backgroundColor: avatarColor(item.name) }]}>
                <Text style={styles.iconText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.restaurantName}>{item.name}</Text>
                <Text style={styles.dishCount}>
                  {item.total_dishes} dishes
                </Text>
              </View>
              <Text style={styles.chevron} accessibilityElementsHidden>›</Text>
            </View>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <Text style={styles.listHeader}>Restaurants</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  listHeader: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardPressed: {
    backgroundColor: '#F7F7F7',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardText: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  // #6B6B6B = 4.6:1 contrast on white — passes WCAG AA (was #888888 at 3.54:1)
  dishCount: {
    fontSize: 13,
    color: '#6B6B6B',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    color: '#BBBBBB',
  },
  separator: {
    height: 10,
  },
});
