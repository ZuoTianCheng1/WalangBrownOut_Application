import { createContext, useContext, useMemo, useState } from 'react';
const SettingsContext = createContext(null);
const KEY = 'walangbrownout_ims_settings';
const DEFAULTS = { nearExpiryDays: 30, criticalStockDays: 7, theme: 'dark', emailNotifications: false };
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULTS; }
  });
  const updateSettings = (patch) => setSettings((old) => {
    const next = { ...old, ...patch }; localStorage.setItem(KEY, JSON.stringify(next)); return next;
  });
  const value = useMemo(() => ({ settings, updateSettings }), [settings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
export function useSettings() { return useContext(SettingsContext); }
