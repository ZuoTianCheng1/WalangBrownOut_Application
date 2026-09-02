import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getItems, getBatches, getAlerts, resolveAlert as resolveAlertApi, createItem as createItemApi, consumeBatch as consumeBatchApi } from '../services/api.js';

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  const [items, setItems] = useState(null);
  const [batches, setBatches] = useState(null);
  const [alerts, setAlerts] = useState(null);

  const reloadItems = useCallback(() => getItems().then(setItems), []);
  const reloadBatches = useCallback(() => getBatches().then(setBatches), []);
  const reloadAlerts = useCallback(() => getAlerts().then(setAlerts), []);

  useEffect(() => {
    reloadItems();
    reloadBatches();
    reloadAlerts();
  }, [reloadItems, reloadBatches, reloadAlerts]);

  const resolveAlert = useCallback(async (id) => {
    await resolveAlertApi(id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
  }, []);

  const consumeBatch = useCallback(async (lotId, quantity, reason) => {
    const result = await consumeBatchApi(lotId, quantity, reason);
    setBatches((prev) => prev.map((b) => (b.lot_id === lotId ? result.batch : b)));
    setItems((prev) => prev?.map((item) => item.sku_id === result.batch.sku_id ? { ...item, qty_on_hand: Math.max(0, item.qty_on_hand - quantity), stock_status: Math.max(0, item.qty_on_hand - quantity) <= item.reorder_point ? (Math.max(0, item.qty_on_hand - quantity) <= 0 ? 'out_of_stock' : 'below_reorder') : 'healthy' } : item));
    return result;
  }, []);

  const addItem = useCallback(async (item) => {
    const created = await createItemApi(item);
    setItems((prev) => [created, ...prev]);
    return created;
  }, []);

  const value = { items, batches, alerts, resolveAlert, addItem, consumeBatch, reloadItems, reloadBatches };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used inside InventoryProvider');
  return ctx;
}
