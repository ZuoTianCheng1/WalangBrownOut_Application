/**
 * ------------------------------------------------------------------
 * API SERVICE LAYER
 * ------------------------------------------------------------------
 * Every page reads and writes through this file — never mock data
 * or fetch() directly from a component. That's the seam: when a
 * real backend exists, flip USE_MOCK to false, fill in the fetch/
 * POST calls (already stubbed below), and no page needs to change.
 *
 * Setup for a real backend:
 *   1. Copy .env.example to .env, set VITE_API_BASE_URL.
 *   2. Set USE_MOCK = false below.
 *   3. Each function already has the real call written but commented
 *      out, with the expected request/response shape documented
 *      above it — match that in your backend.
 * ------------------------------------------------------------------
 */

import {
  items as mockItems,
  batches as mockBatches,
  alerts as mockAlerts,
  dashboardSummary,
} from '../data/mockData.js';

const USE_MOCK = true;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// In-memory store standing in for a database — lets the mock API
// support create/update calls that persist for the session.
let _items = [...mockItems];
let _batches = [...mockBatches];
let _alerts = [...mockAlerts];

function delay(data, ms = 200) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

async function request(path, options) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return res.json();
}

/** GET /items
 *  -> [{ sku_id, name, category, handling_class, abc_class, xyz_class,
 *        lead_time_days, shelf_life_days, unit_price, reorder_point,
 *        qty_on_hand, stock_status }] */
export async function getItems() {
  if (USE_MOCK) return delay([..._items]);
  return request('/items');
}

/** POST /items  body: { sku_id, name, category, abc_class, xyz_class,
 *  handling_class, lead_time_days, shelf_life_days, unit_price, reorder_point }
 *  -> the created item record */
export async function createItem(item) {
  if (USE_MOCK) {
    const record = { ...item, qty_on_hand: 0, stock_status: 'out_of_stock' };
    _items = [record, ..._items];
    return delay(record, 300);
  }
  return request('/items', { method: 'POST', body: JSON.stringify(item) });
}

/** GET /batches?sku_id=optional
 *  -> [{ lot_id, sku_id, received_date, expiry_date, qty_received,
 *        qty_remaining, status: 'active'|'near_expiry'|'expired' }] */
export async function getBatches(skuId) {
  if (USE_MOCK) {
    const rows = skuId ? _batches.filter((b) => b.sku_id === skuId) : [..._batches];
    return delay(rows);
  }
  return request(`/batches${skuId ? `?sku_id=${encodeURIComponent(skuId)}` : ''}`);
}

/** GET /alerts?status=all
 *  -> [{ id, tier: 'critical'|'warning'|'info', kind, sku_id, lot_id,
 *        title, meta, resolved }] */
export async function getAlerts() {
  if (USE_MOCK) return delay([..._alerts], 250);
  return request('/alerts');
}

/** PATCH /alerts/:id  body: { resolved: true }
 *  -> the updated alert record */
export async function resolveAlert(id) {
  if (USE_MOCK) {
    _alerts = _alerts.map((a) => (a.id === id ? { ...a, resolved: true } : a));
    return delay(_alerts.find((a) => a.id === id), 150);
  }
  return request(`/alerts/${id}`, { method: 'PATCH', body: JSON.stringify({ resolved: true }) });
}

/** GET /dashboard/summary
 *  -> { belowReorder, nearExpiryBatches, expiredBatches, openAlerts, inventoryValue } */
export async function getDashboardSummary() {
  if (USE_MOCK) return delay(dashboardSummary(_items, _batches, _alerts), 200);
  return request('/dashboard/summary');
}

export const apiMode = () => (USE_MOCK ? 'mock' : 'live');
