<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Loads the sample inventory (items + batches) that previously lived in
 * src/data/mockData.js, so a fresh clone shows a working demo.
 *
 * Safe to run more than once: rows are matched on sku_id / lot_id and updated
 * instead of duplicated.
 *
 *   php artisan db:seed --class=DemoDataSeeder
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $today = Carbon::today();

        $itemCols = [
            'sku_id', 'name', 'category', 'handling_class', 'abc_class', 'xyz_class',
            'lead_time_days', 'shelf_life_days', 'unit_price', 'reorder_point',
        ];

        $items = [
            ['AC-PORT-10K', 'Portable AC Unit 10,000 BTU', 'Air Conditioning', 'STANDARD', 'A', 'Z', 12, 0, 18500, 22],
            ['AC-PORT-14K', 'Portable AC Unit 14,000 BTU', 'Air Conditioning', 'STANDARD', 'A', 'Z', 14, 0, 24900, 18],
            ['THERM-T1', 'Smart Thermostat T1', 'Climate Control', 'STANDARD', 'A', 'X', 9, 0, 6200, 30],
            ['THERM-T2', 'Smart Thermostat T2 Pro', 'Climate Control', 'STANDARD', 'A', 'X', 9, 0, 8900, 25],
            ['PURIF-P1', 'Air Purifier P1 Compact', 'Air Quality', 'STANDARD', 'B', 'Y', 10, 0, 5400, 20],
            ['PURIF-P2', 'Air Purifier P2 Whole-Room', 'Air Quality', 'STANDARD', 'B', 'Y', 10, 0, 9800, 15],
            ['FILT-F110', 'Air Purifier Filter F-110', 'Air Quality', 'PERISHABLE', 'B', 'X', 5, 365, 850, 60],
            ['FILT-F220', 'Air Purifier Filter F-220', 'Air Quality', 'PERISHABLE', 'B', 'X', 5, 270, 950, 50],
            ['ACC-REMOTE', 'Universal Remote', 'Accessories', 'STANDARD', 'C', 'X', 7, 0, 450, 40],
            ['ACC-BRACKET', 'Wall Mount Bracket', 'Accessories', 'STANDARD', 'C', 'X', 7, 0, 620, 35],
            ['ACC-CORD', 'Heavy Duty Extension Cord', 'Accessories', 'STANDARD', 'C', 'Y', 6, 0, 380, 45],
            ['PWR-REG1000', 'Voltage Regulator 1000VA', 'Power', 'STANDARD', 'B', 'X', 11, 0, 3200, 24],
            ['PWR-WHEAT6L', 'Tankless Water Heater 6L', 'Power', 'STANDARD', 'B', 'Y', 15, 0, 7400, 16],
            ['CLIM-FAN01', 'Ceiling Fan Deluxe', 'Climate Control', 'STANDARD', 'C', 'Y', 8, 0, 4100, 18],
        ];

        // [lot_id, sku_id, received_date, qty_received, qty_remaining, optional shelf_life_days override]
        $batches = [
            ['B-2201', 'AC-PORT-10K', '2026-06-02', 40, 9],
            ['B-2214', 'AC-PORT-10K', '2026-07-18', 30, 14],
            ['B-2199', 'AC-PORT-14K', '2026-05-28', 25, 6],
            ['B-2233', 'AC-PORT-14K', '2026-08-10', 20, 11],
            ['B-2110', 'THERM-T1', '2026-07-01', 60, 34],
            ['B-2144', 'THERM-T2', '2026-07-15', 40, 18],
            ['B-2060', 'PURIF-P1', '2026-06-20', 35, 22],
            ['B-2071', 'PURIF-P2', '2026-06-25', 20, 9],
            ['B-2298', 'FILT-F110', '2026-08-05', 80, 52, 365],
            ['B-2231', 'FILT-F220', '2026-01-20', 60, 6, 270],
            ['B-2255', 'FILT-F220', '2026-08-01', 40, 28, 270],
            ['B-1980', 'ACC-REMOTE', '2026-05-10', 100, 61],
            ['B-1995', 'ACC-BRACKET', '2026-05-15', 90, 40],
            ['B-2005', 'ACC-CORD', '2026-05-20', 120, 58],
            ['B-2088', 'PWR-REG1000', '2026-07-02', 30, 13],
            ['B-2091', 'PWR-WHEAT6L', '2026-07-05', 22, 7],
            ['B-2102', 'CLIM-FAN01', '2026-07-08', 28, 12],
        ];

        DB::transaction(function () use ($itemCols, $items, $batches, $now, $today) {
            foreach ($items as $row) {
                $data = array_combine($itemCols, $row);
                DB::table('items')->updateOrInsert(
                    ['sku_id' => $data['sku_id']],
                    $data + ['created_at' => $now, 'updated_at' => $now]
                );
            }

            foreach ($batches as $row) {
                [$lot, $sku, $received, $qtyReceived, $qtyRemaining] = $row;
                $shelfOverride = $row[5] ?? null;

                $item = DB::table('items')->where('sku_id', $sku)->first();
                if (!$item) {
                    continue;
                }

                // Only perishable items have an expiry date. Status is worked out
                // relative to today, so near-expiry/expired demos stay accurate.
                $expiry = null;
                $status = 'active';
                if ($item->handling_class === 'PERISHABLE') {
                    $days = $shelfOverride ?? $item->shelf_life_days;
                    $expiryDate = Carbon::parse($received)->addDays((int) $days)->startOfDay();
                    $expiry = $expiryDate->toDateString();
                    $daysLeft = intdiv($expiryDate->getTimestamp() - $today->getTimestamp(), 86400);
                    if ($expiryDate->lt($today)) {
                        $status = 'expired';
                    } elseif ($daysLeft <= 30) {
                        $status = 'near_expiry';
                    }
                }

                DB::table('batches')->updateOrInsert(
                    ['lot_id' => $lot],
                    [
                        'item_id' => $item->id,
                        'received_date' => $received,
                        'expiry_date' => $expiry,
                        'qty_received' => $qtyReceived,
                        'qty_remaining' => $qtyRemaining,
                        'status' => $status,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]
                );
            }
        });

        $this->command?->info('Demo data loaded: ' . count($items) . ' items, ' . count($batches) . ' batches.');
    }
}
