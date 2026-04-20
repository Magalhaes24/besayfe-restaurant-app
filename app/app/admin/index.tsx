import { useRouter } from 'expo-router';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Order, OrderStatus, useOrders } from '../../store/orderStore';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const BLUE   = '#1a9ed4';
const BLACK  = '#171717';
const WHITE  = '#ffffff';
const GRAY   = '#666666';
const BORDER = '#e8e8e8';
const DANGER = '#B42318';
const GREEN  = '#27ae60';
const ORANGE = '#e67e22';
const PURPLE = '#8e44ad';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pendente',   color: ORANGE, bg: '#fef3e2' },
  preparing: { label: 'A preparar', color: BLUE,   bg: '#e8f6fc' },
  ready:     { label: 'Pronto',     color: GREEN,  bg: '#eafaf1' },
  delivered: { label: 'Entregue',   color: PURPLE, bg: '#f3e8fd' },
  cancelled: { label: 'Cancelado',  color: DANGER, bg: '#fdecea' },
};

const ALL_STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={st.statCard}>
      <Text style={[st.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
      {sub ? <Text style={st.statSub}>{sub}</Text> : null}
    </View>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[st.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[st.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Edit Order Modal ─────────────────────────────────────────────────────────
function EditOrderModal({
  order,
  onClose,
  onSave,
  onDelete,
}: {
  order: Order;
  onClose: () => void;
  onSave: (patch: Partial<Order>) => void;
  onDelete: () => void;
}) {
  const [status, setStatus]       = useState<OrderStatus>(order.status);
  const [table, setTable]         = useState(order.table ?? '');
  const [name, setName]           = useState(order.customerName ?? '');
  const [items, setItems]         = useState(order.items.map(i => ({ ...i })));

  const updateItemQty = (idx: number, delta: number) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: Math.max(1, it.qty + delta) } : it));
  };
  const updateItemNote = (idx: number, note: string) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, note } : it));
  };
  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const newTotal = items.reduce((s, it) => s + it.price * it.qty, 0);

  const handleSave = () => {
    onSave({
      status,
      table: order.type === 'mesa' ? table : undefined,
      customerName: order.type === 'takeaway' ? name : undefined,
      items,
      total: newTotal,
    });
    onClose();
  };

  const handleDelete = () => {
    Alert.alert('Eliminar pedido', `Tem a certeza que quer eliminar ${order.ref}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { onDelete(); onClose(); } },
    ]);
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={em.overlay}>
        <Pressable style={em.backdrop} onPress={onClose} />
        <View style={em.sheet}>
          {/* Header */}
          <View style={em.header}>
            <View>
              <Text style={em.headerRef}>{order.ref}</Text>
              <Text style={em.headerSub}>{new Date(order.createdAt).toLocaleString('pt-PT')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={BLACK} />
            </TouchableOpacity>
          </View>

          <View style={em.divider} />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Status */}
            <Text style={em.sectionLabel}>Estado</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ALL_STATUSES.map(s => {
                  const cfg = STATUS_CONFIG[s];
                  const active = status === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[em.statusChip, active && { backgroundColor: cfg.color }]}
                      onPress={() => setStatus(s)}
                    >
                      <Text style={[em.statusChipText, active && { color: WHITE }]}>{cfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Order type detail */}
            <Text style={em.sectionLabel}>
              {order.type === 'mesa' ? 'Mesa' : 'Nome'}
            </Text>
            <TextInput
              style={em.textField}
              value={order.type === 'mesa' ? table : name}
              onChangeText={order.type === 'mesa' ? setTable : setName}
              keyboardType={order.type === 'mesa' ? 'number-pad' : 'default'}
              placeholder={order.type === 'mesa' ? 'Número da mesa' : 'Nome do cliente'}
              placeholderTextColor={GRAY}
            />

            {/* Items */}
            <Text style={em.sectionLabel}>Itens</Text>
            {items.map((it, idx) => (
              <View key={idx} style={em.itemRow}>
                <View style={em.itemLeft}>
                  <Text style={em.itemName}>{it.dishName}</Text>
                  <TextInput
                    style={em.itemNoteInput}
                    value={it.note ?? ''}
                    onChangeText={text => updateItemNote(idx, text)}
                    placeholder="Nota…"
                    placeholderTextColor={GRAY}
                  />
                </View>
                <View style={em.itemRight}>
                  <TouchableOpacity style={em.qtyBtn} onPress={() => updateItemQty(idx, -1)} hitSlop={8}>
                    <Ionicons name="remove" size={13} color={BLUE} />
                  </TouchableOpacity>
                  <Text style={em.qtyText}>{it.qty}</Text>
                  <TouchableOpacity style={[em.qtyBtn, em.qtyBtnFilled]} onPress={() => updateItemQty(idx, 1)} hitSlop={8}>
                    <Ionicons name="add" size={13} color={WHITE} />
                  </TouchableOpacity>
                  <TouchableOpacity style={em.deleteItemBtn} onPress={() => removeItem(idx)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={14} color={DANGER} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={em.totalRow}>
              <Text style={em.totalLabel}>Total</Text>
              <Text style={em.totalValue}>{newTotal.toFixed(2)} €</Text>
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={em.divider} />

          <View style={em.actions}>
            <TouchableOpacity style={em.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={16} color={DANGER} />
              <Text style={em.deleteBtnText}>Eliminar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={em.saveBtn} onPress={handleSave}>
              <Text style={em.saveBtnText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Order row ────────────────────────────────────────────────────────────────
function OrderRow({ order, onPress }: { order: Order; onPress: () => void }) {
  const time = new Date(order.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(order.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  return (
    <TouchableOpacity style={st.orderRow} onPress={onPress} activeOpacity={0.7}>
      <View style={st.orderLeft}>
        <View style={st.orderTopRow}>
          <Text style={st.orderRef}>{order.ref}</Text>
          <StatusBadge status={order.status} />
        </View>
        <Text style={st.orderMeta}>
          {order.type === 'mesa' ? `Mesa ${order.table}` : `Takeaway · ${order.customerName}`}
          {' · '}{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
        </Text>
        <Text style={st.orderTime}>{date} às {time}</Text>
      </View>
      <View style={st.orderRight}>
        <Text style={st.orderTotal}>{order.total.toFixed(2)} €</Text>
        <Ionicons name="chevron-forward" size={14} color={GRAY} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
type FilterStatus = OrderStatus | 'all';

function LiveDot() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.6, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={st.liveDotWrap}>
      <Animated.View style={[st.liveDotPulse, { transform: [{ scale }] }]} />
      <View style={st.liveDot} />
    </View>
  );
}

export default function AdminScreen() {
  const router = useRouter();
  const { orders, updateOrder, deleteOrder, clearOrders } = useOrders();
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Order | null>(null);
  // The context already pushes real-time updates reactively.
  // This ref tracks count changes so we can animate new-order notifications if needed.
  const prevCountRef = useRef(orders.length);
  useEffect(() => { prevCountRef.current = orders.length; }, [orders.length]);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          o.ref.toLowerCase().includes(q) ||
          (o.table ?? '').includes(q) ||
          (o.customerName ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, filter, search]);

  const stats = useMemo(() => {
    const total = orders.reduce((s, o) => s + o.total, 0);
    const byStatus = (s: OrderStatus) => orders.filter(o => o.status === s).length;
    const topDish = (() => {
      const counts: Record<string, number> = {};
      orders.forEach(o => o.items.forEach(it => { counts[it.dishName] = (counts[it.dishName] ?? 0) + it.qty; }));
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      return top ? `${top[0]} (${top[1]}×)` : '—';
    })();
    return { total, pending: byStatus('pending'), preparing: byStatus('preparing'), topDish };
  }, [orders]);

  const handleClearAll = () => {
    Alert.alert('Limpar tudo', 'Eliminar todos os pedidos?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar tudo', style: 'destructive', onPress: clearOrders },
    ]);
  };

  return (
    <SafeAreaView style={st.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={BLACK} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Admin · H3</Text>
          <View style={st.adminBadge}><Text style={st.adminBadgeText}>ADMIN</Text></View>
          <LiveDot />
        </View>
        <TouchableOpacity onPress={handleClearAll} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color={DANGER} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Stats */}
        <View style={st.statsGrid}>
          <StatCard label="Total pedidos" value={String(orders.length)} />
          <StatCard label="Receita" value={`${stats.total.toFixed(2)} €`} color={GREEN} />
          <StatCard label="Pendentes" value={String(stats.pending)} color={ORANGE} />
          <StatCard label="A preparar" value={String(stats.preparing)} color={BLUE} />
        </View>

        <View style={st.topDishCard}>
          <Ionicons name="trophy-outline" size={16} color={ORANGE} />
          <Text style={st.topDishLabel}>Item mais pedido: </Text>
          <Text style={st.topDishValue}>{stats.topDish}</Text>
        </View>

        {/* Search */}
        <View style={st.searchRow}>
          <Ionicons name="search-outline" size={16} color={GRAY} style={{ marginRight: 8 }} />
          <TextInput
            style={st.searchInput}
            placeholder="Pesquisar ref, mesa, nome…"
            placeholderTextColor={GRAY}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={GRAY} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filterScroll} contentContainerStyle={st.filterContent}>
          {(['all', ...ALL_STATUSES] as FilterStatus[]).map(s => {
            const active = filter === s;
            const cfg = s === 'all' ? null : STATUS_CONFIG[s];
            return (
              <TouchableOpacity
                key={s}
                style={[st.filterTab, active && { backgroundColor: cfg?.color ?? BLACK }]}
                onPress={() => setFilter(s)}
              >
                <Text style={[st.filterTabText, active && { color: WHITE }]}>
                  {s === 'all' ? 'Todos' : cfg!.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Orders */}
        <View style={st.orderList}>
          {filtered.length === 0 ? (
            <View style={st.empty}>
              <Ionicons name="receipt-outline" size={40} color={BORDER} />
              <Text style={st.emptyText}>Sem pedidos</Text>
            </View>
          ) : (
            filtered.map(order => (
              <OrderRow key={order.id} order={order} onPress={() => setEditing(order)} />
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {editing && (
        <EditOrderModal
          order={editing}
          onClose={() => setEditing(null)}
          onSave={patch => updateOrder(editing.id, patch)}
          onDelete={() => deleteOrder(editing.id)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Admin screen styles ──────────────────────────────────────────────────────
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerCenter: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: BLACK },
  adminBadge: { backgroundColor: BLACK, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  adminBadgeText: { fontSize: 9, fontWeight: '800', color: WHITE, letterSpacing: 1 },
  liveDotWrap: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN, position: 'absolute' },
  liveDotPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN, opacity: 0.35, position: 'absolute' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  statCard: { flex: 1, minWidth: '40%', backgroundColor: WHITE, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER },
  statValue: { fontSize: 22, fontWeight: '800', color: BLACK },
  statLabel: { fontSize: 11, color: GRAY, marginTop: 2, fontWeight: '600' },
  statSub: { fontSize: 10, color: GRAY, marginTop: 1 },

  topDishCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, marginHorizontal: 16, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: BORDER, marginBottom: 12 },
  topDishLabel: { fontSize: 13, color: GRAY, marginLeft: 6 },
  topDishValue: { fontSize: 13, fontWeight: '700', color: BLACK, flex: 1 },

  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, marginHorizontal: 16, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: BORDER, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, color: BLACK },

  filterScroll: { flexGrow: 0, marginBottom: 12 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER },
  filterTabText: { fontSize: 12, fontWeight: '700', color: GRAY },

  orderList: { paddingHorizontal: 16, gap: 10 },
  orderRow: { backgroundColor: WHITE, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center' },
  orderLeft: { flex: 1 },
  orderTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  orderRef: { fontSize: 14, fontWeight: '800', color: BLACK },
  orderMeta: { fontSize: 12, color: GRAY, marginBottom: 2 },
  orderTime: { fontSize: 11, color: '#aaa' },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  orderTotal: { fontSize: 15, fontWeight: '800', color: BLACK },

  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, color: GRAY, fontWeight: '600' },
});

// ─── Edit modal styles ────────────────────────────────────────────────────────
const em = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: WHITE, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 32, maxHeight: '90%' },

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  headerRef: { fontSize: 18, fontWeight: '800', color: BLACK },
  headerSub: { fontSize: 12, color: GRAY, marginTop: 2 },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: GRAY, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },

  statusChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER, backgroundColor: WHITE },
  statusChipText: { fontSize: 12, fontWeight: '700', color: BLACK },

  textField: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: BLACK, marginBottom: 16 },

  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10 },
  itemLeft: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '700', color: BLACK, marginBottom: 4 },
  itemNoteInput: { fontSize: 12, color: GRAY, borderWidth: 1, borderColor: BORDER, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  qtyBtnFilled: { backgroundColor: BLUE, borderColor: BLUE },
  qtyText: { fontSize: 13, fontWeight: '700', color: BLACK, minWidth: 18, textAlign: 'center' },
  deleteItemBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: BLACK },
  totalValue: { fontSize: 16, fontWeight: '800', color: BLACK },

  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: DANGER },
  deleteBtnText: { fontSize: 14, fontWeight: '700', color: DANGER },
  saveBtn: { flex: 1, backgroundColor: BLUE, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: WHITE },
});
