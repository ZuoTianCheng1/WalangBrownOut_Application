<?php
/**
 * Automatic reorder + expiry alerts.
 *
 * ims_sync_alerts() compares current stock with the rules below and keeps the
 * `alerts` table in step with reality:
 *
 *   reorder      item on hand (non-expired stock) <= reorder_point
 *                  tier: critical when out of stock, otherwise warning
 *   near_expiry  batch with units left that expires within IMS_NEAR_EXPIRY_DAYS
 *                  tier: critical when <= IMS_CRITICAL_EXPIRY_DAYS left, otherwise warning
 *   expired      batch with units left that is past its expiry date (tier: critical)
 *
 * Behaviour:
 *   - One open alert per item (reorder) / per batch+stage (expiry); it is updated in place.
 *   - When the problem goes away (restock, batch used up, expiry extended, batch deleted)
 *     the open alert is auto-resolved ("Resolved by System").
 *   - If a person resolves an alert while the problem is still there, it is NOT recreated
 *     until the problem has gone away and come back.
 *   - Other alert kinds (seasonal, count, ...) are never touched.
 *
 * Called from routes/api.php: before GET /alerts and GET /dashboard/summary (so date-based
 * expiry is always current) and after every successful POST/PATCH/PUT/DELETE.
 * Uses plain SQL through DB::select/insert/update so it behaves the same on MySQL and SQLite.
 */
use Illuminate\Support\Facades\DB;

if (!defined('IMS_NEAR_EXPIRY_DAYS')) define('IMS_NEAR_EXPIRY_DAYS', 30);
if (!defined('IMS_CRITICAL_EXPIRY_DAYS')) define('IMS_CRITICAL_EXPIRY_DAYS', 7);

/** Never throws: a problem here must not break the request that triggered it. */
function ims_sync_alerts(?string $today = null): void {
  $fh = null;
  try {
    // Serialise concurrent syncs (e.g. dashboard + alerts loading together) so alerts are not duplicated.
    $dir = function_exists('storage_path') ? storage_path('framework') : sys_get_temp_dir();
    $fh = @fopen($dir.'/ims-alert-sync.lock', 'c');
    if ($fh) {
      $tries = 0;
      while (!flock($fh, LOCK_EX | LOCK_NB)) { if (++$tries > 50) return; usleep(100000); }   // wait up to ~5s
    }
    DB::transaction(function () use ($today) { ims_sync_alerts_run($today ?? date('Y-m-d')); });
  } catch (\Throwable $e) {
    if (function_exists('report')) report($e);
  } finally {
    if ($fh) { @flock($fh, LOCK_UN); @fclose($fh); }
  }
}

function ims_alert_meta($a): array { $m = $a->meta ? json_decode($a->meta, true) : []; return is_array($m) ? $m : []; }
function ims_alert_is_open($a): bool { return !(int)$a->resolved; }
function ims_alert_is_closed($a): bool { return !empty(ims_alert_meta($a)['_closed']); }

function ims_alert_insert(string $kind, string $tier, $itemId, $batchId, string $title, array $meta, string $now): void {
  DB::insert('INSERT INTO alerts (tier, kind, item_id, batch_id, title, meta, resolved, created_at, updated_at) VALUES (?,?,?,?,?,?,0,?,?)',
    [$tier, $kind, $itemId, $batchId, $title, json_encode($meta), $now, $now]);
}
/** Update an open alert in place; skips the write when nothing changed. */
function ims_alert_refresh($a, string $kind, string $tier, string $title, array $meta, string $now): void {
  if ($a->kind === $kind && $a->tier === $tier && $a->title === $title && ims_alert_meta($a) === $meta) return;
  DB::update('UPDATE alerts SET kind = ?, tier = ?, title = ?, meta = ?, updated_at = ? WHERE id = ?', [$kind, $tier, $title, json_encode($meta), $now, $a->id]);
}
/** Resolve an open alert on the system's behalf and mark its episode as over. */
function ims_alert_autoresolve($a, string $note, string $now): void {
  $meta = ims_alert_meta($a); $meta['_closed'] = true;
  DB::update('UPDATE alerts SET resolved = 1, resolved_at = ?, resolved_by = NULL, resolution_notes = ?, meta = ?, updated_at = ? WHERE id = ?',
    [$now, $note, json_encode($meta), $now, $a->id]);
}
/** A person-resolved alert whose problem has now gone away: allow a future one to be raised. */
function ims_alert_close($a, string $now): void {
  $meta = ims_alert_meta($a); $meta['_closed'] = true;
  DB::update('UPDATE alerts SET meta = ?, updated_at = ? WHERE id = ?', [json_encode($meta), $now, $a->id]);
}
/** Keep the newest open alert, retire any older duplicates. Returns the one kept (or null). */
function ims_alert_keep_newest(array $open, string $now) {
  if (!$open) return null;
  $keep = array_pop($open);
  foreach ($open as $dup) ims_alert_autoresolve($dup, 'Superseded by a newer alert', $now);
  return $keep;
}
function ims_alert_expiry_stage($a): string {
  if ($a->kind === 'expired' || $a->kind === 'near_expiry') return $a->kind;
  return $a->tier === 'critical' ? 'expired' : 'near_expiry';   // legacy seeded 'batch_expiry' alerts
}

function ims_sync_alerts_run(string $today): void {
  $now = date('Y-m-d H:i:s');
  $horizon = date('Y-m-d', strtotime($today.' +'.IMS_NEAR_EXPIRY_DAYS.' days'));

  $rows = DB::select("SELECT * FROM alerts WHERE kind IN ('reorder','near_expiry','expired','batch_expiry') ORDER BY id");
  $byItem = []; $byBatch = [];
  foreach ($rows as $a) {
    if ($a->kind === 'reorder') { if ($a->item_id) $byItem[$a->item_id][] = $a; }
    elseif ($a->batch_id) $byBatch[$a->batch_id][] = $a;
  }

  /* ---------- reorder alerts ---------- */
  $items = DB::select(
    'SELECT i.id, i.sku_id, i.name, i.reorder_point,
            COALESCE(SUM(CASE WHEN b.expiry_date IS NULL OR b.expiry_date >= ? THEN b.qty_remaining ELSE 0 END), 0) AS on_hand
       FROM items i LEFT JOIN batches b ON b.item_id = i.id
      WHERE i.archived_at IS NULL
      GROUP BY i.id, i.sku_id, i.name, i.reorder_point', [$today]);
  $liveItems = [];
  foreach ($items as $it) {
    $liveItems[$it->id] = true;
    $onHand = (int)$it->on_hand; $rp = (int)$it->reorder_point;
    $list = $byItem[$it->id] ?? [];
    $open = array_values(array_filter($list, 'ims_alert_is_open'));
    $latest = $list ? end($list) : null;
    if ($onHand <= $rp) {
      $out = $onHand <= 0;
      $title = $it->name.($out ? ' is out of stock' : ' is below its reorder point');
      $meta = ['sku' => $it->sku_id, 'stock' => $onHand.' on hand', 'reorder_point' => 'Reorder point '.$rp];
      $keep = ims_alert_keep_newest($open, $now);
      if ($keep) ims_alert_refresh($keep, 'reorder', $out ? 'critical' : 'warning', $title, $meta, $now);
      elseif ($latest && !ims_alert_is_closed($latest)) { /* resolved by a person and still low: leave it */ }
      else ims_alert_insert('reorder', $out ? 'critical' : 'warning', $it->id, null, $title, $meta, $now);
    } else {
      foreach ($open as $a) ims_alert_autoresolve($a, 'Auto-resolved: stock is back above the reorder point', $now);
      if ($latest && !ims_alert_is_open($latest) && !ims_alert_is_closed($latest)) ims_alert_close($latest, $now);
    }
  }
  foreach ($byItem as $itemId => $list) {          // archived items
    if (isset($liveItems[$itemId])) continue;
    foreach ($list as $a) if (ims_alert_is_open($a)) ims_alert_autoresolve($a, 'Auto-resolved: item is archived', $now);
  }

  /* ---------- expiry alerts ---------- */
  $batches = DB::select(
    "SELECT b.id, b.item_id, b.lot_id, b.expiry_date, b.qty_remaining, b.status, i.name, i.sku_id
       FROM batches b JOIN items i ON i.id = b.item_id
      WHERE b.qty_remaining > 0 AND i.archived_at IS NULL
        AND ((b.expiry_date IS NOT NULL AND b.expiry_date <= ?) OR b.status = 'expired')", [$horizon]);
  $atRisk = [];
  foreach ($batches as $b) {
    $atRisk[$b->id] = true;
    $expired = ($b->expiry_date && $b->expiry_date < $today) || $b->status === 'expired';
    $days = $b->expiry_date ? (int)round((strtotime($b->expiry_date) - strtotime($today)) / 86400) : null;
    $stage = $expired ? 'expired' : 'near_expiry';
    $tier = ($expired || ($days !== null && $days <= IMS_CRITICAL_EXPIRY_DAYS)) ? 'critical' : 'warning';
    if ($expired) $title = $b->name.' — lot '.$b->lot_id.' has expired';
    elseif ($days === 0) $title = $b->name.' — lot '.$b->lot_id.' expires today';
    else $title = $b->name.' — lot '.$b->lot_id.' expires in '.$days.' day'.($days === 1 ? '' : 's');
    $meta = ['sku' => $b->sku_id, 'lot' => $b->lot_id, 'qty' => (int)$b->qty_remaining.' units remaining'];
    if ($b->expiry_date) $meta['expiry'] = ($expired ? 'Expired ' : 'Expires ').$b->expiry_date;

    $list = $byBatch[$b->id] ?? [];
    foreach ($list as $a) {                          // an open alert for the other stage is now out of date
      if (ims_alert_is_open($a) && ims_alert_expiry_stage($a) !== $stage) ims_alert_autoresolve($a, $expired ? 'Superseded: batch has now expired' : 'Superseded: expiry date changed', $now);
    }
    $same = array_values(array_filter($list, fn($a) => ims_alert_expiry_stage($a) === $stage));
    $keep = ims_alert_keep_newest(array_values(array_filter($same, 'ims_alert_is_open')), $now);
    $latest = $same ? end($same) : null;
    if ($keep) ims_alert_refresh($keep, $stage, $tier, $title, $meta, $now);
    elseif ($latest && !ims_alert_is_closed($latest)) { /* resolved by a person and still at risk: leave it */ }
    else ims_alert_insert($stage, $tier, $b->item_id, $b->id, $title, $meta, $now);
  }
  foreach ($byBatch as $batchId => $list) {         // batches that are no longer at risk (used up, expiry extended, item archived)
    if (isset($atRisk[$batchId])) continue;
    foreach ($list as $a) {
      if (ims_alert_is_open($a)) ims_alert_autoresolve($a, 'Auto-resolved: batch is no longer at risk', $now);
      elseif (!ims_alert_is_closed($a)) ims_alert_close($a, $now);
    }
  }
}
