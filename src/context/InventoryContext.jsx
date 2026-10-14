import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useSettings } from './SettingsContext.jsx';
import { getItems, getBatches, getAlerts, resolveAlert as resolveAlertApi, createItem as createItemApi, consumeBatch as consumeBatchApi } from '../services/api.js';

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [items, setItems] = useState(null);
  const [batches, setBatches] = useState(null);
  const [alerts, setAlerts] = useState(null);

  const reloadItems = useCallback(() => getItems().then(setItems), []);
  const reloadBatches = useCallback(() => getBatches().then(rows => {
    const today = new Date(); today.setHours(0,0,0,0);
    setBatches(rows.map(b => {
      if (!b.expiry_date) return { ...b, status: 'active' };
      const days = Math.ceil((new Date(`${b.expiry_date}T00:00:00`) - today) / 86400000);
      return { ...b, status: days < 0 ? 'expired' : days <= settings.nearExpiryDays ? 'near_expiry' : 'active' };
    }));
  }), [settings.nearExpiryDays]);
  const reloadAlerts = useCallback(() => getAlerts().then(setAlerts), []);

  useEffect(() => {
    reloadItems();
    reloadBatches();
    reloadAlerts();
  }, [reloadItems, reloadBatches, reloadAlerts]);

  useEffect(() => { if (batches) reloadBatches(); }, [settings.nearExpiryDays]);

  useEffect(() => {
    if (!items || !batches) return;
    setItems(prev => {
      const next = prev?.map(item => {
        const qty = batches.filter(b => b.sku_id === item.sku_id && b.status !== 'expired').reduce((sum,b)=>sum+b.qty_remaining,0);
        const status = qty <= 0 ? 'out_of_stock' : qty <= item.reorder_point ? 'below_reorder' : 'healthy';
        return item.qty_on_hand === qty && item.stock_status === status ? item : { ...item, qty_on_hand: qty, stock_status: status };
      });
      return next && next.every((item, i) => item === prev[i]) ? prev : next;
    });
  }, [items, batches]);

  const resolveAlert = useCallback(async (id, notes = '') => {
    const actor = user?.name || user?.username || 'System';
    const updated = await resolveAlertApi(id, notes, actor);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated, resolved: true, resolved_by: actor, resolved_at: new Date().toISOString(), resolution_notes: notes } : a)));
  }, [user]);

  const consumeBatch = useCallback(async (lotId, quantity, reason) => {
    const result = await consumeBatchApi(lotId, quantity, reason, user?.name || 'System');
    setBatches((prev) => prev.map((b) => (b.lot_id === lotId ? { ...result.batch, status: b.status } : b)));
    setItems((prev) => prev?.map((item) => item.sku_id === result.batch.sku_id ? { ...item, qty_on_hand: Math.max(0, item.qty_on_hand - quantity), stock_status: Math.max(0, item.qty_on_hand - quantity) <= item.reorder_point ? (Math.max(0, item.qty_on_hand - quantity) <= 0 ? 'out_of_stock' : 'below_reorder') : 'healthy' } : item));
    return result;
  }, [user]);

  const addItem = useCallback(async (item) => {
    const created = await createItemApi({ ...item, created_by: user?.name || 'System' });
    setItems((prev) => [created, ...prev]);
    return created;
  }, [user]);

  const value = { items, batches, alerts, resolveAlert, addItem, consumeBatch, reloadItems, reloadBatches };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used inside InventoryProvider');
  return ctx;
}
