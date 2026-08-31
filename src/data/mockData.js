/**
 * Mock inventory data for the WalangBrownout IMS app.
 *
 * Shaped like real backend records so src/services/api.js can be
 * pointed at a real database later without any page changing.
 */

export const categories = ['Air Conditioning', 'Climate Control', 'Air Quality', 'Accessories', 'Power'];

let itemSeed = [
  {
    sku_id: 'AC-PORT-10K', name: 'Portable AC Unit 10,000 BTU', category: 'Air Conditioning',
    handling_class: 'STANDARD', abc_class: 'A', xyz_class: 'Z',
    lead_time_days: 12, shelf_life_days: 0, unit_price: 18500, reorder_point: 22,
  },
  {
    sku_id: 'AC-PORT-14K', name: 'Portable AC Unit 14,000 BTU', category: 'Air Conditioning',
    handling_class: 'STANDARD', abc_class: 'A', xyz_class: 'Z',
    lead_time_days: 14, shelf_life_days: 0, unit_price: 24900, reorder_point: 18,
  },
  {
    sku_id: 'THERM-T1', name: 'Smart Thermostat T1', category: 'Climate Control',
    handling_class: 'STANDARD', abc_class: 'A', xyz_class: 'X',
    lead_time_days: 9, shelf_life_days: 0, unit_price: 6200, reorder_point: 30,
  },
  {
    sku_id: 'THERM-T2', name: 'Smart Thermostat T2 Pro', category: 'Climate Control',
    handling_class: 'STANDARD', abc_class: 'A', xyz_class: 'X',
    lead_time_days: 9, shelf_life_days: 0, unit_price: 8900, reorder_point: 25,
  },
  {
    sku_id: 'PURIF-P1', name: 'Air Purifier P1 Compact', category: 'Air Quality',
    handling_class: 'STANDARD', abc_class: 'B', xyz_class: 'Y',
    lead_time_days: 10, shelf_life_days: 0, unit_price: 5400, reorder_point: 20,
  },
  {
    sku_id: 'PURIF-P2', name: 'Air Purifier P2 Whole-Room', category: 'Air Quality',
    handling_class: 'STANDARD', abc_class: 'B', xyz_class: 'Y',
    lead_time_days: 10, shelf_life_days: 0, unit_price: 9800, reorder_point: 15,
  },
  {
    sku_id: 'FILT-F110', name: 'Air Purifier Filter F-110', category: 'Air Quality',
    handling_class: 'PERISHABLE', abc_class: 'B', xyz_class: 'X',
    lead_time_days: 5, shelf_life_days: 365, unit_price: 850, reorder_point: 60,
  },
  {
    sku_id: 'FILT-F220', name: 'Air Purifier Filter F-220', category: 'Air Quality',
    handling_class: 'PERISHABLE', abc_class: 'B', xyz_class: 'X',
    lead_time_days: 5, shelf_life_days: 270, unit_price: 950, reorder_point: 50,
  },
  {
    sku_id: 'ACC-REMOTE', name: 'Universal Remote', category: 'Accessories',
    handling_class: 'STANDARD', abc_class: 'C', xyz_class: 'X',
    lead_time_days: 7, shelf_life_days: 0, unit_price: 450, reorder_point: 40,
  },
  {
    sku_id: 'ACC-BRACKET', name: 'Wall Mount Bracket', category: 'Accessories',
    handling_class: 'STANDARD', abc_class: 'C', xyz_class: 'X',
    lead_time_days: 7, shelf_life_days: 0, unit_price: 620, reorder_point: 35,
  },
  {
    sku_id: 'ACC-CORD', name: 'Heavy Duty Extension Cord', category: 'Accessories',
    handling_class: 'STANDARD', abc_class: 'C', xyz_class: 'Y',
    lead_time_days: 6, shelf_life_days: 0, unit_price: 380, reorder_point: 45,
  },
  {
    sku_id: 'PWR-REG1000', name: 'Voltage Regulator 1000VA', category: 'Power',
    handling_class: 'STANDARD', abc_class: 'B', xyz_class: 'X',
    lead_time_days: 11, shelf_life_days: 0, unit_price: 3200, reorder_point: 24,
  },
  {
    sku_id: 'PWR-WHEAT6L', name: 'Tankless Water Heater 6L', category: 'Power',
    handling_class: 'STANDARD', abc_class: 'B', xyz_class: 'Y',
    lead_time_days: 15, shelf_life_days: 0, unit_price: 7400, reorder_point: 16,
  },
  {
    sku_id: 'CLIM-FAN01', name: 'Ceiling Fan Deluxe', category: 'Climate Control',
    handling_class: 'STANDARD', abc_class: 'C', xyz_class: 'Y',
    lead_time_days: 8, shelf_life_days: 0, unit_price: 4100, reorder_point: 18,
  },
];

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

let batchSeed = [
  { lot_id: 'B-2201', sku_id: 'AC-PORT-10K', received_date: '2026-06-02', qty_received: 40, qty_remaining: 9 },
  { lot_id: 'B-2214', sku_id: 'AC-PORT-10K', received_date: '2026-07-18', qty_received: 30, qty_remaining: 14 },
  { lot_id: 'B-2199', sku_id: 'AC-PORT-14K', received_date: '2026-05-28', qty_received: 25, qty_remaining: 6 },
  { lot_id: 'B-2233', sku_id: 'AC-PORT-14K', received_date: '2026-08-10', qty_received: 20, qty_remaining: 11 },
  { lot_id: 'B-2110', sku_id: 'THERM-T1', received_date: '2026-07-01', qty_received: 60, qty_remaining: 34 },
  { lot_id: 'B-2144', sku_id: 'THERM-T2', received_date: '2026-07-15', qty_received: 40, qty_remaining: 18 },
  { lot_id: 'B-2060', sku_id: 'PURIF-P1', received_date: '2026-06-20', qty_received: 35, qty_remaining: 22 },
  { lot_id: 'B-2071', sku_id: 'PURIF-P2', received_date: '2026-06-25', qty_received: 20, qty_remaining: 9 },
  { lot_id: 'B-2298', sku_id: 'FILT-F110', received_date: '2026-08-05', qty_received: 80, qty_remaining: 52, shelf_life_days: 365 },
  { lot_id: 'B-2231', sku_id: 'FILT-F220', received_date: '2026-01-20', qty_received: 60, qty_remaining: 6, shelf_life_days: 270 },
  { lot_id: 'B-2255', sku_id: 'FILT-F220', received_date: '2026-08-01', qty_received: 40, qty_remaining: 28, shelf_life_days: 270 },
  { lot_id: 'B-1980', sku_id: 'ACC-REMOTE', received_date: '2026-05-10', qty_received: 100, qty_remaining: 61 },
  { lot_id: 'B-1995', sku_id: 'ACC-BRACKET', received_date: '2026-05-15', qty_received: 90, qty_remaining: 40 },
  { lot_id: 'B-2005', sku_id: 'ACC-CORD', received_date: '2026-05-20', qty_received: 120, qty_remaining: 58 },
  { lot_id: 'B-2088', sku_id: 'PWR-REG1000', received_date: '2026-07-02', qty_received: 30, qty_remaining: 13 },
  { lot_id: 'B-2091', sku_id: 'PWR-WHEAT6L', received_date: '2026-07-05', qty_received: 22, qty_remaining: 7 },
  { lot_id: 'B-2102', sku_id: 'CLIM-FAN01', received_date: '2026-07-08', qty_received: 28, qty_remaining: 12 },
];

// compute expiry_date + status for perishable batches
batchSeed = batchSeed.map((b) => {
  const item = itemSeed.find((i) => i.sku_id === b.sku_id);
  const isPerishable = item?.handling_class === 'PERISHABLE';
  const expiry_date = isPerishable ? addDays(b.received_date, b.shelf_life_days ?? item.shelf_life_days) : null;
  let status = 'active';
  if (expiry_date) {
    const daysLeft = Math.floor((new Date(expiry_date) - new Date('2026-08-31')) / 86400000);
    if (daysLeft < 0) status = 'expired';
    else if (daysLeft <= 30) status = 'near_expiry';
  }
  return { ...b, expiry_date, status };
});

export function computeQtyOnHand(sku_id, batchList) {
  return batchList
    .filter((b) => b.sku_id === sku_id && b.status !== 'expired')
    .reduce((sum, b) => sum + b.qty_remaining, 0);
}

export const items = itemSeed.map((i) => {
  const qty_on_hand = computeQtyOnHand(i.sku_id, batchSeed);
  let stock_status = 'healthy';
  if (qty_on_hand <= 0) stock_status = 'out_of_stock';
  else if (qty_on_hand <= i.reorder_point) stock_status = 'below_reorder';
  return { ...i, qty_on_hand, stock_status };
});

export const batches = batchSeed;

export const alerts = [
  {
    id: 'a1', tier: 'critical', kind: 'expired', sku_id: 'FILT-F220', lot_id: 'B-2231',
    title: 'Batch expired \u2014 Air Purifier Filter F-220', meta: 'Batch B-2231 \u00b7 6 units \u00b7 excluded from FEFO',
    resolved: false,
  },
  {
    id: 'a2', tier: 'warning', kind: 'reorder', sku_id: 'AC-PORT-14K', lot_id: null,
    title: 'Reorder point breached \u2014 Portable AC Unit 14,000 BTU', meta: 'On hand 17 \u00b7 reorder point 18 \u00b7 lead time 14d',
    resolved: false,
  },
  {
    id: 'a3', tier: 'warning', kind: 'reorder', sku_id: 'PWR-WHEAT6L', lot_id: null,
    title: 'Reorder point breached \u2014 Tankless Water Heater 6L', meta: 'On hand 7 \u00b7 reorder point 16 \u00b7 lead time 15d',
    resolved: false,
  },
  {
    id: 'a4', tier: 'warning', kind: 'near_expiry', sku_id: 'FILT-F220', lot_id: 'B-2255',
    title: 'Near-expiry \u2014 Air Purifier Filter F-220', meta: 'Batch B-2255 \u00b7 expires within 30 days',
    resolved: false,
  },
  {
    id: 'a5', tier: 'info', kind: 'seasonal', sku_id: 'AC-PORT-10K', lot_id: null,
    title: 'Seasonal threshold raised for AZ-class item', meta: 'Portable AC Unit 10,000 BTU \u00b7 lead-time-plus-buffer window opened',
    resolved: false,
  },
  {
    id: 'a6', tier: 'info', kind: 'count', sku_id: 'ACC-REMOTE', lot_id: null,
    title: 'Physical count reconciled \u2014 0 variance', meta: 'Universal Remote \u00b7 count sheet CS-0091',
    resolved: true,
  },
];

export function dashboardSummary(itemList, batchList, alertList) {
  const belowReorder = itemList.filter((i) => i.stock_status !== 'healthy').length;
  const nearExpiryBatches = batchList.filter((b) => b.status === 'near_expiry').length;
  const expiredBatches = batchList.filter((b) => b.status === 'expired').length;
  const openAlerts = alertList.filter((a) => !a.resolved).length;
  const inventoryValue = itemList.reduce((sum, i) => sum + i.qty_on_hand * i.unit_price, 0);
  return { belowReorder, nearExpiryBatches, expiredBatches, openAlerts, inventoryValue };
}
