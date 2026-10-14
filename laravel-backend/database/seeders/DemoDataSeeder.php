<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Loads the demo inventory that used to live in src/data/mockData.js
 * (items, batches with history, alerts) and, optionally, one demo user per role.
 *
 * Safe to run more than once: rows that already exist are skipped.
 *   php artisan db:seed --class=DemoDataSeeder
 *
 * Demo users are only created when APP_ENV=local and DEMO_USER_PASSWORD
 * (12+ characters) is set in .env. Do not seed them in production.
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $items = json_decode(<<<'JSON'
[
 {
  "sku_id": "AC-PORT-10K",
  "name": "Portable AC Unit 10,000 BTU",
  "category": "Air Conditioning",
  "handling_class": "STANDARD",
  "abc_class": "A",
  "xyz_class": "Z",
  "lead_time_days": 12,
  "shelf_life_days": 0,
  "unit_price": 18500,
  "reorder_point": 22
 },
 {
  "sku_id": "AC-PORT-14K",
  "name": "Portable AC Unit 14,000 BTU",
  "category": "Air Conditioning",
  "handling_class": "STANDARD",
  "abc_class": "A",
  "xyz_class": "Z",
  "lead_time_days": 14,
  "shelf_life_days": 0,
  "unit_price": 24900,
  "reorder_point": 18
 },
 {
  "sku_id": "THERM-T1",
  "name": "Smart Thermostat T1",
  "category": "Climate Control",
  "handling_class": "STANDARD",
  "abc_class": "A",
  "xyz_class": "X",
  "lead_time_days": 9,
  "shelf_life_days": 0,
  "unit_price": 6200,
  "reorder_point": 30
 },
 {
  "sku_id": "THERM-T2",
  "name": "Smart Thermostat T2 Pro",
  "category": "Climate Control",
  "handling_class": "STANDARD",
  "abc_class": "A",
  "xyz_class": "X",
  "lead_time_days": 9,
  "shelf_life_days": 0,
  "unit_price": 8900,
  "reorder_point": 25
 },
 {
  "sku_id": "PURIF-P1",
  "name": "Air Purifier P1 Compact",
  "category": "Air Quality",
  "handling_class": "STANDARD",
  "abc_class": "B",
  "xyz_class": "Y",
  "lead_time_days": 10,
  "shelf_life_days": 0,
  "unit_price": 5400,
  "reorder_point": 20
 },
 {
  "sku_id": "PURIF-P2",
  "name": "Air Purifier P2 Whole-Room",
  "category": "Air Quality",
  "handling_class": "STANDARD",
  "abc_class": "B",
  "xyz_class": "Y",
  "lead_time_days": 10,
  "shelf_life_days": 0,
  "unit_price": 9800,
  "reorder_point": 15
 },
 {
  "sku_id": "FILT-F110",
  "name": "Air Purifier Filter F-110",
  "category": "Air Quality",
  "handling_class": "PERISHABLE",
  "abc_class": "B",
  "xyz_class": "X",
  "lead_time_days": 5,
  "shelf_life_days": 365,
  "unit_price": 850,
  "reorder_point": 60
 },
 {
  "sku_id": "FILT-F220",
  "name": "Air Purifier Filter F-220",
  "category": "Air Quality",
  "handling_class": "PERISHABLE",
  "abc_class": "B",
  "xyz_class": "X",
  "lead_time_days": 5,
  "shelf_life_days": 270,
  "unit_price": 950,
  "reorder_point": 50
 },
 {
  "sku_id": "ACC-REMOTE",
  "name": "Universal Remote",
  "category": "Accessories",
  "handling_class": "STANDARD",
  "abc_class": "C",
  "xyz_class": "X",
  "lead_time_days": 7,
  "shelf_life_days": 0,
  "unit_price": 450,
  "reorder_point": 40
 },
 {
  "sku_id": "ACC-BRACKET",
  "name": "Wall Mount Bracket",
  "category": "Accessories",
  "handling_class": "STANDARD",
  "abc_class": "C",
  "xyz_class": "X",
  "lead_time_days": 7,
  "shelf_life_days": 0,
  "unit_price": 620,
  "reorder_point": 35
 },
 {
  "sku_id": "ACC-CORD",
  "name": "Heavy Duty Extension Cord",
  "category": "Accessories",
  "handling_class": "STANDARD",
  "abc_class": "C",
  "xyz_class": "Y",
  "lead_time_days": 6,
  "shelf_life_days": 0,
  "unit_price": 380,
  "reorder_point": 45
 },
 {
  "sku_id": "PWR-REG1000",
  "name": "Voltage Regulator 1000VA",
  "category": "Power",
  "handling_class": "STANDARD",
  "abc_class": "B",
  "xyz_class": "X",
  "lead_time_days": 11,
  "shelf_life_days": 0,
  "unit_price": 3200,
  "reorder_point": 24
 },
 {
  "sku_id": "PWR-WHEAT6L",
  "name": "Tankless Water Heater 6L",
  "category": "Power",
  "handling_class": "STANDARD",
  "abc_class": "B",
  "xyz_class": "Y",
  "lead_time_days": 15,
  "shelf_life_days": 0,
  "unit_price": 7400,
  "reorder_point": 16
 },
 {
  "sku_id": "CLIM-FAN01",
  "name": "Ceiling Fan Deluxe",
  "category": "Climate Control",
  "handling_class": "STANDARD",
  "abc_class": "C",
  "xyz_class": "Y",
  "lead_time_days": 8,
  "shelf_life_days": 0,
  "unit_price": 4100,
  "reorder_point": 18
 }
]
JSON, true);

        $batches = json_decode(<<<'JSON'
[
 {
  "lot_id": "B-2201",
  "sku_id": "AC-PORT-10K",
  "received_date": "2026-06-02",
  "qty_received": 40,
  "qty_remaining": 9
 },
 {
  "lot_id": "B-2214",
  "sku_id": "AC-PORT-10K",
  "received_date": "2026-07-18",
  "qty_received": 30,
  "qty_remaining": 14
 },
 {
  "lot_id": "B-2199",
  "sku_id": "AC-PORT-14K",
  "received_date": "2026-05-28",
  "qty_received": 25,
  "qty_remaining": 6
 },
 {
  "lot_id": "B-2233",
  "sku_id": "AC-PORT-14K",
  "received_date": "2026-08-10",
  "qty_received": 20,
  "qty_remaining": 11
 },
 {
  "lot_id": "B-2110",
  "sku_id": "THERM-T1",
  "received_date": "2026-07-01",
  "qty_received": 60,
  "qty_remaining": 34
 },
 {
  "lot_id": "B-2144",
  "sku_id": "THERM-T2",
  "received_date": "2026-07-15",
  "qty_received": 40,
  "qty_remaining": 18
 },
 {
  "lot_id": "B-2060",
  "sku_id": "PURIF-P1",
  "received_date": "2026-06-20",
  "qty_received": 35,
  "qty_remaining": 22
 },
 {
  "lot_id": "B-2071",
  "sku_id": "PURIF-P2",
  "received_date": "2026-06-25",
  "qty_received": 20,
  "qty_remaining": 9
 },
 {
  "lot_id": "B-2298",
  "sku_id": "FILT-F110",
  "received_date": "2026-08-05",
  "qty_received": 80,
  "qty_remaining": 52
 },
 {
  "lot_id": "B-2231",
  "sku_id": "FILT-F220",
  "received_date": "2026-01-20",
  "qty_received": 60,
  "qty_remaining": 6
 },
 {
  "lot_id": "B-2255",
  "sku_id": "FILT-F220",
  "received_date": "2026-08-01",
  "qty_received": 40,
  "qty_remaining": 28
 },
 {
  "lot_id": "B-1980",
  "sku_id": "ACC-REMOTE",
  "received_date": "2026-05-10",
  "qty_received": 100,
  "qty_remaining": 61
 },
 {
  "lot_id": "B-1995",
  "sku_id": "ACC-BRACKET",
  "received_date": "2026-05-15",
  "qty_received": 90,
  "qty_remaining": 40
 },
 {
  "lot_id": "B-2005",
  "sku_id": "ACC-CORD",
  "received_date": "2026-05-20",
  "qty_received": 120,
  "qty_remaining": 58
 },
 {
  "lot_id": "B-2088",
  "sku_id": "PWR-REG1000",
  "received_date": "2026-07-02",
  "qty_received": 30,
  "qty_remaining": 13
 },
 {
  "lot_id": "B-2091",
  "sku_id": "PWR-WHEAT6L",
  "received_date": "2026-07-05",
  "qty_received": 22,
  "qty_remaining": 7
 },
 {
  "lot_id": "B-2102",
  "sku_id": "CLIM-FAN01",
  "received_date": "2026-07-08",
  "qty_received": 28,
  "qty_remaining": 12
 }
]
JSON, true);

        $alerts = json_decode(<<<'JSON'
[
 {
  "tier": "critical",
  "kind": "near_expiry",
  "sku_id": "FILT-F220",
  "lot_id": "B-2231",
  "title": "Near-expiry — Air Purifier Filter F-220",
  "meta": "Batch B-2231 · 6 units · expires 2026-10-17",
  "resolved": false
 },
 {
  "tier": "warning",
  "kind": "reorder",
  "sku_id": "AC-PORT-14K",
  "lot_id": null,
  "title": "Reorder point breached — Portable AC Unit 14,000 BTU",
  "meta": "On hand 17 · reorder point 18 · lead time 14d",
  "resolved": false
 },
 {
  "tier": "warning",
  "kind": "reorder",
  "sku_id": "PWR-WHEAT6L",
  "lot_id": null,
  "title": "Reorder point breached — Tankless Water Heater 6L",
  "meta": "On hand 7 · reorder point 16 · lead time 15d",
  "resolved": false
 },
 {
  "tier": "warning",
  "kind": "near_expiry",
  "sku_id": "FILT-F220",
  "lot_id": "B-2255",
  "title": "Near-expiry — Air Purifier Filter F-220",
  "meta": "Batch B-2255 · expires within 30 days",
  "resolved": false
 },
 {
  "tier": "info",
  "kind": "seasonal",
  "sku_id": "AC-PORT-10K",
  "lot_id": null,
  "title": "Seasonal threshold raised for AZ-class item",
  "meta": "Portable AC Unit 10,000 BTU · lead-time-plus-buffer window opened",
  "resolved": false
 },
 {
  "tier": "info",
  "kind": "count",
  "sku_id": "ACC-REMOTE",
  "lot_id": null,
  "title": "Physical count reconciled — 0 variance",
  "meta": "Universal Remote · count sheet CS-0091",
  "resolved": true
 }
]
JSON, true);

        foreach ($items as $i) {
            if (DB::table('items')->where('sku_id', $i['sku_id'])->exists()) {
                continue;
            }
            DB::table('items')->insert($i + ['created_at' => now(), 'updated_at' => now()]);
        }

        foreach ($batches as $b) {
            if (DB::table('batches')->where('lot_id', $b['lot_id'])->exists()) {
                continue;
            }
            $item = DB::table('items')->where('sku_id', $b['sku_id'])->first();
            if (!$item) {
                continue;
            }
            $expiry = $item->shelf_life_days > 0
                ? date('Y-m-d', strtotime($b['received_date'] . ' +' . $item->shelf_life_days . ' days'))
                : null;

            $batchId = DB::table('batches')->insertGetId([
                'lot_id' => $b['lot_id'],
                'item_id' => $item->id,
                'received_date' => $b['received_date'],
                'expiry_date' => $expiry,
                'qty_received' => $b['qty_received'],
                'qty_remaining' => $b['qty_remaining'],
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('movements')->insert([
                'item_id' => $item->id,
                'batch_id' => $batchId,
                'type' => 'received',
                'quantity' => $b['qty_received'],
                'reason' => 'Batch received',
                'actor_id' => null,
                'created_at' => $b['received_date'] . ' 08:00:00',
                'updated_at' => $b['received_date'] . ' 08:00:00',
            ]);

            $used = $b['qty_received'] - $b['qty_remaining'];
            if ($used > 0) {
                DB::table('movements')->insert([
                    'item_id' => $item->id,
                    'batch_id' => $batchId,
                    'type' => 'issued',
                    'quantity' => $used,
                    'reason' => 'Historical usage (demo data)',
                    'actor_id' => null,
                    'created_at' => $b['received_date'] . ' 12:00:00',
                    'updated_at' => $b['received_date'] . ' 12:00:00',
                ]);
            }
        }

        foreach ($alerts as $a) {
            if (DB::table('alerts')->where('title', $a['title'])->exists()) {
                continue;
            }
            $item = $a['sku_id'] ? DB::table('items')->where('sku_id', $a['sku_id'])->first() : null;
            $batch = $a['lot_id'] ? DB::table('batches')->where('lot_id', $a['lot_id'])->first() : null;
            DB::table('alerts')->insert([
                'tier' => $a['tier'],
                'kind' => $a['kind'],
                'item_id' => $item->id ?? null,
                'batch_id' => $batch->id ?? null,
                'title' => $a['title'],
                'meta' => json_encode($a['meta'], JSON_UNESCAPED_UNICODE),
                'resolved' => $a['resolved'] ? 1 : 0,
                'resolved_at' => $a['resolved'] ? now() : null,
                'resolution_notes' => $a['resolved'] ? 'Count matched the system record.' : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->seedDemoUsers();
    }

    private function seedDemoUsers(): void
    {
        $password = env('DEMO_USER_PASSWORD');
        if (!app()->environment('local') || !$password || strlen($password) < 12) {
            $this->command?->warn('Demo users skipped. Set APP_ENV=local and DEMO_USER_PASSWORD (12+ chars) in .env to create them.');
            return;
        }

        $users = [
            ['name' => 'Demo Warehouse Staff', 'username' => 'staff', 'role' => 'Warehouse Staff'],
            ['name' => 'Demo Viewer', 'username' => 'viewer', 'role' => 'Viewer'],
        ];
        foreach ($users as $u) {
            if (DB::table('users')->where('username', $u['username'])->exists()) {
                continue;
            }
            DB::table('users')->insert($u + [
                'password' => Hash::make($password),
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}