import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface OrderItem {
  dishIndex: number;
  dishName: string;
  qty: number;
  price: number;
  note?: string;
}

export interface Order {
  id: string;
  ref: string;
  type: 'mesa' | 'takeaway';
  table?: string;
  customerName?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
}

interface OrderContextValue {
  orders: Order[];
  addOrder: (order: Order) => Promise<void>;
  updateOrder: (id: string, patch: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  clearOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextValue | null>(null);

const ORDERS_COL = 'orders';

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const q = query(collection(db, ORDERS_COL), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      setOrders(snapshot.docs.map(d => d.data() as Order));
    });
    return unsub;
  }, []);

  const addOrder = useCallback(async (order: Order) => {
    const clean = JSON.parse(JSON.stringify(order)) as Order;
    await setDoc(doc(db, ORDERS_COL, order.id), clean);
  }, []);

  const updateOrder = useCallback(async (id: string, patch: Partial<Order>) => {
    const clean = JSON.parse(JSON.stringify(patch)) as Record<string, unknown>;
    await updateDoc(doc(db, ORDERS_COL, id), clean);
  }, []);

  const deleteOrder = useCallback(async (id: string) => {
    await deleteDoc(doc(db, ORDERS_COL, id));
  }, []);

  const clearOrders = useCallback(async () => {
    const batch = writeBatch(db);
    orders.forEach(o => batch.delete(doc(db, ORDERS_COL, o.id)));
    await batch.commit();
  }, [orders]);

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrder, deleteOrder, clearOrders }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders(): OrderContextValue {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrders must be inside OrderProvider');
  return ctx;
}
