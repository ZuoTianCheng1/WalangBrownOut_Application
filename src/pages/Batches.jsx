import { useMemo, useState } from 'react';
import { PackageMinus } from 'lucide-react';
import { useInventory } from '../context/InventoryContext.jsx';
import { BatchBadge } from '../components/Badges.jsx';
import Modal from '../components/Modal.jsx';

export default function Batches() {
  const { items, batches, consumeBatch } = useInventory();
  const [statusFilter, setStatusFilter] = useState('All');
  const [sku, setSku] = useState('All');
  const [selectedLotId, setSelectedLotId] = useState(null);

  const nameFor = (skuId) => items?.find((i) => i.sku_id === skuId)?.name ?? skuId;

  const filtered = useMemo(() => {
    if (!batches) return [];
    return batches
      .filter((b) => statusFilter === 'All' || b.status === statusFilter)
      .filter((b) => sku === 'All' || b.sku_id === sku)
      .sort((a, b) => (a.expiry_date ?? '9999').localeCompare(b.expiry_date ?? '9999'));
  }, [batches, statusFilter, sku]);

  const selected = useMemo(
    () => batches?.find((b) => b.lot_id === selectedLotId) ?? null,
    [batches, selectedLotId]
  );

  return (
    <div className="container-wide">
      <p className="kicker">Batches</p>
      <h1 className="page-title">Every open lot, oldest expiry first.</h1>
      <p className="page-lede">
        Open a lot to record stock usage or review its movement history.
      </p>

      <section className="section">
        <div className="toolbar">
          <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All statuses</option>
            <option value="active">Active</option>
            <option value="near_expiry">Near expiry</option>
            <option value="expired">Expired</option>
          </select>
          <select className="select-input" value={sku} onChange={(e) => setSku(e.target.value)}>
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
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lot</th>
                  <th>Item</th>
                  <th>Received</th>
                  <th>Expiry</th>
                  <th>Received qty</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="table-empty">No batches match those filters.</td></tr>
                ) : (
                  filtered.map((b) => (
                    <tr key={b.lot_id} className="clickable" onClick={() => setSelectedLotId(b.lot_id)}>
                      <td className="mono">{b.lot_id}</td>
                      <td>{nameFor(b.sku_id)}</td>
                      <td className="mono">{b.received_date}</td>
                      <td className="mono">{b.expiry_date ?? '—'}</td>
                      <td className="mono">{b.qty_received}</td>
                      <td className="mono">{b.qty_remaining}</td>
                      <td><BatchBadge status={b.status} /></td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => { e.stopPropagation(); setSelectedLotId(b.lot_id); }}
                        >
                          <PackageMinus size={14} /> Use
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <BatchDetailModal
        batch={selected}
        itemName={selected ? nameFor(selected.sku_id) : ''}
        onClose={() => setSelectedLotId(null)}
        consumeBatch={consumeBatch}
      />
    </div>
  );
}

function BatchDetailModal({ batch, itemName, onClose, consumeBatch }) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Sale');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canUse = !!batch && batch.status !== 'expired' && batch.qty_remaining > 0;

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
      // This is the real-time deduction that keeps qty_on_hand honest — every
      // call updates the batch, the item total, and the movement history below
      // in one round trip, instead of waiting for a weekly spreadsheet count.
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
                </tr>
              </thead>
              <tbody>
                {!batch.history || batch.history.length === 0 ? (
                  <tr><td colSpan={4} className="table-empty">No movements recorded.</td></tr>
                ) : (
                  batch.history.map((h) => (
                    <tr key={h.id}>
                      <td className="mono">{h.date}</td>
                      <td>{h.type === 'received' ? 'Received' : 'Used'}</td>
                      <td className="mono">{h.type === 'used' ? '-' : '+'}{h.quantity}</td>
                      <td>{h.reason}</td>
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
