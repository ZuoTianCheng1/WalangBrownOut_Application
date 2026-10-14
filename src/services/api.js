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

const USE_MOCK = false;
// VITE_API_BASE_URL wins; otherwise production builds use the hosted API and dev uses the local one.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.PROD ? 'https://walangbrownout-api.onrender.com/api' : 'http://localhost:8000/api');

// In-memory store standing in for a database — lets the mock API
// support create/update calls that persist for the session.
let _items = [...mockItems];
let _batches = [...mockBatches];
let _alerts = [...mockAlerts];
const _batchHistory = new Map(
  _batches.map((b) => [b.lot_id, [{ id: `${b.lot_id}-received`, type: 'received', quantity: b.qty_received, reason: 'Batch received', date: b.received_date }]])
);

function delay(data, ms = 200) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// --- Laravel response adapters: reshape API data into what the pages expect ---
function normalizeHistory(h) {
  const qty = Number(h.quantity);
  const isIn = h.type === 'received' || (h.type === 'adjustment' && qty > 0);
  return {
    id: h.id,
    type: isIn ? 'received' : 'used',
    quantity: Math.abs(qty),
    reason: h.reason,
    actor: h.actor || null,
    date: String(h.date || h.created_at || '').slice(0, 10),
  };
}
function normalizeBatch(b) { return { ...b, history: (b.history || []).map(normalizeHistory) }; }
function normalizeAlert(a) {
  const m = a.meta;
  const meta = m == null ? '' : typeof m === 'string' ? m : Array.isArray(m) ? m.join(' · ') : Object.values(m).join(' · ');
  return { ...a, meta, resolved: !!a.resolved };
}

async function request(path, options) {
  const token = localStorage.getItem('walangbrownout_ims_token');
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options?.headers || {}) },
  });
  if (!res.ok) {
    // Expired or revoked session: let AuthContext sign the user out (not for failed logins).
    if (res.status === 401 && !path.startsWith('/auth/login')) window.dispatchEvent(new Event('ims:unauthorized'));
    const body = await res.json().catch(() => ({}));
    // Laravel returns { message } or { message, errors: { field: [..] } }; the old API returned { error }.
    const firstFieldError = body.errors ? Object.values(body.errors)[0]?.[0] : null;
    throw new Error(body.error || firstFieldError || body.message || `API error ${res.status} on ${path}`);
  }
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
  const created = await request('/items', { method: 'POST', body: JSON.stringify(item) });
  return { ...created, created_by: item.created_by ?? created.created_by };
}

/** GET /batches?sku_id=optional
 *  -> [{ lot_id, sku_id, received_date, expiry_date, qty_received,
 *        qty_remaining, status: 'active'|'near_expiry'|'expired' }] */
export async function getBatches(skuId) {
  if (USE_MOCK) {
    const rows = skuId ? _batches.filter((b) => b.sku_id === skuId) : [..._batches];
    return delay(rows.map((b) => ({ ...b, history: _batchHistory.get(b.lot_id) ?? [] })));
  }
  return (await request(`/batches${skuId ? `?sku_id=${encodeURIComponent(skuId)}` : ''}`)).map(normalizeBatch);
}


/** PATCH /batches/:lot_id/use
 * body: { quantity, reason }
 * -> { batch, history }
 */
export async function consumeBatch(lotId, quantity, reason = 'Sale', actor = 'System') {
  if (USE_MOCK) {
    const batch = _batches.find((b) => b.lot_id === lotId);
    if (!batch) throw new Error('Batch not found.');
    if (batch.status === 'expired' || (batch.expiry_date && new Date(`${batch.expiry_date}T23:59:59`) < new Date())) throw new Error('Expired batches cannot be used.');
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Quantity must be a positive whole number.');
    if (quantity > batch.qty_remaining) throw new Error(`Only ${batch.qty_remaining} units are available in this batch.`);

    const updated = { ...batch, qty_remaining: batch.qty_remaining - quantity };
    _batches = _batches.map((b) => (b.lot_id === lotId ? updated : b));
    const history = _batchHistory.get(lotId) ?? [];
    history.unshift({
      id: `${lotId}-${Date.now()}`,
      type: 'used',
      quantity,
      reason,
      actor,
      date: new Date().toISOString().slice(0, 10),
    });
    _batchHistory.set(lotId, history);
    updated.history = history;
    return delay({ batch: updated, history }, 250);
  }
  // Laravel has no PATCH /batches/:lot/use. A lot-specific deduction is POST /stock/adjust with a negative delta.
  const why = String(reason || '').trim();
  await request('/stock/adjust', { method: 'POST', body: JSON.stringify({ lot_id: lotId, quantity_delta: -Math.abs(quantity), reason: why.length >= 3 ? why : 'Stock use' }) });
  const batch = (await getBatches()).find((b) => b.lot_id === lotId);
  return { batch, history: batch?.history ?? [] };
}

/** PATCH /batches/:lot_id  body: { received_date, expiry_date, qty_received, qty_remaining } -> { batch, history } */
export async function updateBatch(lotId, payload) {
  if (USE_MOCK) throw new Error('Editing a batch needs the live API.');
  await request(`/batches/${encodeURIComponent(lotId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
  const batch = (await getBatches()).find((b) => b.lot_id === lotId);
  return { batch, history: batch?.history ?? [] };
}

/** GET /alerts?status=all
 *  -> [{ id, tier: 'critical'|'warning'|'info', kind, sku_id, lot_id,
 *        title, meta, resolved }] */
export async function getAlerts() {
  if (USE_MOCK) return delay([..._alerts], 250);
  return (await request('/alerts')).map(normalizeAlert);
}

/** PATCH /alerts/:id  body: { resolved: true }
 *  -> the updated alert record */
export async function resolveAlert(id, notes = '', actor = 'System') {
  if (USE_MOCK) {
    _alerts = _alerts.map((a) => (a.id === id ? { ...a, resolved: true, resolved_by: actor, resolved_at: new Date().toISOString(), resolution_notes: notes } : a));
    return delay(_alerts.find((a) => a.id === id), 150);
  }
  // Laravel requires resolution_notes (min 3 chars) even though the UI says the note is optional.
  const note = String(notes || '').trim();
  const updated = await request(`/alerts/${id}`, { method: 'PATCH', body: JSON.stringify({ resolved: true, resolution_notes: note.length >= 3 ? note : 'Resolved' }) });
  return normalizeAlert(updated);
}

/** GET /dashboard/summary
 *  -> { belowReorder, nearExpiryBatches, expiredBatches, openAlerts, inventoryValue } */
export async function getDashboardSummary() {
  if (USE_MOCK) return delay(dashboardSummary(_items, _batches, _alerts), 200);
  return request('/dashboard/summary');
}

export const apiMode = () => 'live';

export async function loginApi(username, password) { return request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }); }
export async function meApi() { return request('/auth/me'); }

// --- User management (Admin only; enforced by the API) ---
export async function getUsers() { return request('/users'); }
export async function createUser(user) { return request('/users', { method: 'POST', body: JSON.stringify(user) }); }
export async function updateUser(id, patch) { return request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }); }

// --- Serial numbers & warranty (all roles can read; Admin and Warehouse Staff can write) ---
const qs = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};
/** -> { data: [serial...], summary: { total, in_stock, sold, returned, defective, expiring_soon, expired } } */
export async function getSerials(params) { return request(`/serials${qs(params)}`); }
export async function registerSerials(payload) { return request('/serials', { method: 'POST', body: JSON.stringify(payload) }); }
/** payload: { to: 'sold'|'returned'|'defective', customer_name?, customer_contact?, sold_at?, notes? } */
export async function changeSerialStatus(id, payload) { return request(`/serials/${id}/status`, { method: 'POST', body: JSON.stringify(payload) }); }

// --- Purchasing (Admin and Warehouse Staff; approving is Admin only) ---
export async function getSuppliers() { return request('/suppliers'); }
export async function createSupplier(supplier) { return request('/suppliers', { method: 'POST', body: JSON.stringify(supplier) }); }
export async function updateSupplier(id, supplier) { return request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(supplier) }); }
export async function getPurchaseOrders(status) { return request(`/purchase-orders${qs({ status })}`); }
/** -> { purchase_order, lines: [...], batches: [...] } */
export async function getPurchaseOrder(id) { return request(`/purchase-orders/${id}`); }
export async function createPurchaseOrder(payload) { return request('/purchase-orders', { method: 'POST', body: JSON.stringify(payload) }); }
export async function approvePurchaseOrder(id) { return request(`/purchase-orders/${id}/approve`, { method: 'POST' }); }
export async function cancelPurchaseOrder(id, reason) { return request(`/purchase-orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }); }
/** lines: [{ line_id, lot_id, quantity, received_date?, expiry_date? }] */
export async function receivePurchaseOrder(id, lines) { return request(`/purchase-orders/${id}/receive`, { method: 'POST', body: JSON.stringify({ lines }) }); }
export async function getReorderSuggestions() { return request('/reports/reorder-suggestions'); }

// --- Audit log (Admin only) ---
/** -> { data, total, page, per_page, actions, entity_types, actors } */
export async function getAudit(params) { return request(`/audit${qs(params)}`); }

// Revoke the session on the server. Uses fetch directly so a stale token can never trigger the sign-out loop.
export async function logoutApi(token) {
  try { await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }); } catch { /* ignore */ }
}