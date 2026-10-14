<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Additive migration: safe to run on a database that already has data.
 *   php artisan migrate
 *
 * 1. items.warranty_months      - default warranty period for an item (0 = none)
 * 2. item_serials               - one row per physical unit (serial number, customer, warranty dates)
 * 3. purchase_orders workflow   - approval and cancellation tracking
 */
return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('items', 'warranty_months')) {
            Schema::table('items', function (Blueprint $t) {
                $t->unsignedSmallInteger('warranty_months')->default(0);
            });
        }

        if (!Schema::hasTable('item_serials')) {
            Schema::create('item_serials', function (Blueprint $t) {
                $t->id();
                $t->string('serial_number')->unique();
                $t->foreignId('item_id')->constrained('items');
                $t->foreignId('batch_id')->nullable()->constrained('batches')->nullOnDelete();
                $t->string('status')->default('in_stock'); // in_stock | sold | returned | defective
                $t->string('customer_name')->nullable();
                $t->string('customer_contact')->nullable();
                $t->date('sold_at')->nullable();
                $t->date('warranty_start')->nullable();
                $t->date('warranty_end')->nullable();
                $t->text('notes')->nullable();
                $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $t->timestamps();
                $t->index(['item_id', 'status']);
                $t->index('warranty_end');
            });
        }

        Schema::table('purchase_orders', function (Blueprint $t) {
            if (!Schema::hasColumn('purchase_orders', 'approved_by')) {
                $t->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('purchase_orders', 'approved_at')) {
                $t->timestamp('approved_at')->nullable();
            }
            if (!Schema::hasColumn('purchase_orders', 'cancelled_at')) {
                $t->timestamp('cancelled_at')->nullable();
            }
            if (!Schema::hasColumn('purchase_orders', 'cancel_reason')) {
                $t->string('cancel_reason', 500)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_serials');
        Schema::table('purchase_orders', function (Blueprint $t) {
            foreach (['approved_by'] as $fk) {
                if (Schema::hasColumn('purchase_orders', $fk)) {
                    $t->dropConstrainedForeignId($fk);
                }
            }
            foreach (['approved_at', 'cancelled_at', 'cancel_reason'] as $col) {
                if (Schema::hasColumn('purchase_orders', $col)) {
                    $t->dropColumn($col);
                }
            }
        });
        if (Schema::hasColumn('items', 'warranty_months')) {
            Schema::table('items', function (Blueprint $t) {
                $t->dropColumn('warranty_months');
            });
        }
    }
};