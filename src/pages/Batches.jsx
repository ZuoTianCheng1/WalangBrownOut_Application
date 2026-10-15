import { useMemo, useState } from 'react';
import { PackageMinus, Search, Trash2 } from 'lucide-react';
import { useInventory } from '../context/InventoryContext.jsx';
import { BatchBadge } from '../components/Badges.jsx';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { issueStock } from '../services/api.js';
import '../styles/issue-stock.css';

export default function Batches() {
  const { items, batches, consumeBatch, deleteBatch, purgeExpiredBatches, reloadBatches, reloadItems } = useInventory();
  const { can } = useAuth();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sku, setSku] = useState('All');
  const [selectedLotId, setSelectedLotId] = useState(null);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('info');
  const [issueSku, setIssueSku] = useState('');
  const [issueQuantity, setIssueQuantity] = useState('1');
  const [issueReason, setIssueReason] = useState('Sale / stock issue');
  const [issueAllocations, setIssueAllocations] = useState([]);

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: 'expiry_date', dir: 'asc' });
  const pageSize = 10;

  const nameFor = (skuId) => items?.find((i) => i.sku_id === skuId)?.name ?? skuId;

  const expiredBatches = useMemo(() => {
    return batches ? batches.filter((b) => b.status === 'expired') : [];
  }, [batches]);
  const expiredCount = expiredBatches.length;
  const expiredUnits = expiredBatches.reduce((acc, b) => acc + (b.qty_remaining || 0), 0);

  const filtered = useMemo(() => {
    if (!batches) return [];
    const q = query.trim().toLowerCase();
    return batches.filter((b) => {
      const itemName = nameFor(b.sku_id).toLowerCase();
      const lotId = (b.lot_id || '').toLowerCase();
      const skuId = (b.sku_id || '').toLowerCase();
      const matchesQuery = !q || lotId.includes(q) || itemName.includes(q) || skuId.includes(q);
      const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
      const matchesSku = sku === 'All' || b.sku_id === sku;
      return matchesQuery && matchesStatus && matchesSku;
    });
  }, [batches, query, statusFilter, sku, items]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = a[sort.key] ?? '';
      let bv = b[sort.key] ?? '';
      if (sort.key === 'item_name') {
        av = nameFor(a.sku_id);
        bv = nameFor(b.sku_id);
      } else if (sort.key === 'expiry_date') {
        av = av || '9999-12-31';
        bv = bv || '9999-12-31';
      }
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort, items]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageBatches = sorted.slice((page - 1) * pageSize, page * pageSize);
  const sortBy = (key) => {
    setSort((old) => ({ key, dir: old.key === key && old.dir === 'asc' ? 'desc' : 'asc' }));
    setPage(1);
  };

  const selected = useMemo(
    () => batches?.find((b) => b.lot_id === selectedLotId) ?? null,
    [batches, selectedLotId]
  );

  const handleDeleteSingle = async () => {
    if (!batchToDelete) return;
    setBusy(true);
    try {
      await deleteBatch(batchToDelete.lot_id);
      setNoticeType('info');
      setNotice(`Expired batch lot ${batchToDelete.lot_id} was successfully removed.`);
      setBatchToDelete(null);
      if (selectedLotId === batchToDelete.lot_id) setSelectedLotId(null);
    } catch (err) {
      setNoticeType('error');
      setNotice(err.message || 'Failed to remove batch.');
    } finally {
      setBusy(false);
    }
  };

  const handlePurgeExpired = async () => {
    setBusy(true);
    try {
      const res = await purgeExpiredBatches();
      setNoticeType('info');
      setNotice(`Successfully purged ${res?.count ?? expiredCount} expired ${res?.count === 1 ? 'batch' : 'batches'}.`);
      setPurgeModalOpen(false);
      if (selected && selected.status === 'expired') setSelectedLotId(null);
    } catch (err) {
      setNoticeType('error');
      setNotice(err.message || 'Failed to remove expired batches.');
    } finally {
      setBusy(false);
    }
  };

  const handleIssueStock = async (event) => {
    event.preventDefault(); setBusy(true); setNotice(''); setIssueAllocations([]);
    try { const result = await issueStock({ sku_id: issueSku, quantity: Number(issueQuantity), reason: issueReason.trim() });
      setIssueAllocations(result.allocations || []); setNoticeType('info'); setNotice(`Issued ${result.issued} unit(s) using automatic FIFO/FEFO allocation.`);
      await Promise.all([reloadBatches(), reloadItems()]);
    } catch (err) { setNoticeType('error'); setNotice(err.message || 'Could not issue stock.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="container-wide">
      <div className="page-header-row">
        <div>
          <p className="kicker">Batches</p>
          <h1 className="page-title">Every open lot, oldest expiry first.</h1>
        </div>
        {can('adjustStock') && expiredCount > 0 && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setPurgeModalOpen(true)}
            title="Remove all expired batches"
          >
            <Trash2 size={16} /> Delete all expired ({expiredCount})
          </button>
        )}
      </div>
      <p className="page-lede">
        Search, filter, open a lot to record stock usage, and remove expired products.
      </p>

      {notice && (
        <div className={`banner${noticeType === 'error' ? ' error' : ''}`} role="status">
          <span>{notice}</span>
          <button aria-label="Dismiss" onClick={() => setNotice('')}>&times;</button>
        </div>
      )}

      <section className="section">
        <div className="toolbar">
          <div className="search-input">
            <Search size={16} />
            <input
              placeholder="Search by lot, item name, or SKU…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => localStorage.setItem('ims_saved_batches_filter', JSON.stringify({ statusFilter, sku, query }))}
          >
            Save filter
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              try {
                const f = JSON.parse(localStorage.getItem('ims_saved_batches_filter') || '{}');
                setStatusFilter(f.statusFilter || 'All');
                setSku(f.sku || 'All');
                setQuery(f.query || '');
                setPage(1);
              } catch {}
            }}
          >
            Load saved
          </button>
          <select
            className="select-input"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All statuses</option>
            <option value="active">Active</option>
            <option value="near_expiry">Near expiry</option>
            <option value="expired">Expired</option>
          </select>
          <select
            className="select-input"
            value={sku}
            onChange={(e) => {
              setSku(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All items</option>
            {items?.map((i) => (
              <option key={i.sku_id} value={i.sku_id}>{i.name}</option>
            ))}
          </select>
        </div>

        {!batches ? (
          <div className="alert-loading">Loading batches…</div>
        ) : (
          <div className="table-wrap">
            <section className="panel issue-stock-panel">
        <div className="issue-stock-heading">
          <div className="issue-stock-icon"><PackageMinus size={19} /></div>
          <div>
            <h2 className="section-title">Issue stock</h2>
            <p className="muted">Automatic FIFO/FEFO deduction from eligible lots, prioritizing earliest expiry.</p>
          </div>
        </div>
        <form onSubmit={handleIssueStock} className="issue-stock-form">
          <label className="form-field">
            <span>Item / SKU</span>
            <select value={issueSku} onChange={(e) => setIssueSku(e.target.value)} required>
              <option value="">Select an item</option>
              {(items || []).map((item) => <option key={item.sku_id} value={item.sku_id}>{item.sku_id} — {item.name}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span>Quantity</span>
            <input type="number" min="1" step="1" value={issueQuantity} onChange={(e) => setIssueQuantity(e.target.value)} required />
          </label>
          <label className="form-field issue-reason-field">
            <span>Reason</span>
            <input value={issueReason} onChange={(e) => setIssueReason(e.target.value)} minLength="3" maxLength="300" required />
          </label>
          <div className="issue-submit-wrap">
            <button type="submit" className="btn btn-primary issue-submit" disabled={busy || !issueSku || Number(issueQuantity) < 1}>
              <PackageMinus size={16} /> {busy ? 'Processing…' : 'Issue stock'}
            </button>
          </div>
        </form>
        {issueAllocations.length > 0 && (
          <div className="issue-allocations">
            <h3>Lot allocations</h3>
            <ul>{issueAllocations.map((a) => <li key={a.lot_id}><span>Lot <code>{a.lot_id}</code></span><strong>{a.quantity} unit(s)</strong></li>)}</ul>
          </div>
        )}
      </section>
      <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => sortBy('lot_id')} className="sortable">Lot ↕</th>
                  <th onClick={() => sortBy('item_name')} className="sortable">Item ↕</th>
                  <th onClick={() => sortBy('received_date')} className="sortable">Received ↕</th>
                  <th onClick={() => sortBy('expiry_date')} className="sortable">Expiry ↕</th>
                  <th onClick={() => sortBy('qty_received')} className="sortable">Received qty ↕</th>
                  <th onClick={() => sortBy('qty_remaining')} className="sortable">Remaining ↕</th>
                  <th onClick={() => sortBy('status')} className="sortable">Status ↕</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="table-empty">No batches match those filters.</td></tr>
                ) : (
                  pageBatches.map((b) => (
                    <tr key={b.lot_id} className="clickable" onClick={() => setSelectedLotId(b.lot_id)}>
                      <td className="mono">{b.lot_id}</td>
                      <td>{nameFor(b.sku_id)}</td>
                      <td className="mono">{b.received_date}</td>
                      <td className="mono">{b.expiry_date ?? '—'}</td>
                      <td className="mono">{b.qty_received}</td>
                      <td className="mono">{b.qty_remaining}</td>
                      <td><BatchBadge status={b.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {can('adjustStock') && b.status === 'expired' && (
                            <button
                              type="button"
                              className="btn btn-danger-ghost btn-sm"
                              title="Delete expired batch"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBatchToDelete(b);
                              }}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          )}
                          {can('adjustStock') && b.status !== 'expired' && b.qty_remaining > 0 && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLotId(b.lot_id);
                              }}
                            >
                              <PackageMinus size={14} /> Use
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!!batches && (
          <div className="pagination">
            <span>{filtered.length} batches · page {Math.min(page, pageCount)} of {pageCount}</span>
            <div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Batch Details & Usage Modal */}
      <BatchDetailModal
        batch={selected}
        itemName={selected ? nameFor(selected.sku_id) : ''}
        onClose={() => setSelectedLotId(null)}
        consumeBatch={consumeBatch}
        onDelete={(b) => setBatchToDelete(b)}
        canAdjust={can('adjustStock')}
      />

      {/* Delete Single Expired Batch Confirmation Modal */}
      <Modal
        open={!!batchToDelete}
        onClose={() => !busy && setBatchToDelete(null)}
        title={batchToDelete ? `Delete Expired Batch — ${batchToDelete.lot_id}` : ''}
      >
        {batchToDelete && (
          <div>
            <p style={{ margin: '0 0 14px', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete expired lot <strong className="mono">{batchToDelete.lot_id}</strong> for <strong>{nameFor(batchToDelete.sku_id)}</strong>?
            </p>
            <div className="detail-grid" style={{ marginBottom: 16 }}>
              <div className="detail-field">
                <div className="k">Item</div>
                <div className="v">{nameFor(batchToDelete.sku_id)} ({batchToDelete.sku_id})</div>
              </div>
              <div className="detail-field">
                <div className="k">Expiry date</div>
                <div className="v mono">{batchToDelete.expiry_date || '—'}</div>
              </div>
              <div className="detail-field">
                <div className="k">Units remaining</div>
                <div className="v mono">{batchToDelete.qty_remaining}</div>
              </div>
              <div className="detail-field">
                <div className="k">Status</div>
                <div className="v"><BatchBadge status={batchToDelete.status} /></div>
              </div>
            </div>
            <div className="step-note" style={{ marginBottom: 18 }}>
              This operation deletes the expired batch from inventory, clears related movements and alerts, and records the deletion in the audit log.
            </div>
            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => setBatchToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={busy}
                onClick={handleDeleteSingle}
              >
                <Trash2 size={14} /> {busy ? 'Deleting…' : 'Confirm delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Purge All Expired Batches Confirmation Modal */}
      <Modal
        open={purgeModalOpen}
        onClose={() => !busy && setPurgeModalOpen(false)}
        title="Delete All Expired Batches"
      >
        <div>
          <p style={{ margin: '0 0 14px', lineHeight: 1.5 }}>
            Are you sure you want to delete all <strong>{expiredCount}</strong> expired {expiredCount === 1 ? 'batch' : 'batches'} totaling <strong>{expiredUnits}</strong> units from inventory?
          </p>
          <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16 }}>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.86rem', lineHeight: 1.6 }}>
              {expiredBatches.map((b) => (
                <li key={b.lot_id}>
                  <strong className="mono">{b.lot_id}</strong>: {nameFor(b.sku_id)} — Expired {b.expiry_date} ({b.qty_remaining} units)
                </li>
              ))}
            </ul>
          </div>
          <div className="step-note" style={{ marginBottom: 18 }}>
            All expired lots and their open alerts will be cleared. This purge action is recorded in the audit trail.
          </div>
          <div className="modal-footer-actions">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => setPurgeModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy}
              onClick={handlePurgeExpired}
            >
              <Trash2 size={14} /> {busy ? 'Deleting all…' : `Delete ${expiredCount} expired batches`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function BatchDetailModal({ batch, itemName, onClose, consumeBatch, onDelete, canAdjust }) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Sale');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canUse = canAdjust && !!batch && batch.status !== 'expired' && batch.qty_remaining > 0;
  const isExpired = batch?.status === 'expired';

  const handleUse = async (e) => {
    e.preventDefault();
    if (!batch) return;
    const qty = Number(quantity);
    setError('');
    if (!Number.isInteger(qty) || qty <= 0) {
      setError('Enter a whole number greater than zero.');
      return;
    }
    if (qty > batch.qty_remaining) {
      setError(`Only ${batch.qty_remaining} units are available in this batch.`);
      return;
    }
    setSubmitting(true);
    try {
      await consumeBatch(batch.lot_id, qty, reason.trim() || 'Sale');
      setQuantity('');
    } catch (err) {
      setError(err.message ?? 'Could not record usage.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={!!batch} onClose={onClose} title={batch ? `${itemName} — ${batch.lot_id}` : ''} wide>
      {batch && (
        <>
          <div className="detail-grid">
            <div className="detail-field">
              <div className="k">Lot</div>
              <div className="v mono">{batch.lot_id}</div>
            </div>
            <div className="detail-field">
              <div className="k">Received</div>
              <div className="v mono">{batch.received_date}</div>
            </div>
            <div className="detail-field">
              <div className="k">Expiry</div>
              <div className="v mono">{batch.expiry_date ?? '—'}</div>
            </div>
            <div className="detail-field">
              <div className="k">Received qty</div>
              <div className="v mono">{batch.qty_received}</div>
            </div>
            <div className="detail-field">
              <div className="k">Remaining</div>
              <div className="v mono">{batch.qty_remaining}</div>
            </div>
            <div className="detail-field">
              <div className="k">Status</div>
              <div className="v"><BatchBadge status={batch.status} /></div>
            </div>
          </div>

          {isExpired && (
            <div className="expired-callout">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ display: 'block', color: 'var(--red)', marginBottom: 2 }}>This batch is expired.</strong>
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    Expired stock is disqualified from FEFO picking and should be removed from active inventory.
                  </span>
                </div>
                {canAdjust && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      onClose();
                      onDelete(batch);
                    }}
                  >
                    <Trash2 size={14} /> Delete expired batch
                  </button>
                )}
              </div>
            </div>
          )}

          <h3 style={{ fontSize: '0.95rem', marginBottom: 10 }}>Record usage</h3>
          {canUse ? (
            <form onSubmit={handleUse}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max={batch.qty_remaining}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={`Up to ${batch.qty_remaining}`}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Reason</label>
                  <select value={reason} onChange={(e) => setReason(e.target.value)}>
                    <option value="Sale">Sale</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Internal use">Internal use</option>
                    <option value="Count correction">Count correction</option>
                  </select>
                </div>
              </div>
              {error && <div className="form-error" role="alert">{error}</div>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Recording…' : 'Record use'}
                </button>
              </div>
            </form>
          ) : (
            <div className="table-empty">
              {batch.status === 'expired'
                ? 'Expired batches cannot be used — this lot is excluded from FEFO picking.'
                : 'No units remaining in this batch.'}
            </div>
          )}

          <h3 style={{ fontSize: '0.95rem', margin: '24px 0 10px' }}>Movement history</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Reason</th>
                  <th>Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {!batch.history || batch.history.length === 0 ? (
                  <tr><td colSpan={5} className="table-empty">No movements recorded.</td></tr>
                ) : (
                  batch.history.map((h) => (
                    <tr key={h.id}>
                      <td className="mono">{h.date}</td>
                      <td>{h.type === 'received' ? 'Received' : 'Used'}</td>
                      <td className="mono">{h.type === 'used' ? '-' : '+'}{h.quantity}</td>
                      <td>{h.reason}</td>
                      <td>{h.actor || 'System / seeded data'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
