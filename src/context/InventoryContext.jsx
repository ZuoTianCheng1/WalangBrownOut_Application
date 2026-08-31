import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getItems, getBatches, getAlerts, resolveAlert as resolveAlertApi, createItem as createItemApi } from '../services/api.js';

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

  const addItem = useCallback(async (item) => {
    const created = await createItemApi(item);
    setItems((prev) => [created, ...prev]);
    return created;
  }, []);

  const value = { items, batches, alerts, resolveAlert, addItem, reloadItems };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used inside InventoryProvider');
  return ctx;
}
