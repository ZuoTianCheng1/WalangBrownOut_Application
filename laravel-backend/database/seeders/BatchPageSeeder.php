<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BatchPageSeeder extends Seeder
{
    public function run(): void
    {
        $today = today();

        // 1. Ensure test items exist
        $items = [
            ['sku_id' => 'FILT-F110', 'name' => 'Air Purifier Filter F-110', 'category' => 'Air Quality', 'handling_class' => 'PERISHABLE', 'abc_class' => 'B', 'xyz_class' => 'X', 'unit_price' => 850, 'reorder_point' => 40, 'shelf_life_days' => 365],
            ['sku_id' => 'FILT-F220', 'name' => 'Air Purifier Filter F-220 Heavy', 'category' => 'Air Quality', 'handling_class' => 'PERISHABLE', 'abc_class' => 'B', 'xyz_class' => 'X', 'unit_price' => 1200, 'reorder_point' => 25, 'shelf_life_days' => 270],
            ['sku_id' => 'AC-PORT-10K', 'name' => 'Portable AC Unit 10,000 BTU', 'category' => 'Air Conditioning', 'handling_class' => 'STANDARD', 'abc_class' => 'A', 'xyz_class' => 'Z', 'unit_price' => 18500, 'reorder_point' => 20, 'shelf_life_days' => 0],
            ['sku_id' => 'THERM-T1', 'name' => 'Smart Thermostat T1', 'category' => 'Climate Control', 'handling_class' => 'STANDARD', 'abc_class' => 'A', 'xyz_class' => 'X', 'unit_price' => 6200, 'reorder_point' => 30, 'shelf_life_days' => 0],
            ['sku_id' => 'ACC-CORD', 'name' => 'Heavy Duty Extension Cord', 'category' => 'Accessories', 'handling_class' => 'STANDARD', 'abc_class' => 'C', 'xyz_class' => 'Y', 'unit_price' => 380, 'reorder_point' => 45, 'shelf_life_days' => 0],
        ];

        foreach ($items as $item) {
            if (!DB::table('items')->where('sku_id', $item['sku_id'])->exists()) {
                DB::table('items')->insert(array_merge($item, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }
        }

        $itemMap = DB::table('items')->pluck('id', 'sku_id');

        // 2. Sample Batches specifically for Batches page testing
        $batches = [
            // Expired batches (for testing delete & purge)
            [
                'lot_id' => 'LOT-EXP-2026-A',
                'sku_id' => 'FILT-F110',
                'received_date' => $today->copy()->subDays(180)->toDateString(),
                'expiry_date' => $today->copy()->subDays(30)->toDateString(),
                'qty_received' => 50,
                'qty_remaining' => 18,
                'status' => 'expired',
                'alert' => 'Expired batch LOT-EXP-2026-A exceeds safety shelf life',
            ],
            [
                'lot_id' => 'LOT-EXP-2026-B',
                'sku_id' => 'FILT-F220',
                'received_date' => $today->copy()->subDays(210)->toDateString(),
                'expiry_date' => $today->copy()->subDays(15)->toDateString(),
                'qty_received' => 40,
                'qty_remaining' => 12,
                'status' => 'expired',
                'alert' => 'Expired batch LOT-EXP-2026-B exceeds safety shelf life',
            ],
            [
                'lot_id' => 'LOT-EXP-2026-C',
                'sku_id' => 'FILT-F110',
                'received_date' => $today->copy()->subDays(240)->toDateString(),
                'expiry_date' => $today->copy()->subDays(5)->toDateString(),
                'qty_received' => 35,
                'qty_remaining' => 7,
                'status' => 'expired',
                'alert' => 'Expired batch LOT-EXP-2026-C exceeds safety shelf life',
            ],

            // Near expiry batches
            [
                'lot_id' => 'LOT-NEAR-2026-1',
                'sku_id' => 'FILT-F110',
                'received_date' => $today->copy()->subDays(90)->toDateString(),
                'expiry_date' => $today->copy()->addDays(12)->toDateString(),
                'qty_received' => 60,
                'qty_remaining' => 24,
                'status' => 'near_expiry',
                'alert' => 'Batch LOT-NEAR-2026-1 will expire in 12 days',
            ],
            [
                'lot_id' => 'LOT-NEAR-2026-2',
                'sku_id' => 'FILT-F220',
                'received_date' => $today->copy()->subDays(100)->toDateString(),
                'expiry_date' => $today->copy()->addDays(22)->toDateString(),
                'qty_received' => 45,
                'qty_remaining' => 19,
                'status' => 'near_expiry',
                'alert' => 'Batch LOT-NEAR-2026-2 will expire in 22 days',
            ],

            // Active batches
            [
                'lot_id' => 'LOT-ACT-2026-1',
                'sku_id' => 'AC-PORT-10K',
                'received_date' => $today->copy()->subDays(30)->toDateString(),
                'expiry_date' => null,
                'qty_received' => 25,
                'qty_remaining' => 15,
                'status' => 'active',
                'alert' => null,
            ],
            [
                'lot_id' => 'LOT-ACT-2026-2',
                'sku_id' => 'THERM-T1',
                'received_date' => $today->copy()->subDays(20)->toDateString(),
                'expiry_date' => null,
                'qty_received' => 40,
                'qty_remaining' => 28,
                'status' => 'active',
                'alert' => null,
            ],
            [
                'lot_id' => 'LOT-ACT-2026-3',
                'sku_id' => 'FILT-F220',
                'received_date' => $today->copy()->subDays(15)->toDateString(),
                'expiry_date' => $today->copy()->addDays(180)->toDateString(),
                'qty_received' => 80,
                'qty_remaining' => 72,
                'status' => 'active',
                'alert' => null,
            ],
            [
                'lot_id' => 'LOT-ACT-2026-4',
                'sku_id' => 'ACC-CORD',
                'received_date' => $today->copy()->subDays(5)->toDateString(),
                'expiry_date' => null,
                'qty_received' => 100,
                'qty_remaining' => 95,
                'status' => 'active',
                'alert' => null,
            ],
        ];

        foreach ($batches as $b) {
            $itemId = $itemMap[$b['sku_id']] ?? null;
            if (!$itemId) continue;

            $existing = DB::table('batches')->where('lot_id', $b['lot_id'])->first();
            if ($existing) {
                DB::table('batches')->where('id', $existing->id)->update([
                    'item_id' => $itemId,
                    'received_date' => $b['received_date'],
                    'expiry_date' => $b['expiry_date'],
                    'qty_received' => $b['qty_received'],
                    'qty_remaining' => $b['qty_remaining'],
                    'status' => $b['status'],
                    'updated_at' => now(),
                ]);
                $batchId = $existing->id;
            } else {
                $batchId = DB::table('batches')->insertGetId([
                    'lot_id' => $b['lot_id'],
                    'item_id' => $itemId,
                    'received_date' => $b['received_date'],
                    'expiry_date' => $b['expiry_date'],
                    'qty_received' => $b['qty_received'],
                    'qty_remaining' => $b['qty_remaining'],
                    'status' => $b['status'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Record movement
            if (!DB::table('movements')->where('batch_id', $batchId)->where('type', 'received')->exists()) {
                DB::table('movements')->insert([
                    'item_id' => $itemId,
                    'batch_id' => $batchId,
                    'type' => 'received',
                    'quantity' => $b['qty_received'],
                    'reason' => 'Initial batch receipt',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Create alert if expired or near expiry
            if (!empty($b['alert'])) {
                $tier = $b['status'] === 'expired' ? 'critical' : 'warning';
                if (!DB::table('alerts')->where('batch_id', $batchId)->exists()) {
                    DB::table('alerts')->insert([
                        'tier' => $tier,
                        'kind' => 'batch_expiry',
                        'item_id' => $itemId,
                        'batch_id' => $batchId,
                        'title' => $b['alert'],
                        'meta' => json_encode(['lot_id' => $b['lot_id'], 'expiry_date' => $b['expiry_date']]),
                        'resolved' => false,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        $this->command?->info("Seeded sample batches (active, near_expiry, expired) successfully!");
    }
}
