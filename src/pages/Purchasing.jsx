import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Truck, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import '../styles/features.css';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import {
  getSuppliers, createSupplier, updateSupplier,
  getPurchaseOrders, getPurchaseOrder, createPurchaseOrder, approvePurchaseOrder, cancelPurchaseOrder, receivePurchaseOrder,
  getReorderSuggestions,
} from '../services/api.js';
import { peso, today, dateOnly } from '../utils/format.js';

const STATUS = {
  draft: { text: 'Draft', tone: '' },
  ordered: { text: 'Ordered', tone: 'amber' },
  partially_received: { text: 'Partly received', tone: 'amber' },
  received: { text: 'Received', tone: 'teal' },
  cancelled: { text: 'Cancelled', tone: 'red' },
};
const StatusTag = ({ status }) => <span className={`tag ${STATUS[status]?.tone ?? ''}`}>{STATUS[status]?.text ?? status}</span>;

export default function Purchasing() {
  const { can } = useAuth();
  const [tab, setTab] = useState('orders');
  const [suppliers, setSuppliers] = useState(null);
  const [error, setError] = useState('');
  const loadSuppliers = useCallback(() => getSuppliers().then(setSuppliers).catch((e) => setError(e.message)), []);
  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  return (
    <div className="container-wide">
      <p className="kicker">Purchasing</p>
      <h1 className="page-title">Order from suppliers, then receive what arrives.</h1>
      <p className="page-lede">
        New orders start as drafts. An Admin approves them, and goods can only be received against approved orders.
        Receiving creates the batches and updates stock automatically.
      </p>
      {error && <div className="banner error" role="alert"><span>{error}</span><button aria-label="Dismiss" onClick={() => setError('')}>&times;</button></div>}

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'orders'} className={`tab${tab === 'orders' ? ' active' : ''}`} onClick={() => setTab('orders')}>Purchase orders</button>
        <button role="tab" aria-selected={tab === 'suppliers'} className={`tab${tab === 'suppliers' ? ' active' : ''}`} onClick={() => setTab('suppliers')}>Suppliers</button>
      </div>

      {tab === 'orders'
        ? <Orders suppliers={suppliers} canWrite={can('purchasing')} canApprove={can('approvePO')} />
        : <Suppliers suppliers={suppliers} reload={loadSuppliers} canWrite={can('purchasing')} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Orders */

function Orders({ suppliers, canWrite, canApprove }) {
  const { items, reloadItems, reloadBatches } = useInventory();
  const [status, setStatus] = useState('');
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => getPurchaseOrders(status).then((r) => { setOrders(r); setError(''); }).catch((e) => setError(e.message)), [status]);
  useEffect(() => { load(); }, [load]);

  const changed = (msg, stockChanged) => {
    if (msg) setNotice(msg);
    load();
    if (stockChanged) { reloadBatches?.(); reloadItems?.(); }
  };

  return (
    <section className="section">
      {notice && <div className="banner" role="status"><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice('')}>&times;</button></div>}
      {error && <div className="banner error" role="alert"><span>{error}</span><button aria-label="Dismiss" onClick={() => setError('')}>&times;</button></div>}
      <div className="toolbar">
        <select className="select-input" aria-label="Order status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All orders</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.text}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        {canWrite && <button className="btn btn-primary" onClick={() => setNewOpen(true)}><Plus size={15} /> New purchase order</button>}
      </div>

      {!orders && !error ? <div className="alert-loading">Loading purchase orders…</div> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>PO number</th><th>Supplier</th><th>Status</th><th>Ordered</th><th>Expected</th><th>Received</th><th>Total</th><th>Created by</th></tr>
            </thead>
            <tbody>
              {(orders ?? []).length === 0 ? (
                <tr><td colSpan={8} className="table-empty">No purchase orders{status ? ' with that status' : ' yet'}.</td></tr>
              ) : orders.map((o) => {
                const pct = Number(o.qty_ordered) ? Math.round((Number(o.qty_received) / Number(o.qty_ordered)) * 100) : 0;
                return (
                  <tr key={o.id} className="clickable" onClick={() => setOpenId(o.id)}>
                    <td className="mono">{o.po_number}</td>
                    <td>{o.supplier_name}</td>
                    <td><StatusTag status={o.status} /></td>
                    <td className="mono">{dateOnly(o.ordered_at)}</td>
                    <td className="mono">{dateOnly(o.expected_at)}</td>
                    <td>
                      <span className="mono">{o.qty_received}/{o.qty_ordered}</span> <span className="muted-note">units</span>
                      <div className="mini-progress" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
                    </td>
                    <td className="mono">{peso(o.total_cost)}</td>
                    <td>{o.created_by_name ?? '\u2014'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <NewOrderModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        suppliers={suppliers}
        items={items}
        onCreated={(po) => {
          setNewOpen(false);
          changed(`${po.po_number} saved as a draft.${canApprove ? ' Open it to approve.' : ' An Admin must approve it before goods can be received.'}`);
        }}
      />
      <OrderDetail
        id={openId}
        onClose={() => setOpenId(null)}
        canWrite={canWrite}
        canApprove={canApprove}
        onChanged={changed}
      />
    </section>
  );
}

function NewOrderModal({ open, onClose, suppliers, items, onCreated }) {
  const blank = () => ({ supplier_id: '', expected_at: '', notes: '', lines: [{ item_id: '', quantity_ordered: 1, unit_cost: '' }] });
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setForm(blank()); setError(''); } }, [open]);

  const sortedItems = useMemo(() => [...(items ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [items]);
  const setLine = (i, patch) => setForm((f) => ({ ...f, lines: f.lines.map((l, n) => (n === i ? { ...l, ...patch } : l)) }));
  const total = form.lines.reduce((sum, l) => sum + Number(l.quantity_ordered || 0) * Number(l.unit_cost || 0), 0);
  const chosen = new Set(form.lines.map((l) => String(l.item_id)).filter(Boolean));

  const suggest = async () => {
    setError('');
    try {
      const rows = await getReorderSuggestions();
      const lines = rows
        .map((r) => { const it = (items ?? []).find((i) => i.sku_id === r.sku_id); return it ? { item_id: String(it.id), quantity_ordered: r.suggested_order_qty, unit_cost: '' } : null; })
        .filter(Boolean);
      if (lines.length === 0) return setError('Nothing needs reordering right now.');
      setForm((f) => ({ ...f, lines }));
    } catch (e) {
      setError(e.message);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.supplier_id) return setError('Choose a supplier.');
    if (form.lines.some((l) => !l.item_id)) return setError('Choose an item on every line, or remove the empty line.');
    if (form.lines.some((l) => !(Number(l.quantity_ordered) >= 1))) return setError('Quantities must be at least 1.');
    setBusy(true);
    try {
      const r = await createPurchaseOrder({
        supplier_id: Number(form.supplier_id),
        expected_at: form.expected_at || undefined,
        notes: form.notes.trim() || undefined,
        lines: form.lines.map((l) => ({ item_id: Number(l.item_id), quantity_ordered: Number(l.quantity_ordered), unit_cost: l.unit_cost === '' ? 0 : Number(l.unit_cost) })),
      });
      onCreated(r.purchase_order);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New purchase order" wide>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="po-supplier">Supplier</label>
            <select id="po-supplier" value={form.supplier_id} onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}>
              <option value="">Choose a supplier…</option>
              {(suppliers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="po-expected">Expected delivery (optional)</label>
            <input id="po-expected" type="date" min={today()} value={form.expected_at} onChange={(e) => setForm((f) => ({ ...f, expected_at: e.target.value }))} />
          </div>
        </div>

        <h3 className="detail-section-title">Items</h3>
        <div className="line-editor">
          <div className="line-head"><span>Item</span><span>Quantity</span><span>Unit cost (PHP)</span><span /></div>
          {form.lines.map((l, i) => (
            <div className="line-row" key={i}>
              <select aria-label={`Item for line ${i + 1}`} value={l.item_id} onChange={(e) => setLine(i, { item_id: e.target.value })}>
                <option value="">Choose an item…</option>
                {sortedItems.map((it) => (
                  <option key={it.id} value={it.id} disabled={chosen.has(String(it.id)) && String(l.item_id) !== String(it.id)}>{it.name} ({it.sku_id})</option>
                ))}
              </select>
              <input aria-label={`Quantity for line ${i + 1}`} type="number" min="1" value={l.quantity_ordered} onChange={(e) => setLine(i, { quantity_ordered: e.target.value })} />
              <input aria-label={`Unit cost for line ${i + 1}`} type="number" min="0" step="0.01" placeholder="0.00" value={l.unit_cost} onChange={(e) => setLine(i, { unit_cost: e.target.value })} />
              <button type="button" className="icon-btn" aria-label={`Remove line ${i + 1}`} disabled={form.lines.length === 1} onClick={() => setForm((f) => ({ ...f, lines: f.lines.filter((_, n) => n !== i) }))}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm((f) => ({ ...f, lines: [...f.lines, { item_id: '', quantity_ordered: 1, unit_cost: '' }] }))}><Plus size={13} /> Add line</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={suggest}><Sparkles size={13} /> Fill from reorder suggestions</button>
        </div>
        <div className="total-row"><span className="muted-note">Order total</span><strong className="mono">{peso(total)}</strong></div>

        <div className="form-field" style={{ marginTop: 14 }}>
          <label htmlFor="po-notes">Notes (optional)</label>
          <textarea id="po-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save as draft'}</button>
        </div>
      </form>
    </Modal>
  );
}

function OrderDetail({ id, onClose, canWrite, canApprove, onChanged }) {
  const [data, setData] = useState(null);
  const [mode, setMode] = useState('view'); // view | receive | cancel
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [rows, setRows] = useState([]);

  const load = useCallback(() => getPurchaseOrder(id).then(setData).catch((e) => setError(e.message)), [id]);
  useEffect(() => {
    if (id == null) return;
    setData(null); setMode('view'); setError(''); setReason('');
    load();
  }, [id, load]);

  const po = data?.purchase_order;
  const lines = data?.lines ?? [];
  const canReceive = canWrite && po && (po.status === 'ordered' || po.status === 'partially_received');
  const canCancel = po && ((po.status === 'draft' && canWrite) || (po.status === 'ordered' && canApprove));

  const startReceive = () => {
    setError('');
    setRows(lines
      .filter((l) => l.quantity_ordered - l.quantity_received > 0)
      .map((l, n) => ({
        line_id: l.id, name: l.item_name, sku: l.sku_id, remaining: l.quantity_ordered - l.quantity_received, shelf: l.shelf_life_days,
        quantity: String(l.quantity_ordered - l.quantity_received),
        lot_id: `LOT-${po.po_number.replace(/^PO-/, '')}-${lines.indexOf(l) + 1}`,
        received_date: today(), expiry_date: '',
      })));
    setMode('receive');
  };
  const setRow = (i, patch) => setRows((rs) => rs.map((r, n) => (n === i ? { ...r, ...patch } : r)));

  const run = async (fn, okMessage, stock) => {
    setBusy(true); setError('');
    try {
      await fn();
      await load();
      setMode('view');
      onChanged(okMessage, stock);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitReceive = (e) => {
    e.preventDefault();
    const chosen = rows.filter((r) => Number(r.quantity) > 0);
    if (chosen.length === 0) return setError('Enter a quantity for at least one line.');
    for (const r of chosen) {
      if (Number(r.quantity) > r.remaining) return setError(`${r.name}: only ${r.remaining} still expected.`);
      if (!r.lot_id.trim()) return setError(`${r.name}: enter a lot ID.`);
    }
    run(
      () => receivePurchaseOrder(id, chosen.map((r) => ({
        line_id: r.line_id, lot_id: r.lot_id.trim(), quantity: Number(r.quantity),
        received_date: r.received_date || undefined, expiry_date: r.expiry_date || undefined,
      }))),
      `Goods received against ${po.po_number}. Stock has been updated.`,
      true
    );
  };

  const total = lines.reduce((s, l) => s + l.quantity_ordered * Number(l.unit_cost), 0);

  return (
    <Modal open={id != null} onClose={onClose} title={po ? `${po.po_number} — ${po.supplier_name}` : 'Purchase order'} wide>
      {!po ? (error ? <div className="form-error" role="alert">{error}</div> : <div className="alert-loading">Loading…</div>) : (
        <>
          <div className="detail-grid">
            <div className="detail-field"><div className="k">Status</div><div className="v"><StatusTag status={po.status} /></div></div>
            <div className="detail-field"><div className="k">Order total</div><div className="v mono">{peso(total)}</div></div>
            <div className="detail-field"><div className="k">Created by</div><div className="v">{po.created_by_name ?? '\u2014'}</div></div>
            <div className="detail-field"><div className="k">Approved by</div><div className="v">{po.approved_by_name ?? (po.status === 'draft' ? 'Waiting for approval' : '\u2014')}</div></div>
            <div className="detail-field"><div className="k">Ordered</div><div className="v mono">{dateOnly(po.ordered_at)}</div></div>
            <div className="detail-field"><div className="k">Expected</div><div className="v mono">{dateOnly(po.expected_at)}</div></div>
          </div>
          {po.notes && <p className="muted-note" style={{ marginBottom: 14 }}>Notes: {po.notes}</p>}
          {po.status === 'cancelled' && <div className="step-note" style={{ marginTop: 0, marginBottom: 14 }}>Cancelled: {po.cancel_reason}</div>}

          {mode === 'receive' ? (
            <form onSubmit={submitReceive}>
              <h3 className="detail-section-title" style={{ marginTop: 4 }}>Receive goods</h3>
              <p className="muted-note" style={{ marginBottom: 12 }}>Each delivered line becomes a new batch. Leave a quantity at 0 to skip it.</p>
              {rows.map((r, i) => (
                <div className="receive-line" key={r.line_id}>
                  <div className="receive-title"><strong>{r.name} <span className="mono muted-note">{r.sku}</span></strong><span className="muted-note">{r.remaining} still expected</span></div>
                  <div className="receive-grid">
                    <div className="form-field"><label htmlFor={`rq-${i}`}>Quantity received</label><input id={`rq-${i}`} type="number" min="0" max={r.remaining} value={r.quantity} onChange={(e) => setRow(i, { quantity: e.target.value })} /></div>
                    <div className="form-field"><label htmlFor={`rl-${i}`}>Lot ID</label><input id={`rl-${i}`} value={r.lot_id} onChange={(e) => setRow(i, { lot_id: e.target.value })} /></div>
                    <div className="form-field"><label htmlFor={`rd-${i}`}>Received date</label><input id={`rd-${i}`} type="date" max={today()} value={r.received_date} onChange={(e) => setRow(i, { received_date: e.target.value })} /></div>
                    <div className="form-field"><label htmlFor={`re-${i}`}>Expiry date (optional)</label><input id={`re-${i}`} type="date" value={r.expiry_date} onChange={(e) => setRow(i, { expiry_date: e.target.value })} />{r.shelf > 0 && <span className="form-hint">Blank = received date + {r.shelf} days shelf life.</span>}</div>
                  </div>
                </div>
              ))}
              {error && <div className="form-error" role="alert">{error}</div>}
              <div className="modal-footer-actions">
                <button type="button" className="btn" onClick={() => { setMode('view'); setError(''); }}>Back</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Receiving…' : 'Confirm receipt'}</button>
              </div>
            </form>
          ) : (
            <>
              <h3 className="detail-section-title" style={{ marginTop: 4 }}>Lines</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Item</th><th>Ordered</th><th>Received</th><th>Remaining</th><th>Unit cost</th><th>Line total</th></tr></thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.id}>
                        <td>{l.item_name}<div className="table-subtext mono">{l.sku_id}</div></td>
                        <td className="mono">{l.quantity_ordered}</td>
                        <td className="mono">{l.quantity_received}</td>
                        <td className="mono">{l.quantity_ordered - l.quantity_received}</td>
                        <td className="mono">{peso(l.unit_cost)}</td>
                        <td className="mono">{peso(l.quantity_ordered * Number(l.unit_cost))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.batches.length > 0 && (
                <>
                  <h3 className="detail-section-title">Batches received</h3>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead><tr><th>Lot</th><th>Item</th><th>Received</th><th>Expiry</th><th>Qty</th></tr></thead>
                      <tbody>
                        {data.batches.map((b) => (
                          <tr key={b.lot_id}><td className="mono">{b.lot_id}</td><td>{b.item_name}</td><td className="mono">{b.received_date}</td><td className="mono">{b.expiry_date ?? '\u2014'}</td><td className="mono">{b.qty_received}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {mode === 'cancel' && (
                <div className="form-field" style={{ marginTop: 16 }}>
                  <label htmlFor="po-cancel">Reason for cancelling</label>
                  <textarea id="po-cancel" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
                </div>
              )}
              {po.status === 'draft' && !canApprove && <div className="step-note">This order is waiting for an Admin to approve it. You can cancel it until then.</div>}
              {error && <div className="form-error" role="alert">{error}</div>}

              <div className="modal-footer-actions">
                {mode === 'cancel' ? (
                  <>
                    <button className="btn" onClick={() => { setMode('view'); setError(''); }}>Keep order</button>
                    <button className="btn btn-primary" disabled={busy} onClick={() => {
                      if (reason.trim().length < 3) return setError('Enter a reason (at least 3 characters).');
                      run(() => cancelPurchaseOrder(id, reason.trim()), `${po.po_number} cancelled.`);
                    }}>{busy ? 'Cancelling…' : 'Confirm cancellation'}</button>
                  </>
                ) : (
                  <>
                    {canCancel && <button className="btn" onClick={() => { setMode('cancel'); setError(''); }}><XCircle size={14} /> Cancel order</button>}
                    {po.status === 'draft' && canApprove && (
                      <button className="btn btn-primary" disabled={busy} onClick={() => run(() => approvePurchaseOrder(id), `${po.po_number} approved. Goods can now be received.`)}><CheckCircle2 size={14} /> {busy ? 'Approving…' : 'Approve order'}</button>
                    )}
                    {canReceive && <button className="btn btn-primary" onClick={startReceive}><Truck size={14} /> Receive goods</button>}
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}

/* --------------------------------------------------------------- Suppliers */

function Suppliers({ suppliers, reload, canWrite }) {
  const [editing, setEditing] = useState(null); // null | {} (new) | supplier
  const [notice, setNotice] = useState('');
  return (
    <section className="section">
      {notice && <div className="banner" role="status"><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice('')}>&times;</button></div>}
      <div className="toolbar">
        <div style={{ flex: 1 }} />
        {canWrite && <button className="btn btn-primary" onClick={() => setEditing({})}><Plus size={15} /> Add supplier</button>}
      </div>
      {!suppliers ? <div className="alert-loading">Loading suppliers…</div> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Supplier</th><th>Contact</th><th>Email</th><th>Phone</th><th>Address</th></tr></thead>
            <tbody>
              {suppliers.length === 0 ? <tr><td colSpan={5} className="table-empty">No suppliers yet.</td></tr> : suppliers.map((s) => (
                <tr key={s.id} className={canWrite ? 'clickable' : ''} onClick={() => canWrite && setEditing(s)}>
                  <td>{s.name}</td><td>{s.contact_name ?? '\u2014'}</td><td>{s.email ?? '\u2014'}</td><td className="mono">{s.phone ?? '\u2014'}</td><td>{s.address ?? '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <SupplierModal supplier={editing} onClose={() => setEditing(null)} onSaved={(msg) => { setEditing(null); setNotice(msg); reload(); }} />
    </section>
  );
}

function SupplierModal({ supplier, onClose, onSaved }) {
  const empty = { name: '', contact_name: '', email: '', phone: '', address: '' };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (supplier) { setForm({ ...empty, ...Object.fromEntries(Object.entries(supplier).filter(([k]) => k in empty).map(([k, v]) => [k, v ?? ''])) }); setError(''); } }, [supplier]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isNew = supplier && !supplier.id;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || (k === 'name' ? v : null) : v]));
    try {
      if (isNew) await createSupplier(payload); else await updateSupplier(supplier.id, payload);
      onSaved(`${payload.name} ${isNew ? 'added' : 'updated'}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!supplier} onClose={onClose} title={isNew ? 'Add supplier' : 'Edit supplier'}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-field span-2"><label htmlFor="sp-name">Supplier name</label><input id="sp-name" value={form.name} onChange={set('name')} required /></div>
          <div className="form-field"><label htmlFor="sp-contact">Contact person</label><input id="sp-contact" value={form.contact_name} onChange={set('contact_name')} /></div>
          <div className="form-field"><label htmlFor="sp-phone">Phone</label><input id="sp-phone" value={form.phone} onChange={set('phone')} /></div>
          <div className="form-field span-2"><label htmlFor="sp-email">Email</label><input id="sp-email" type="email" value={form.email} onChange={set('email')} /></div>
          <div className="form-field span-2"><label htmlFor="sp-address">Address</label><input id="sp-address" value={form.address} onChange={set('address')} /></div>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save supplier'}</button>
        </div>
      </form>
    </Modal>
  );
}