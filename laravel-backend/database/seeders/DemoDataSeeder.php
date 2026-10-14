<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

/**
 * Loads demo data: the inventory that used to live in src/data/mockData.js
 * (items, batches with history, alerts), plus warranty periods, suppliers,
 * purchase orders in every status, serial numbers and matching audit entries.
 * Optionally one demo user per role.
 *
 * Safe to run more than once: rows that already exist are skipped.
 *   php artisan migrate
 *   php artisan db:seed --class=DemoDataSeeder
 *
 * Demo users are only created when APP_ENV=local and DEMO_USER_PASSWORD
 * (12+ characters) is set in .env. Do not seed them in production.
 */
class DemoDataSeeder extends Seeder
{
    /** Default warranty (months) for serialized appliances. */
    private const WARRANTY = [
        'AC-PORT-10K' => 24, 'AC-PORT-14K' => 24, 'PWR-REG1000' => 24, 'PWR-WHEAT6L' => 24,
        'THERM-T1' => 12, 'THERM-T2' => 12, 'CLIM-FAN01' => 12, 'PURIF-P1' => 12, 'PURIF-P2' => 12,
    ];

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
  "title": "Near-expiry — Air Purifier Filter F-220 (Batch B-2231)",
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
            $item = $a['sku_id'] ? DB::table('items')->where('sku_id', $a['sku_id'])->first() : null;
            $batch = $a['lot_id'] ? DB::table('batches')->where('lot_id', $a['lot_id'])->first() : null;
            $dup = DB::table('alerts')->where('title', $a['title']);
            $batch ? $dup->where('batch_id', $batch->id) : $dup->whereNull('batch_id');
            if ($dup->exists()) {
                continue;
            }
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

        if (!Schema::hasTable('item_serials') || !Schema::hasColumn('items', 'warranty_months')) {
            $this->command?->warn('Skipped warranty, suppliers, purchase orders and serials. Run "php artisan migrate", then seed again.');
            return;
        }
        $this->seedWarranty();
        $this->seedSuppliersAndOrders();
        $this->seedSerials();
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

    private function seedWarranty(): void
    {
        foreach (self::WARRANTY as $sku => $months) {
            DB::table('items')->where('sku_id', $sku)->where('warranty_months', 0)->update(['warranty_months' => $months]);
        }
    }

    private function audit($actor, string $action, string $type, $id, $when, array $details = []): void
    {
        DB::table('audit_log')->insert([
            'actor_id' => $actor ?: null,
            'action' => $action,
            'entity_type' => $type,
            'entity_id' => (string) $id,
            'details' => json_encode($details + ['source' => 'demo seed']),
            'created_at' => $when->toDateTimeString(),
            'updated_at' => $when->toDateTimeString(),
        ]);
    }

    private function seedSuppliersAndOrders(): void
    {
        $suppliers = [
            ['name' => 'Coolwave Appliance Distributors', 'contact_name' => 'Ramon Aquino', 'email' => 'orders@coolwave.example', 'phone' => '+63 2 8555 0101', 'address' => 'Quezon City, Metro Manila'],
            ['name' => 'PowerShield Electronics Trading', 'contact_name' => 'Lorna Mercado', 'email' => 'sales@powershield.example', 'phone' => '+63 2 8555 0142', 'address' => 'Mandaluyong City, Metro Manila'],
            ['name' => 'AirPure Components Corp.', 'contact_name' => 'Dennis Uy', 'email' => 'supply@airpure.example', 'phone' => '+63 49 555 0177', 'address' => 'Calamba, Laguna'],
        ];
        $supplierId = [];
        foreach ($suppliers as $s) {
            $existing = DB::table('suppliers')->where('name', $s['name'])->first();
            $supplierId[$s['name']] = $existing->id ?? DB::table('suppliers')->insertGetId($s + ['created_at' => now(), 'updated_at' => now()]);
        }

        $admin = DB::table('users')->where('role', 'Admin')->orderBy('id')->value('id');
        $staff = DB::table('users')->where('username', 'staff')->value('id');
        $creator = $staff ?: $admin;

        // [sku, qty (new lines), lot (link an existing batch), extra still to arrive]
        $orders = [
            ['no' => 'PO-2026-0001', 'supplier' => 'Coolwave Appliance Distributors', 'status' => 'received', 'days_ago' => 125, 'lines' => [['AC-PORT-10K', 0, 'B-2201', 0], ['AC-PORT-14K', 0, 'B-2199', 0]]],
            ['no' => 'PO-2026-0002', 'supplier' => 'PowerShield Electronics Trading', 'status' => 'partially_received', 'days_ago' => 105, 'lines' => [['PWR-REG1000', 0, 'B-2088', 15], ['PWR-WHEAT6L', 0, 'B-2091', 0]]],
            ['no' => 'PO-2026-0003', 'supplier' => 'AirPure Components Corp.', 'status' => 'ordered', 'days_ago' => 6, 'expected_in' => 9, 'lines' => [['PURIF-P1', 25, null, 0], ['FILT-F220', 100, null, 0]]],
            ['no' => 'PO-2026-0004', 'supplier' => 'Coolwave Appliance Distributors', 'status' => 'draft', 'days_ago' => 1, 'lines' => [['AC-PORT-14K', 15, null, 0], ['AC-PORT-10K', 10, null, 0]]],
            ['no' => 'PO-2026-0005', 'supplier' => 'PowerShield Electronics Trading', 'status' => 'cancelled', 'days_ago' => 40, 'cancel' => 'Supplier discontinued this model; replaced by a newer unit.', 'lines' => [['PWR-WHEAT6L', 20, null, 0]]],
        ];

        foreach ($orders as $o) {
            if (DB::table('purchase_orders')->where('po_number', $o['no'])->exists()) {
                continue;
            }
            $when = now()->subDays($o['days_ago']);
            $approved = !in_array($o['status'], ['draft', 'cancelled'], true);
            $poId = DB::table('purchase_orders')->insertGetId([
                'po_number' => $o['no'],
                'supplier_id' => $supplierId[$o['supplier']],
                'status' => $o['status'],
                'ordered_at' => $o['status'] === 'draft' ? null : $when->toDateString(),
                'expected_at' => isset($o['expected_in']) ? now()->addDays($o['expected_in'])->toDateString() : $when->copy()->addDays(14)->toDateString(),
                'notes' => 'Demo purchase order',
                'created_by' => $creator,
                'approved_by' => $approved ? $admin : null,
                'approved_at' => $approved ? $when->copy()->addHours(3)->toDateTimeString() : null,
                'cancelled_at' => $o['status'] === 'cancelled' ? $when->copy()->addDays(2)->toDateTimeString() : null,
                'cancel_reason' => $o['cancel'] ?? null,
                'created_at' => $when->toDateTimeString(),
                'updated_at' => $when->toDateTimeString(),
            ]);

            $total = 0;
            foreach ($o['lines'] as [$sku, $qty, $lot, $extra]) {
                $item = DB::table('items')->where('sku_id', $sku)->first();
                if (!$item) {
                    continue;
                }
                $cost = round($item->unit_price * 0.7, 2);
                $received = 0;
                if ($lot) {
                    $batch = DB::table('batches')->where('lot_id', $lot)->first();
                    if (!$batch) {
                        continue;
                    }
                    $received = (int) $batch->qty_received;
                    $qty = $received + $extra;
                    DB::table('batches')->where('id', $batch->id)->update(['purchase_order_id' => $poId]);
                }
                $total += $qty * $cost;
                DB::table('purchase_order_lines')->insert([
                    'purchase_order_id' => $poId, 'item_id' => $item->id, 'quantity_ordered' => $qty,
                    'quantity_received' => $received, 'unit_cost' => $cost, 'created_at' => now(), 'updated_at' => now(),
                ]);
            }

            $base = ['po_number' => $o['no']];
            $this->audit($creator, 'create', 'purchase_order', $poId, $when, $base + ['total' => round($total, 2)]);
            if ($approved) {
                $this->audit($admin, 'approve', 'purchase_order', $poId, $when->copy()->addHours(3), $base);
            }
            if (in_array($o['status'], ['received', 'partially_received'], true)) {
                $this->audit($creator, 'receive_purchase_order', 'purchase_order', $poId, $when->copy()->addDays(9), $base + ['status' => $o['status']]);
            }
            if ($o['status'] === 'cancelled') {
                $this->audit($creator, 'cancel', 'purchase_order', $poId, $when->copy()->addDays(2), $base + ['reason' => $o['cancel']]);
            }
        }
    }

    private function seedSerials(): void
    {
        $customers = ['Maria Santos', 'Juan Dela Cruz', 'Rosario Reyes', 'Mercado Trading', 'Lopez Family Store', 'Ana Villanueva', 'Carlo Mendoza', 'Isabel Navarro', 'Villa Verde Resort', 'Paolo Garcia'];
        $c = 0;
        $today = strtotime(date('Y-m-d'));

        // Units from recent lots. Counts stay consistent with each lot's history:
        // sold/claimed units <= units already used, in-stock + returned <= units remaining.
        foreach (self::WARRANTY as $sku => $months) {
            $item = DB::table('items')->where('sku_id', $sku)->first();
            if (!$item) {
                continue;
            }
            $lots = DB::table('batches')->where('item_id', $item->id)->orderBy('received_date')->get();
            foreach ($lots as $bi => $b) {
                $plan = $bi === 0
                    ? ['sold', 'sold', 'sold', 'in_stock', 'in_stock', 'in_stock']
                    : ['sold', 'sold', 'defective', 'in_stock', 'in_stock', 'returned'];
                $used = $b->qty_received - $b->qty_remaining;
                $usedPlanned = 0;
                $stockPlanned = 0;
                $n = 0;
                foreach ($plan as $status) {
                    $leaves = in_array($status, ['sold', 'defective'], true);
                    if ($leaves ? $usedPlanned >= $used : $stockPlanned >= $b->qty_remaining) {
                        continue;
                    }
                    $leaves ? $usedPlanned++ : $stockPlanned++;
                    $n++;
                    $serial = sprintf('%s-%s-%02d', $sku, $b->lot_id, $n);
                    if (DB::table('item_serials')->where('serial_number', $serial)->exists()) {
                        continue;
                    }
                    $row = ['serial_number' => $serial, 'item_id' => $item->id, 'batch_id' => $b->id, 'status' => $status, 'created_at' => now(), 'updated_at' => now()];
                    if ($leaves) {
                        $days = (int) floor(($today - strtotime($b->received_date)) / 86400);
                        $soldAt = date('Y-m-d', strtotime($b->received_date . ' +' . max(0, min($days - 1, 5 + 9 * $n)) . ' days'));
                        $row += [
                            'customer_name' => $customers[$c++ % count($customers)],
                            'sold_at' => $soldAt,
                            'warranty_start' => $soldAt,
                            'warranty_end' => date('Y-m-d', strtotime($soldAt . ' +' . $months . ' months')),
                        ];
                        if ($status === 'defective') {
                            $row['notes'] = 'Customer reported unit not powering on; replacement pending.';
                        }
                    }
                    DB::table('item_serials')->insert($row);
                }
            }
        }

        // Units sold before this system was adopted (not tied to a lot): these show warranties
        // that are expiring soon or already expired.
        $legacy = [
            ['AC-PORT-10K', 710, 'Villa Verde Resort'], ['AC-PORT-10K', 800, 'Lopez Family Store'],
            ['THERM-T1', 350, 'Maria Santos'], ['PURIF-P1', 420, 'Carlo Mendoza'], ['PWR-REG1000', 400, 'Mercado Trading'],
        ];
        foreach ($legacy as $k => [$sku, $daysAgo, $customer]) {
            $item = DB::table('items')->where('sku_id', $sku)->first();
            if (!$item) {
                continue;
            }
            $serial = sprintf('%s-LEG-%02d', $sku, $k + 1);
            if (DB::table('item_serials')->where('serial_number', $serial)->exists()) {
                continue;
            }
            $soldAt = date('Y-m-d', $today - $daysAgo * 86400);
            DB::table('item_serials')->insert([
                'serial_number' => $serial, 'item_id' => $item->id, 'batch_id' => null, 'status' => 'sold',
                'customer_name' => $customer, 'sold_at' => $soldAt, 'warranty_start' => $soldAt,
                'warranty_end' => date('Y-m-d', strtotime($soldAt . ' +' . (int) $item->warranty_months . ' months')),
                'notes' => 'Imported from pre-system sales records.', 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }
}