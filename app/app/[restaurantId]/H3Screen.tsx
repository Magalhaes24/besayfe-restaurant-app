import { useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Dish, restaurants } from '../../data';
import { useProfile } from '../../store/profileStore';
import { useOrders, Order } from '../../store/orderStore';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const BLUE   = '#1a9ed4';
const BLACK  = '#171717';
const WHITE  = '#ffffff';
const GRAY   = '#666666';
const BORDER = '#e8e8e8';
const FOOTER = '#171717';
const DANGER = '#B42318';
const GREEN  = '#27ae60';

// ─── Price map (approximate) ──────────────────────────────────────────────────
const DISH_PRICE: Record<string, number> = {
  'Grelhado': 9.50,
  'Limão': 9.90,
  'Com molho': 9.90,
  'Tuga': 10.50,
  'Dente de alho': 10.50,
  'Louro': 10.50,
  'Champignon': 10.90,
  'Cheese': 10.90,
  'Med': 11.50,
  'Carbonara': 11.50,
  'Benedict': 11.90,
  'French': 12.50,
  'Superbread': 11.90,
  'Pica-Pau (Refresh)': 12.90,
  'Croquetes*': 4.50,
  'Salada BLT*': 5.90,
  'Grelhado no pão': 8.90,
  'Tuga no pão': 9.50,
  'Med no pão': 10.50,
  'Carbonara no pão': 10.50,
  'Cheese no pão': 9.90,
  'Cheese Bacon no pão': 10.50,
  'Benedict no pão': 10.90,
  'Arroz Thai': 4.90,
  'Salada c/ vinagreta h3': 4.90,
  'Limonada de limão': 2.90,
  'Limonada de morango': 2.90,
  'Limonada de maracujá': 2.90,
  'Limonada de romã': 2.90,
  'Chá preto': 1.50,
  'Chá de limão': 1.50,
  'Cerveja': 2.50,
  'Vinho': 3.50,
  'M. mousse doce de leite': 3.90,
  'M. mousse de avelã e choc.': 3.90,
  'Mousse de chocolate h3': 3.90,
  'Everydae de morango*': 4.50,
  'Everydae de maracujá*': 4.50,
  'Everydae de caramelo*': 4.50,
  'Pavlova de morango*': 4.90,
  'Pavlova de maracujá*': 4.90,
  'Bolo de chocolate*': 4.90,
};

const getPrice = (dish: Dish) => DISH_PRICE[dish.name] ?? 9.90;

// ─── Dish → image map ─────────────────────────────────────────────────────────
const CDN = 'https://www.h3.com/wp-content/uploads';
const B   = `${CDN}/2025/03/H3_Site_Hamburgueres_640x356_Benedictementa`;
const N   = `${CDN}/2025/02/imagem-com-nome`;
const PH  = 'https://blocks.astratic.com/img/general-img-landscape.png';

const DISH_IMAGE: Record<string, string> = {
  'Grelhado':                   `${B}-02.png`,
  'Limão':                      `${B}-02.png`,
  'Com molho':                  `${B}-03.png`,
  'Tuga':                       `${B}-05.png`,
  'Dente de alho':              `${B}-05.png`,
  'Louro':                      `${B}-05.png`,
  'Champignon':                 `${B}-04.png`,
  'Cheese':                     `${B}-08.png`,
  'Med':                        `${B}-06.png`,
  'Carbonara':                  `${B}-07.png`,
  'Benedict':                   `${B}-09.png`,
  'French':                     `${CDN}/2025/06/H3_Francesinha_Site_Barra_1334x888.jpg`,
  'Superbread':                 `${B}-11.png`,
  'Pica-Pau (Refresh)':         `${CDN}/2025/10/H3_PicaPau_Site_Barra_1334x888_Selo.jpg`,
  'Croquetes*':                 `${N}-33.png`,
  'Salada BLT*':                `${N}-37.png`,
  'Grelhado no pão':            `${B}-11.png`,
  'Tuga no pão':                `${B}-11.png`,
  'Med no pão':                 `${B}-11.png`,
  'Carbonara no pão':           `${B}-11.png`,
  'Cheese no pão':              `${B}-11.png`,
  'Cheese Bacon no pão':        `${B}-11.png`,
  'Benedict no pão':            `${B}-11.png`,
  'Arroz Thai':                 `${N}-34.png`,
  'Salada c/ vinagreta h3':     `${N}-37.png`,
  'Limonada de limão':          `${N}-38.png`,
  'Limonada de morango':        `${N}-38.png`,
  'Limonada de maracujá':       `${N}-38.png`,
  'Limonada de romã':           `${N}-38.png`,
  'Chá preto':                  `${N}-38.png`,
  'Chá de limão':               `${N}-38.png`,
  'Cerveja':                    `${N}-38.png`,
  'Vinho':                      `${N}-38.png`,
  'M. mousse doce de leite':    `${N}-39.png`,
  'M. mousse de avelã e choc.': `${N}-39.png`,
  'Mousse de chocolate h3':     `${N}-40.png`,
  'Everydae de morango*':       `${N}-42.png`,
  'Everydae de maracujá*':      `${N}-42.png`,
  'Everydae de caramelo*':      `${N}-42.png`,
  'Pavlova de morango*':        `${N}-39.png`,
  'Pavlova de maracujá*':       `${N}-39.png`,
  'Bolo de chocolate*':         `${N}-41.png`,
};

// ─── Allergen status line ─────────────────────────────────────────────────────
function AllergenLine({ contains, may, safe }: { contains: number; may: number; safe: boolean }) {
  if (safe) return <Text style={s.safeText}>● Seguro para si</Text>;
  if (contains === 0 && may === 0) return <Text style={s.safeText}>● Sem alergénios</Text>;
  const parts: string[] = [];
  if (contains > 0) parts.push(`${contains} contém`);
  if (may > 0)      parts.push(`${may} pode conter`);
  return <Text style={s.alertText}>● {parts.join(' · ')}</Text>;
}

// ─── Single card ──────────────────────────────────────────────────────────────
function MenuCard({
  dish, dishIndex, restIndex,
  containsCount, mayCount, isPersonalSafe, hasMatchingAllergens,
  quantity, onAdd, onIncrement, onDecrement,
}: {
  dish: Dish; dishIndex: number; restIndex: number;
  containsCount: number; mayCount: number; isPersonalSafe: boolean; hasMatchingAllergens: boolean;
  quantity: number; onAdd: () => void; onIncrement: () => void; onDecrement: () => void;
}) {
  const router = useRouter();
  const uri = DISH_IMAGE[dish.name] ?? PH;
  const price = getPrice(dish);

  const pressScale = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(quantity > 0 ? 1 : 0)).current;
  const prevQty = useRef(quantity);

  useEffect(() => {
    const prev = prevQty.current;
    prevQty.current = quantity;
    if (quantity > 0 && quantity !== prev) {
      badgeScale.setValue(prev === 0 ? 0.3 : 1);
      Animated.spring(badgeScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 9,
        stiffness: 350,
      }).start();
    } else if (quantity === 0) {
      Animated.spring(badgeScale, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 300,
      }).start();
    }
  }, [quantity]);

  const onPressIn = useCallback(() =>
    Animated.spring(pressScale, { toValue: 0.96, useNativeDriver: true, damping: 20, stiffness: 400 }).start(),
  []);
  const onPressOut = useCallback(() =>
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 180 }).start(),
  []);

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: pressScale }] }}>
      <Pressable
        style={[s.card, hasMatchingAllergens && s.cardDanger]}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => router.push(`/${restIndex}/${dishIndex}`)}
        accessibilityRole="button"
        accessibilityLabel={dish.name}
      >
        <Image source={{ uri }} style={s.photo} resizeMode="cover" />

        <Animated.View style={[s.quantityBadge, { transform: [{ scale: badgeScale }] }]}>
          {quantity > 0 && <Text style={s.quantityBadgeText}>{quantity}</Text>}
        </Animated.View>

        <View style={s.content}>
          <Text style={s.name}>{dish.name.toUpperCase()}</Text>
          {dish.category ? <Text style={s.tagline}>{dish.category.toUpperCase()}</Text> : null}
          <View style={s.rule} />
          <AllergenLine contains={containsCount} may={mayCount} safe={isPersonalSafe} />
          <View style={s.cardFooter}>
            <Text style={s.price}>{price.toFixed(2)} €</Text>
            {quantity === 0 ? (
              <TouchableOpacity style={s.addBtn} onPress={(e) => { e.stopPropagation?.(); onAdd(); }} hitSlop={8}>
                <Ionicons name="add" size={18} color={WHITE} />
              </TouchableOpacity>
            ) : (
              <View style={s.qtyControls}>
                <TouchableOpacity style={s.qtyBtn} onPress={(e) => { e.stopPropagation?.(); onDecrement(); }} hitSlop={8}>
                  <Ionicons name="remove" size={14} color={BLUE} />
                </TouchableOpacity>
                <Text style={s.qtyText}>{quantity}</Text>
                <TouchableOpacity style={[s.qtyBtn, s.qtyBtnFilled]} onPress={(e) => { e.stopPropagation?.(); onIncrement(); }} hitSlop={8}>
                  <Ionicons name="add" size={14} color={WHITE} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Cart Modal ───────────────────────────────────────────────────────────────
type OrderType = 'mesa' | 'takeaway';
type Step = 'cart' | 'details' | 'success';

function CartModal({
  visible, onClose, onClearCart, onPlaceOrder,
  cart, dishes,
  onIncrement, onDecrement, onRemove,
  totalItems, totalPrice,
}: {
  visible: boolean; onClose: () => void; onClearCart: () => void;
  onPlaceOrder: (order: Omit<Order, 'id' | 'createdAt'>) => void;
  cart: Record<number, number>; dishes: Dish[];
  onIncrement: (idx: number) => void; onDecrement: (idx: number) => void; onRemove: (idx: number) => void;
  totalItems: number; totalPrice: number;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('cart');
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [expandedNote, setExpandedNote] = useState<number | null>(null);
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderRef] = useState(() => `H3-${Math.floor(Math.random() * 9000) + 1000}`);

  useEffect(() => {
    if (visible) setStep('cart');
  }, [visible]);

  const handleClose = () => {
    if (step === 'success') onClearCart();
    setStep('cart');
    setOrderType(null);
    setTableNumber('');
    setCustomerName('');
    setNotes({});
    setExpandedNote(null);
    onClose();
  };

  const canProceedToDetails = totalItems > 0;
  const canPlaceOrder =
    orderType !== null &&
    (orderType === 'mesa' ? tableNumber.trim().length > 0 : customerName.trim().length > 0);

  const cartEntries = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([idx, qty]) => ({ idx: +idx, dish: dishes[+idx], qty }));

  // ── Step: Cart ──────────────────────────────────────────────────────────────
  const renderCart = () => (
    <>
      <View style={sm.header}>
        <Text style={sm.headerTitle}>O meu pedido</Text>
        <View style={sm.headerActions}>
          <TouchableOpacity onPress={onClearCart} hitSlop={10} style={sm.clearBtn}>
            <Ionicons name="trash-outline" size={16} color={DANGER} />
            <Text style={sm.clearText}>Limpar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} hitSlop={10} style={{ marginLeft: 12 }}>
            <Ionicons name="close" size={22} color={BLACK} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={sm.divider} />

      <ScrollView style={sm.itemList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {cartEntries.map(({ idx, dish, qty }) => (
          <View key={idx}>
            <View style={sm.item}>
              <View style={sm.itemInfo}>
                <Text style={sm.itemName}>{dish.name.toUpperCase()}</Text>
                <Text style={sm.itemPrice}>{(getPrice(dish) * qty).toFixed(2)} €</Text>
              </View>
              <View style={sm.itemRight}>
                <TouchableOpacity
                  style={sm.noteIcon}
                  onPress={() => setExpandedNote(expandedNote === idx ? null : idx)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={notes[idx] ? 'chatbubble' : 'chatbubble-outline'}
                    size={15}
                    color={notes[idx] ? BLUE : GRAY}
                  />
                </TouchableOpacity>
                <View style={sm.itemControls}>
                  <TouchableOpacity
                    style={sm.ctrlBtn}
                    onPress={() => (qty === 1 ? onRemove(idx) : onDecrement(idx))}
                    hitSlop={8}
                  >
                    <Ionicons name={qty === 1 ? 'trash-outline' : 'remove'} size={14} color={BLUE} />
                  </TouchableOpacity>
                  <Text style={sm.ctrlQty}>{qty}</Text>
                  <TouchableOpacity style={[sm.ctrlBtn, sm.ctrlBtnFilled]} onPress={() => onIncrement(idx)} hitSlop={8}>
                    <Ionicons name="add" size={14} color={WHITE} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            {expandedNote === idx && (
              <TextInput
                style={sm.noteInput}
                placeholder="Nota para este item (sem cebola, bem passado…)"
                placeholderTextColor={GRAY}
                value={notes[idx] ?? ''}
                onChangeText={text => setNotes(prev => ({ ...prev, [idx]: text }))}
                multiline
                autoFocus
              />
            )}
          </View>
        ))}
      </ScrollView>

      <View style={sm.divider} />

      <View style={sm.totalRow}>
        <Text style={sm.totalLabel}>Total</Text>
        <Text style={sm.totalValue}>{totalPrice.toFixed(2)} €</Text>
      </View>

      <TouchableOpacity
        style={[sm.primaryBtn, !canProceedToDetails && sm.primaryBtnDisabled]}
        onPress={() => canProceedToDetails && setStep('details')}
        activeOpacity={0.85}
      >
        <Text style={sm.primaryBtnText}>Continuar</Text>
        <Ionicons name="arrow-forward" size={16} color={WHITE} />
      </TouchableOpacity>
    </>
  );

  // ── Step: Details ───────────────────────────────────────────────────────────
  const renderDetails = () => (
    <>
      <View style={sm.header}>
        <TouchableOpacity onPress={() => setStep('cart')} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={BLACK} />
        </TouchableOpacity>
        <Text style={sm.headerTitle}>Detalhes</Text>
        <TouchableOpacity onPress={handleClose} hitSlop={10}>
          <Ionicons name="close" size={22} color={BLACK} />
        </TouchableOpacity>
      </View>

      <View style={sm.divider} />

      <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={sm.sectionLabel}>Tipo de pedido</Text>
        <View style={sm.orderTypeRow}>
          <TouchableOpacity
            style={[sm.orderTypeBtn, orderType === 'mesa' && sm.orderTypeBtnActive]}
            onPress={() => setOrderType('mesa')}
          >
            <Ionicons name="restaurant-outline" size={22} color={orderType === 'mesa' ? WHITE : BLACK} />
            <Text style={[sm.orderTypeTxt, orderType === 'mesa' && sm.orderTypeTxtActive]}>Mesa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[sm.orderTypeBtn, orderType === 'takeaway' && sm.orderTypeBtnActive]}
            onPress={() => setOrderType('takeaway')}
          >
            <Ionicons name="bag-handle-outline" size={22} color={orderType === 'takeaway' ? WHITE : BLACK} />
            <Text style={[sm.orderTypeTxt, orderType === 'takeaway' && sm.orderTypeTxtActive]}>Takeaway</Text>
          </TouchableOpacity>
        </View>

        {orderType === 'mesa' && (
          <>
            <Text style={sm.sectionLabel}>Número da mesa</Text>
            <TextInput
              style={sm.textField}
              placeholder="Ex: 12"
              placeholderTextColor={GRAY}
              keyboardType="number-pad"
              value={tableNumber}
              onChangeText={setTableNumber}
              autoFocus
            />
          </>
        )}

        {orderType === 'takeaway' && (
          <>
            <Text style={sm.sectionLabel}>Nome para o pedido</Text>
            <TextInput
              style={sm.textField}
              placeholder="O seu nome"
              placeholderTextColor={GRAY}
              value={customerName}
              onChangeText={setCustomerName}
              autoFocus
            />
          </>
        )}

        <View style={sm.divider} />

        <View style={sm.summaryBox}>
          <Text style={sm.summaryTitle}>Resumo</Text>
          {cartEntries.map(({ idx, dish, qty }) => (
            <View key={idx} style={sm.summaryRow}>
              <Text style={sm.summaryQty}>{qty}×</Text>
              <Text style={sm.summaryName}>{dish.name}</Text>
              <Text style={sm.summaryPrice}>{(getPrice(dish) * qty).toFixed(2)} €</Text>
            </View>
          ))}
          <View style={sm.divider} />
          <View style={sm.totalRow}>
            <Text style={sm.totalLabel}>Total</Text>
            <Text style={sm.totalValue}>{totalPrice.toFixed(2)} €</Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[sm.primaryBtn, !canPlaceOrder && sm.primaryBtnDisabled]}
        onPress={() => {
          if (!canPlaceOrder || !orderType) return;
          onPlaceOrder({
            ref: orderRef,
            type: orderType,
            table: orderType === 'mesa' ? tableNumber : undefined,
            customerName: orderType === 'takeaway' ? customerName : undefined,
            items: cartEntries.map(({ idx, dish, qty }) => ({
              dishIndex: idx,
              dishName: dish.name,
              qty,
              price: getPrice(dish),
              note: notes[idx] || undefined,
            })),
            total: totalPrice,
            status: 'pending',
          });
          setStep('success');
        }}
        activeOpacity={0.85}
      >
        <Text style={sm.primaryBtnText}>Fazer Pedido</Text>
      </TouchableOpacity>
    </>
  );

  // ── Step: Success ───────────────────────────────────────────────────────────
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step === 'success') {
      successScale.setValue(0.4);
      successOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true, damping: 11, stiffness: 280 }),
        Animated.timing(successOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [step]);

  const renderSuccess = () => (
    <Animated.View style={[sm.successContainer, { opacity: successOpacity }]}>
      <Animated.View style={[sm.successIcon, { transform: [{ scale: successScale }] }]}>
        <Ionicons name="checkmark" size={40} color={WHITE} />
      </Animated.View>
      <Text style={sm.successTitle}>Pedido enviado!</Text>
      <Text style={sm.successRef}>{orderRef}</Text>
      <Text style={sm.successSub}>
        {orderType === 'mesa'
          ? `Mesa ${tableNumber} · ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`
          : `Takeaway · ${customerName} · ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`}
      </Text>
      <Text style={sm.successTotal}>{totalPrice.toFixed(2)} €</Text>

      <View style={sm.successDivider} />

      <View style={sm.successItems}>
        {cartEntries.map(({ idx, dish, qty }) => (
          <View key={idx} style={sm.summaryRow}>
            <Text style={sm.summaryQty}>{qty}×</Text>
            <Text style={sm.summaryName}>{dish.name}</Text>
            <Text style={sm.summaryPrice}>{(getPrice(dish) * qty).toFixed(2)} €</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[sm.primaryBtn, { marginTop: 24 }]} onPress={handleClose} activeOpacity={0.85}>
        <Text style={sm.primaryBtnText}>Fechar</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={sm.overlay}>
          <Pressable style={sm.backdrop} onPress={step !== 'success' ? handleClose : undefined} />
          <View style={[sm.sheet, { paddingBottom: insets.bottom + 16 }]}>
            {step === 'cart' && renderCart()}
            {step === 'details' && renderDetails()}
            {step === 'success' && renderSuccess()}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
const MAX_GRID = 800;
const GAP = 16;

export default function H3Screen({ restIndex }: { restIndex: number }) {
  const navigation = useNavigation();
  const router = useRouter();
  const restaurant = restaurants[restIndex];
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const tabScrollRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});

  const PAD = useMemo(() => (W > MAX_GRID + 24 ? Math.floor((W - MAX_GRID) / 2) : 12), [W]);

  const { profile } = useProfile();
  const userKeys = useMemo(() => new Set(profile.allergens.map(a => a.key)), [profile.allergens]);
  const hasProfileAllergens = profile.allergens.length > 0;

  const { addOrder } = useOrders();
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);

  // ── Secret admin access: tap logo 7× → PIN modal ────────────────────────────
  const logoTapCount = useRef(0);
  const logoTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pinVisible, setPinVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const ADMIN_PIN = '1234';

  const handleLogoTap = useCallback(() => {
    logoTapCount.current += 1;
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);
    logoTapTimer.current = setTimeout(() => { logoTapCount.current = 0; }, 1500);
    if (logoTapCount.current >= 7) {
      logoTapCount.current = 0;
      setPinVisible(true);
      setPin('');
      setPinError(false);
    }
  }, []);

  const totalItems = useMemo(() => Object.values(cart).reduce((s, q) => s + q, 0), [cart]);
  const totalPrice = useMemo(() =>
    Object.entries(cart).reduce((s, [idx, q]) => {
      const dish = restaurant?.dishes[+idx];
      return dish ? s + getPrice(dish) * q : s;
    }, 0),
  [cart, restaurant]);

  const addToCart     = useCallback((idx: number) => setCart(prev => ({ ...prev, [idx]: (prev[idx] ?? 0) + 1 })), []);
  const decrementCart = useCallback((idx: number) => setCart(prev => {
    const next = { ...prev, [idx]: Math.max(0, (prev[idx] ?? 0) - 1) };
    if (next[idx] === 0) delete next[idx];
    return next;
  }), []);
  const removeFromCart = useCallback((idx: number) => setCart(prev => { const n = { ...prev }; delete n[idx]; return n; }), []);
  const clearCart      = useCallback(() => setCart({}), []);

  const cartBarAnim = useRef(new Animated.Value(120)).current;
  useEffect(() => {
    Animated.spring(cartBarAnim, {
      toValue: totalItems > 0 ? 0 : 120,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.9,
    }).start();
  }, [totalItems]);

  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: WHITE },
      headerTintColor: BLACK,
      headerShadowVisible: true,
      headerTitle: () => (
        <TouchableOpacity onPress={handleLogoTap} activeOpacity={1} hitSlop={12}>
          <Image
            source={{ uri: 'https://www.h3.com/wp-content/uploads/2025/02/H3_logo_base-azul-150x150.png' }}
            style={{ width: 34, height: 34 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      ),
    });
  }, []);

  type DishItem = { dish: Dish; dishIndex: number };
  type Row =
    | { type: 'header'; category: string; key: string }
    | { type: 'pair'; left: DishItem; right: DishItem | null; key: string };

  const { rows, categories, categoryRowIndexes } = useMemo<{
    rows: Row[]; categories: string[]; categoryRowIndexes: Record<string, number>;
  }>(() => {
    if (!restaurant) return { rows: [], categories: [], categoryRowIndexes: {} };
    const grouped = new Map<string, DishItem[]>();
    restaurant.dishes.forEach((dish, dishIndex) => {
      const cat = dish.category ?? 'Outros';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push({ dish, dishIndex });
    });
    const result: Row[] = [];
    const cats: string[] = [];
    const indexes: Record<string, number> = {};
    grouped.forEach((dishes, category) => {
      cats.push(category);
      indexes[category] = result.length;
      result.push({ type: 'header', category, key: `h-${category}` });
      for (let i = 0; i < dishes.length; i += 2) {
        result.push({ type: 'pair', left: dishes[i], right: dishes[i + 1] ?? null, key: `p-${dishes[i].dishIndex}` });
      }
    });
    return { rows: result, categories: cats, categoryRowIndexes: indexes };
  }, [restaurant]);

  const [activeCategory, setActiveCategory] = useState('');
  useEffect(() => { if (categories.length > 0) setActiveCategory(categories[0]); }, [categories]);

  const isUserScrolling = useRef(false);

  const scrollTabTo = useCallback((cat: string) => {
    const layout = tabLayouts.current[cat];
    if (layout) {
      tabScrollRef.current?.scrollTo({ x: layout.x - 12, animated: true });
    }
  }, []);

  const scrollToCategory = useCallback((cat: string) => {
    const idx = categoryRowIndexes[cat];
    if (idx !== undefined) {
      isUserScrolling.current = true;
      flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewOffset: 8 });
      setActiveCategory(cat);
      scrollTabTo(cat);
      setTimeout(() => { isUserScrolling.current = false; }, 600);
    }
  }, [categoryRowIndexes, scrollTabTo]);

  const scrollTabToRef = useRef(scrollTabTo);
  useEffect(() => { scrollTabToRef.current = scrollTabTo; }, [scrollTabTo]);

  // Map row index → measured height, used to compute cumulative y-offsets
  const rowHeights = useRef<Record<number, number>>({});
  const activeCategoryRef = useRef('');
  useEffect(() => { activeCategoryRef.current = activeCategory; }, [activeCategory]);

  const getRowOffset = useCallback((targetIndex: number) => {
    const PADDING_TOP = 8;
    let offset = PADDING_TOP;
    for (let i = 0; i < targetIndex; i++) {
      offset += rowHeights.current[i] ?? 0;
    }
    return offset;
  }, []);

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    if (isUserScrolling.current) return;
    const y = e.nativeEvent.contentOffset.y + 80;
    let found = categories[0] ?? '';
    for (const cat of categories) {
      const offset = getRowOffset(categoryRowIndexes[cat]);
      if (offset <= y) found = cat;
    }
    if (found && found !== activeCategoryRef.current) {
      activeCategoryRef.current = found;
      setActiveCategory(found);
      scrollTabToRef.current(found);
    }
  }, [categories, categoryRowIndexes, getRowOffset]);

  if (!restaurant) return null;

  const renderCard = (item: DishItem) => {
    const { dish, dishIndex } = item;
    const cf = hasProfileAllergens ? dish.contains_allergens.filter(a => userKeys.has(a.key)) : dish.contains_allergens;
    const mf = hasProfileAllergens ? dish.may_contain_allergens.filter(a => userKeys.has(a.key)) : dish.may_contain_allergens;
    const isPersonalSafe = hasProfileAllergens && cf.length === 0 && mf.length === 0 && (dish.contains_allergens.length > 0 || dish.may_contain_allergens.length > 0);
    const hasMatchingAllergens = hasProfileAllergens && (cf.length > 0 || mf.length > 0);
    return (
      <MenuCard
        dish={dish} dishIndex={dishIndex} restIndex={restIndex}
        containsCount={cf.length} mayCount={mf.length}
        isPersonalSafe={isPersonalSafe} hasMatchingAllergens={hasMatchingAllergens}
        quantity={cart[dishIndex] ?? 0}
        onAdd={() => addToCart(dishIndex)}
        onIncrement={() => addToCart(dishIndex)}
        onDecrement={() => decrementCart(dishIndex)}
      />
    );
  };

  const footer = (
    <View style={[s.footer, { marginTop: GAP }]}>
      <View style={s.footerDivider} />
      <Text style={s.footerCopy}>© H3 New Hamburgology · 2007–2025</Text>
      <Text style={s.footerSub}>New Hamburgology</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {/* Category tab bar */}
      <ScrollView ref={tabScrollRef} horizontal showsHorizontalScrollIndicator={false} style={s.tabs} contentContainerStyle={s.tabsContent}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[s.tab, activeCategory === cat && s.tabActive]}
            onPress={() => scrollToCategory(cat)}
            onLayout={e => { tabLayouts.current[cat] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width }; }}
          >
            <Text style={[s.tabText, activeCategory === cat && s.tabTextActive]}>{cat.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        ref={flatListRef}
        data={rows}
        keyExtractor={item => item.key}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: totalItems > 0 ? 100 : 24 }}
        ListFooterComponent={footer}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={() => {}}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        renderItem={({ item, index }) => {
          const recordHeight = (e: { nativeEvent: { layout: { height: number } } }) => {
            rowHeights.current[index] = e.nativeEvent.layout.height;
          };
          if (item.type === 'header') {
            return (
              <View style={[s.categoryHeader, { paddingHorizontal: PAD }]} onLayout={recordHeight}>
                <View style={s.categoryRule} />
                <Text style={s.categoryLabel}>{item.category.toUpperCase()}</Text>
                <View style={s.categoryRule} />
              </View>
            );
          }
          return (
            <View style={[s.pair, { paddingHorizontal: PAD, gap: GAP, marginBottom: GAP }]} onLayout={recordHeight}>
              {renderCard(item.left)}
              {item.right ? renderCard(item.right) : <View style={s.cardPlaceholder} />}
            </View>
          );
        }}
      />

      {/* Floating cart bar */}
      <Animated.View
        pointerEvents={totalItems > 0 ? 'auto' : 'none'}
        style={[s.cartBar, { bottom: insets.bottom + 12, transform: [{ translateY: cartBarAnim }] }]}
      >
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
          onPress={() => setCartOpen(true)}
          activeOpacity={0.9}
        >
          <View style={s.cartBarBadge}>
            <Text style={s.cartBarBadgeText}>{totalItems}</Text>
          </View>
          <Text style={s.cartBarLabel}>Ver pedido</Text>
          <Text style={s.cartBarPrice}>{totalPrice.toFixed(2)} €</Text>
        </TouchableOpacity>
      </Animated.View>

      <CartModal
        visible={cartOpen}
        onClose={() => setCartOpen(false)}
        onClearCart={() => { clearCart(); setCartOpen(false); }}
        onPlaceOrder={order => {
          addOrder({ ...order, id: Date.now().toString(), createdAt: new Date().toISOString() });
        }}
        cart={cart}
        dishes={restaurant.dishes}
        onIncrement={addToCart}
        onDecrement={decrementCart}
        onRemove={removeFromCart}
        totalItems={totalItems}
        totalPrice={totalPrice}
      />

      {/* PIN modal for admin access */}
      <Modal visible={pinVisible} animationType="fade" transparent onRequestClose={() => setPinVisible(false)}>
        <View style={s.pinOverlay}>
          <View style={s.pinBox}>
            <Text style={s.pinTitle}>Acesso Admin</Text>
            <TextInput
              style={[s.pinInput, pinError && s.pinInputError]}
              value={pin}
              onChangeText={v => { setPin(v); setPinError(false); }}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="PIN"
              placeholderTextColor={GRAY}
              autoFocus
            />
            {pinError && <Text style={s.pinError}>PIN incorreto</Text>}
            <View style={s.pinActions}>
              <TouchableOpacity style={s.pinCancel} onPress={() => setPinVisible(false)}>
                <Text style={s.pinCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.pinConfirm}
                onPress={() => {
                  if (pin === ADMIN_PIN) {
                    setPinVisible(false);
                    router.push('/admin');
                  } else {
                    setPinError(true);
                    setPin('');
                  }
                }}
              >
                <Text style={s.pinConfirmText}>Entrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Screen styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },

  tabs: { backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER, flexGrow: 0 },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f2f2f2' },
  tabActive: { backgroundColor: BLUE },
  tabText: { fontSize: 10, fontWeight: '700', color: GRAY, letterSpacing: 1.2 },
  tabTextActive: { color: WHITE },

  pair: { flexDirection: 'row' },
  cardPlaceholder: { flex: 1 },

  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 8 },
  categoryRule: { flex: 1, height: 1, backgroundColor: BORDER },
  categoryLabel: { fontSize: 10, fontWeight: '700', color: GRAY, letterSpacing: 2 },

  card: { flex: 1, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, borderRadius: 10, overflow: 'hidden' },
  cardDanger: { borderColor: DANGER, borderWidth: 2 },

  photo: { width: '100%', aspectRatio: 3 / 2, backgroundColor: '#f0f0f0' },

  quantityBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: BLUE, borderRadius: 12, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  quantityBadgeText: { fontSize: 11, fontWeight: '800', color: WHITE },

  content: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, gap: 4 },
  name: { fontSize: 13, fontWeight: '800', color: BLACK, letterSpacing: 0.3, lineHeight: 17 },
  tagline: { fontSize: 10, fontWeight: '500', color: GRAY, letterSpacing: 1.0 },
  rule: { height: 1, width: 32, backgroundColor: BORDER, alignSelf: 'center', marginVertical: 3 },
  safeText: { fontSize: 11, fontWeight: '600', color: GREEN, letterSpacing: 0.2 },
  alertText: { fontSize: 11, fontWeight: '600', color: DANGER, letterSpacing: 0.2 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  price: { fontSize: 13, fontWeight: '700', color: BLACK },
  addBtn: { backgroundColor: BLUE, borderRadius: 16, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  qtyBtnFilled: { backgroundColor: BLUE, borderColor: BLUE },
  qtyText: { fontSize: 13, fontWeight: '700', color: BLACK, minWidth: 16, textAlign: 'center' },

  cartBar: { position: 'absolute', left: 16, right: 16, backgroundColor: BLACK, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 },
  cartBarBadge: { backgroundColor: BLUE, borderRadius: 10, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginRight: 10 },
  cartBarBadgeText: { fontSize: 12, fontWeight: '800', color: WHITE },
  cartBarLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: WHITE },
  cartBarPrice: { fontSize: 14, fontWeight: '700', color: BLUE },

  // PIN modal
  pinOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  pinBox: { backgroundColor: WHITE, borderRadius: 16, padding: 24, width: 280, alignItems: 'center', gap: 12 },
  pinTitle: { fontSize: 17, fontWeight: '800', color: BLACK },
  pinInput: { width: '100%', borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 22, textAlign: 'center', letterSpacing: 8, color: BLACK },
  pinInputError: { borderColor: DANGER },
  pinError: { fontSize: 12, color: DANGER, fontWeight: '600' },
  pinActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  pinCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center' },
  pinCancelText: { fontSize: 14, fontWeight: '700', color: GRAY },
  pinConfirm: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: BLACK, alignItems: 'center' },
  pinConfirmText: { fontSize: 14, fontWeight: '700', color: WHITE },

  footer: { backgroundColor: FOOTER, paddingTop: 28, paddingBottom: 40, alignItems: 'center', gap: 8 },
  footerDivider: { width: 40, height: 2, backgroundColor: BLUE, marginBottom: 8 },
  footerCopy: { fontSize: 12, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5 },
  footerSub: { fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, textTransform: 'uppercase' },
});

// ─── Cart modal styles ────────────────────────────────────────────────────────
const sm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: WHITE, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingHorizontal: 20, maxHeight: '88%' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: BLACK, letterSpacing: 0.3 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: DANGER },
  clearText: { fontSize: 12, fontWeight: '700', color: DANGER },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },

  itemList: { maxHeight: 300 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  itemInfo: { flex: 1, marginRight: 8 },
  itemName: { fontSize: 12, fontWeight: '700', color: BLACK, letterSpacing: 0.5 },
  itemPrice: { fontSize: 12, fontWeight: '600', color: GRAY, marginTop: 2 },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noteIcon: { padding: 4 },
  noteInput: { marginHorizontal: 0, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f7f7f7', borderRadius: 8, borderWidth: 1, borderColor: BORDER, fontSize: 13, color: BLACK, minHeight: 44 },

  itemControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctrlBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  ctrlBtnFilled: { backgroundColor: BLUE, borderColor: BLUE },
  ctrlQty: { fontSize: 14, fontWeight: '700', color: BLACK, minWidth: 18, textAlign: 'center' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: BLACK },
  totalValue: { fontSize: 18, fontWeight: '800', color: BLACK },

  primaryBtn: { backgroundColor: BLUE, borderRadius: 12, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  primaryBtnDisabled: { backgroundColor: '#b0d8ed' },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: WHITE, letterSpacing: 0.3 },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: GRAY, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },

  orderTypeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  orderTypeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 12, borderWidth: 2, borderColor: BORDER, backgroundColor: WHITE },
  orderTypeBtnActive: { borderColor: BLUE, backgroundColor: BLUE },
  orderTypeTxt: { fontSize: 13, fontWeight: '700', color: BLACK },
  orderTypeTxtActive: { color: WHITE },

  textField: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: BLACK, marginBottom: 16 },

  summaryBox: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 14, marginBottom: 16 },
  summaryTitle: { fontSize: 13, fontWeight: '800', color: BLACK, marginBottom: 10, letterSpacing: 0.3 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  summaryQty: { fontSize: 13, fontWeight: '700', color: BLUE, width: 28 },
  summaryName: { flex: 1, fontSize: 13, color: BLACK },
  summaryPrice: { fontSize: 13, fontWeight: '600', color: GRAY },

  successContainer: { alignItems: 'center', paddingVertical: 8 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '800', color: BLACK, marginBottom: 6 },
  successRef: { fontSize: 13, fontWeight: '700', color: BLUE, letterSpacing: 1, marginBottom: 4 },
  successSub: { fontSize: 13, color: GRAY, marginBottom: 4 },
  successTotal: { fontSize: 20, fontWeight: '800', color: BLACK },
  successDivider: { height: 1, backgroundColor: BORDER, width: '100%', marginVertical: 16 },
  successItems: { width: '100%' },
});
