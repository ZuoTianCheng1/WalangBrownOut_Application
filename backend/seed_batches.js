import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Support both Node 22+ built-in node:sqlite and better-sqlite3
let db;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(process.env.DATABASE_PATH || path.join(__dirname, 'data', 'inventory.sqlite'));
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

try {
  const { DatabaseSync } = await import('node:sqlite');
  db = new DatabaseSync(dbPath);
} catch (e) {
  const { default: Database } = await import('better-sqlite3');
  db = new Database(dbPath);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('Admin','Warehouse Staff','Viewer')),active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS items(sku_id TEXT PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,handling_class TEXT,abc_class TEXT,xyz_class TEXT,lead_time_days INTEGER DEFAULT 0,shelf_life_days INTEGER DEFAULT 0,unit_price REAL NOT NULL DEFAULT 0,reorder_point INTEGER NOT NULL DEFAULT 0,created_by TEXT,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS batches(lot_id TEXT PRIMARY KEY,sku_id TEXT NOT NULL REFERENCES items(sku_id),received_date TEXT NOT NULL,expiry_date TEXT,qty_received INTEGER NOT NULL,qty_remaining INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'active');
  CREATE TABLE IF NOT EXISTS movements(id INTEGER PRIMARY KEY AUTOINCREMENT,lot_id TEXT NOT NULL,sku_id TEXT NOT NULL,type TEXT NOT NULL,quantity INTEGER NOT NULL,reason TEXT,actor TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS alerts(id INTEGER PRIMARY KEY AUTOINCREMENT,tier TEXT NOT NULL,kind TEXT,sku_id TEXT,lot_id TEXT,title TEXT NOT NULL,meta TEXT,resolved INTEGER NOT NULL DEFAULT 0,resolved_by TEXT,resolved_at TEXT,resolution_notes TEXT,snoozed_until TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,action TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,details TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
`);

console.log(`\n🌱 Seeding Batches for Database: ${dbPath}`);

const sampleItems = [
  { sku_id: 'AC-PORT-10K', name: 'Portable AC Unit 10,000 BTU', category: 'Air Conditioning', handling_class: 'STANDARD', abc_class: 'A', xyz_class: 'Z', unit_price: 18500, reorder_point: 20 },
  { sku_id: 'FILT-F110', name: 'Air Purifier Filter F-110', category: 'Air Quality', handling_class: 'PERISHABLE', abc_class: 'B', xyz_class: 'X', unit_price: 850, reorder_point: 40 },
  { sku_id: 'FILT-F220', name: 'Air Purifier Filter F-220 Heavy', category: 'Air Quality', handling_class: 'PERISHABLE', abc_class: 'B', xyz_class: 'X', unit_price: 1200, reorder_point: 25 },
  { sku_id: 'PURIF-P1', name: 'Air Purifier P1 Compact', category: 'Air Quality', handling_class: 'STANDARD', abc_class: 'B', xyz_class: 'Y', unit_price: 5400, reorder_point: 20 },
  { sku_id: 'THERM-T1', name: 'Smart Thermostat T1', category: 'Climate Control', handling_class: 'STANDARD', abc_class: 'A', xyz_class: 'X', unit_price: 6200, reorder_point: 30 },
  { sku_id: 'ACC-CORD', name: 'Heavy Duty Extension Cord', category: 'Accessories', handling_class: 'STANDARD', abc_class: 'C', xyz_class: 'Y', unit_price: 380, reorder_point: 45 },
];

const insertItem = db.prepare(`
  INSERT OR IGNORE INTO items (sku_id, name, category, handling_class, abc_class, xyz_class, unit_price, reorder_point, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'System Seeder')
`);

for (const it of sampleItems) {
  insertItem.run(it.sku_id, it.name, it.category, it.handling_class, it.abc_class, it.xyz_class, it.unit_price, it.reorder_point);
}

// Compute dynamic dates relative to today
const today = new Date();
const fmt = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return fmt(d); };
const daysAhead = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d); };

const sampleBatches = [
  // EXPIRED BATCHES (to test delete and purge functions)
  {
    lot_id: 'LOT-EXP-2026-A',
    sku_id: 'FILT-F110',
    received_date: daysAgo(180),
    expiry_date: daysAgo(30), // Expired 30 days ago
    qty_received: 50,
    qty_remaining: 18,
    status: 'expired',
    alert: 'Critical: Batch LOT-EXP-2026-A reached expiration date',
  },
  {
    lot_id: 'LOT-EXP-2026-B',
    sku_id: 'FILT-F220',
    received_date: daysAgo(210),
    expiry_date: daysAgo(15), // Expired 15 days ago
    qty_received: 40,
    qty_remaining: 12,
    status: 'expired',
    alert: 'Critical: Batch LOT-EXP-2026-B reached expiration date',
  },
  {
    lot_id: 'LOT-EXP-2026-C',
    sku_id: 'FILT-F110',
    received_date: daysAgo(240),
    expiry_date: daysAgo(5), // Expired 5 days ago
    qty_received: 35,
    qty_remaining: 7,
    status: 'expired',
    alert: 'Critical: Batch LOT-EXP-2026-C reached expiration date',
  },

  // NEAR EXPIRY BATCHES
  {
    lot_id: 'LOT-NEAR-2026-1',
    sku_id: 'FILT-F110',
    received_date: daysAgo(90),
    expiry_date: daysAhead(12), // Expiring in 12 days
    qty_received: 60,
    qty_remaining: 24,
    status: 'near_expiry',
    alert: 'Warning: Batch LOT-NEAR-2026-1 expiring in 12 days',
  },
  {
    lot_id: 'LOT-NEAR-2026-2',
    sku_id: 'FILT-F220',
    received_date: daysAgo(100),
    expiry_date: daysAhead(22), // Expiring in 22 days
    qty_received: 45,
    qty_remaining: 19,
    status: 'near_expiry',
    alert: 'Warning: Batch LOT-NEAR-2026-2 expiring in 22 days',
  },

  // ACTIVE BATCHES
  {
    lot_id: 'LOT-ACT-2026-1',
    sku_id: 'AC-PORT-10K',
    received_date: daysAgo(30),
    expiry_date: null, // Non-perishable standard item
    qty_received: 25,
    qty_remaining: 15,
    status: 'active',
  },
  {
    lot_id: 'LOT-ACT-2026-2',
    sku_id: 'THERM-T1',
    received_date: daysAgo(20),
    expiry_date: null,
    qty_received: 40,
    qty_remaining: 28,
    status: 'active',
  },
  {
    lot_id: 'LOT-ACT-2026-3',
    sku_id: 'FILT-F220',
    received_date: daysAgo(15),
    expiry_date: daysAhead(180), // Expiring in 6 months
    qty_received: 80,
    qty_remaining: 72,
    status: 'active',
  },
  {
    lot_id: 'LOT-ACT-2026-4',
    sku_id: 'PURIF-P1',
    received_date: daysAgo(10),
    expiry_date: null,
    qty_received: 30,
    qty_remaining: 22,
    status: 'active',
  },
  {
    lot_id: 'LOT-ACT-2026-5',
    sku_id: 'ACC-CORD',
    received_date: daysAgo(5),
    expiry_date: null,
    qty_received: 100,
    qty_remaining: 95,
    status: 'active',
  },
];

const insertBatch = db.prepare(`
  INSERT OR REPLACE INTO batches (lot_id, sku_id, received_date, expiry_date, qty_received, qty_remaining, status)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertMovement = db.prepare(`
  INSERT INTO movements (lot_id, sku_id, type, quantity, reason, actor, created_at)
  VALUES (?, ?, ?, ?, ?, 'System Seeder', ?)
`);

const insertAlert = db.prepare(`
  INSERT INTO alerts (tier, kind, sku_id, lot_id, title, resolved, created_at)
  VALUES (?, 'expiry', ?, ?, ?, 0, datetime('now'))
`);

let seededBatches = 0;
for (const b of sampleBatches) {
  insertBatch.run(b.lot_id, b.sku_id, b.received_date, b.expiry_date, b.qty_received, b.qty_remaining, b.status);
  seededBatches++;

  // Initial movement
  insertMovement.run(b.lot_id, b.sku_id, 'received', b.qty_received, 'Initial stock delivery', b.received_date);

  // If some quantity was used
  const used = b.qty_received - b.qty_remaining;
  if (used > 0) {
    insertMovement.run(b.lot_id, b.sku_id, 'used', used, 'Fulfillment / sales order', daysAgo(5));
  }

  // Insert alert if expired or near expiry
  if (b.alert) {
    const tier = b.status === 'expired' ? 'critical' : 'warning';
    insertAlert.run(tier, b.sku_id, b.lot_id, b.alert);
  }
}

console.log(`✅ Successfully seeded ${seededBatches} batches (active, near_expiry, and expired)!`);
console.log(`✨ You can now test the Batches page, search filters, and delete functions.\n`);
