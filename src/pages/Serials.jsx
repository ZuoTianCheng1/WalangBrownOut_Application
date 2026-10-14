import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Undo2, Ban, ShoppingCart } from 'lucide-react';
import '../styles/features.css';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { getSerials, registerSerials, changeSerialStatus } from '../services/api.js';
import { today } from '../utils/format.js';

const STATUS_TONE = { in_stock: 'teal', sold: '', returned: 'amber', defective: 'red' };
const STATUS_TEXT = { in_stock: 'In stock', sold: 'Sold', returned: 'Returned', defective: 'Defective' };

const TILES = [
  { key: 'in_stock', label: 'In stock', apply: { status: 'in_stock', warranty: '' } },
  { key: 'sold', label: 'Sold', apply: { status: 'sold', warranty: '' } },
  { key: 'returned', label: 'Returned', apply: { status: 'returned', warranty: '' } },
  { key: 'defective', label: 'Defective', apply: { status: 'defective', warranty: '' } },
  { key: 'expiring_soon', label: 'Warranty ends within 30 days', apply: { status: '', warranty: 'expiring_soon' } },
  { key: 'expired', label: 'Warranty expired', apply: { status: '', warranty: 'expired' } },
];

function Warranty({ s }) {
  if (!s.warranty_end) return <span className="muted-note">{s.status === 'sold' ? 'No warranty' : '\u2014'}</span>;
  const d = s.warranty_days_left;
  const tone = s.warranty_status === 'active' ? 'teal' : s.warranty_status === 'expiring_soon' ? 'amber' : 'red';
  const text = d < 0 ? `Expired ${-d}d ago` : d === 0 ? 'Ends today' : `${d}d left`;
  return (
    <>
      <span className="mono">{s.warranty_end}</span>
      <div className="table-subtext"><span className={`tag ${tone}`}>{text}</span></div>
    </>
  );
}

export default function Serials() {
  const { can } = useAuth();
  const { items, batches, reloadBatches, reloadItems } = useInventory();
  const canWrite = can('adjustStock');

  const [filters, setFilters] = useState({ q: '', status: '', warranty: '' });
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [action, setAction] = useState(null); // { serial, to }

  useEffect(() => {
    const t = setTimeout(() => setQuery(filters.q.trim()), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const load = useCallback(
    () => getSerials({ q: query, status: filters.status, warranty: filters.warranty })
      .then((r) => { setResult(r); setError(''); })
      .catch((e) => setError(e.message)),
    [query, filters.status, filters.warranty]
  );
  useEffect(() => { load(); }, [load]);

  const refreshStock = () => { reloadBatches?.(); reloadItems?.(); };
  const rows = result?.data ?? [];
  const summary = result?.summary;
  const tileSelected = (t) => filters.status === t.apply.status && filters.warranty === t.apply.warranty && (t.apply.status || t.apply.warranty);

  return (
    <div className="container-wide">
      <div className="page-header-row">
        <div>
          <p className="kicker">Serials &amp; warranty</p>
          <h1 className="page-title">Every unit you sold, and when its warranty ends.</h1>
          <p className="page-lede">
            Look up a serial number to see who bought it and whether it is still covered.
            {canWrite ? ' Selling, returning or writing off a unit also keeps the stock count in step.' : ''}
          </p>
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => setRegisterOpen(true)}>
            <Plus size={15} /> Register serials
          </button>
        )}
      </div>

      {notice && <div className="banner" role="status"><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice('')}>&times;</button></div>}
      {error && <div className="banner error" role="alert"><span>{error}</span><button aria-label="Dismiss" onClick={() => setError('')}>&times;</button></div>}

      <section className="section">
        {summary && (
          <div className="kpi-grid" style={{ marginBottom: 22 }}>
            {TILES.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`kpi-cell tile${tileSelected(t) ? ' selected' : ''}`}
                onClick={() => setFilters((f) => (tileSelected(t) ? { ...f, status: '', warranty: '' } : { ...f, ...t.apply }))}
              >
                <div className="kpi-value">{summary[t.key]}</div>
                <div className="kpi-label">{t.label}</div>
              </button>
            ))}
          </div>
        )}

        <div className="toolbar">
          <label className="search-input">
            <Search size={15} />
            <input
              aria-label="Search serials"
              placeholder="Search serial number, customer or item"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
          </label>
          <select className="select-input" aria-label="Unit status" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_TEXT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="select-input" aria-label="Warranty" value={filters.warranty} onChange={(e) => setFilters((f) => ({ ...f, warranty: e.target.value }))}>
            <option value="">Any warranty</option>
            <option value="active">Active</option>
            <option value="expiring_soon">Ends within 30 days</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {!result && !error ? (
          <div className="alert-loading">Loading serial numbers…</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Serial number</th><th>Item</th><th>Lot</th><th>Status</th><th>Customer</th><th>Sold</th><th>Warranty ends</th>
                  {canWrite && <th></th>}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={canWrite ? 8 : 7} className="table-empty">No serial numbers match. {canWrite ? 'Use “Register serials” to add units.' : ''}</td></tr>
                ) : rows.map((s) => (
                  <tr key={s.id}>
                    <td className="mono">{s.serial_number}</td>
                    <td>{s.item_name}<div className="table-subtext mono">{s.sku_id}</div></td>
                    <td className="mono">{s.lot_id ?? '\u2014'}</td>
                    <td><span className={`tag ${STATUS_TONE[s.status] ?? ''}`}>{STATUS_TEXT[s.status] ?? s.status}</span></td>
                    <td>{s.customer_name ?? '\u2014'}{s.customer_contact && <div className="table-subtext">{s.customer_contact}</div>}</td>
                    <td className="mono">{s.sold_at ?? '\u2014'}</td>
                    <td><Warranty s={s} /></td>
                    {canWrite && (
                      <td>
                        <div className="actions-cell">
                          {(s.status === 'in_stock' || s.status === 'returned') && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setAction({ serial: s, to: 'sold' })}><ShoppingCart size={13} /> Sell</button>
                          )}
                          {s.status === 'sold' && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setAction({ serial: s, to: 'returned' })}><Undo2 size={13} /> Return</button>
                          )}
                          {s.status !== 'defective' && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setAction({ serial: s, to: 'defective' })}><Ban size={13} /> Defective</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result && rows.length >= 500 && <p className="muted-note" style={{ marginTop: 10 }}>Showing the newest 500 matches. Narrow the search to see others.</p>}
      </section>

      <RegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        items={items}
        batches={batches}
        onDone={(n) => { setRegisterOpen(false); setNotice(`Registered ${n} serial number${n === 1 ? '' : 's'}.`); load(); }}
      />
      <ActionModal
        action={action}
        onClose={() => setAction(null)}
        onDone={(s, to) => {
          setAction(null);
          setNotice(`${s.serial_number} marked ${STATUS_TEXT[to].toLowerCase()}.`);
          load(); refreshStock();
        }}
      />
    </div>
  );
}

function RegisterModal({ open, onClose, items, batches, onDone }) {
  const [sku, setSku] = useState('');
  const [lot, setLot] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(
    () => [...(items ?? [])].sort((a, b) => (Number(b.warranty_months > 0) - Number(a.warranty_months > 0)) || a.name.localeCompare(b.name)),
    [items]
  );
  useEffect(() => { if (open) { setSku((cur) => cur || sorted[0]?.sku_id || ''); setError(''); } }, [open, sorted]);

  const lots = useMemo(() => (batches ?? []).filter((b) => b.sku_id === sku), [batches, sku]);
  const lotInfo = lots.find((b) => b.lot_id === lot);
  const parsed = useMemo(() => [...new Set(text.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean))], [text]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!sku) return setError('Choose an item.');
    if (parsed.length === 0) return setError('Enter at least one serial number.');
    setBusy(true);
    try {
      const r = await registerSerials({ sku_id: sku, lot_id: lot || undefined, serials: parsed });
      setText(''); setLot('');
      onDone(r.created);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Register serial numbers" wide>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="rs-item">Item</label>
            <select id="rs-item" value={sku} onChange={(e) => { setSku(e.target.value); setLot(''); }}>
              {sorted.map((i) => (
                <option key={i.sku_id} value={i.sku_id}>{i.name} ({i.sku_id}){i.warranty_months > 0 ? ` \u00b7 ${i.warranty_months}-month warranty` : ' \u00b7 no warranty'}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="rs-lot">Lot (optional)</label>
            <select id="rs-lot" value={lot} onChange={(e) => setLot(e.target.value)}>
              <option value="">Not linked to a lot</option>
              {lots.map((b) => <option key={b.lot_id} value={b.lot_id}>{b.lot_id} · received {b.qty_received}, {b.qty_remaining} left</option>)}
            </select>
            <span className="form-hint">{lotInfo ? 'Linked units adjust this lot when sold, returned or written off.' : 'Unlinked units never change stock quantities.'}</span>
          </div>
          <div className="form-field span-2">
            <label htmlFor="rs-serials">Serial numbers</label>
            <textarea id="rs-serials" className="mono" value={text} onChange={(e) => setText(e.target.value)} placeholder={'One per line, or separated by commas\nACP10-000123\nACP10-000124'} />
            <span className="form-hint">{parsed.length} serial number{parsed.length === 1 ? '' : 's'} to register.</span>
          </div>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Registering…' : `Register ${parsed.length || ''}`.trim()}</button>
        </div>
      </form>
    </Modal>
  );
}

function stockNote(s, to) {
  if (!s) return '';
  if (!s.lot_id) return 'This unit is not linked to a lot, so stock quantities will not change.';
  if (to === 'sold') return `Issues 1 unit from lot ${s.lot_id}${s.warranty_months > 0 ? ` and starts a ${s.warranty_months}-month warranty from the sale date` : ''}.`;
  if (to === 'returned') return `Puts 1 unit back into lot ${s.lot_id} as sellable stock and clears the customer and warranty.`;
  return s.status === 'sold'
    ? 'Treated as a warranty claim: the stock count does not change and the warranty dates are kept.'
    : `Writes 1 unit off from lot ${s.lot_id}. A defective unit cannot be changed afterwards.`;
}

function ActionModal({ action, onClose, onDone }) {
  const s = action?.serial;
  const to = action?.to;
  const [customer, setCustomer] = useState('');
  const [contact, setContact] = useState('');
  const [soldAt, setSoldAt] = useState(today());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (action) { setCustomer(''); setContact(''); setSoldAt(today()); setNotes(''); setError(''); } }, [action]);

  const titles = { sold: 'Sell unit', returned: 'Return unit', defective: 'Mark unit defective' };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (to === 'sold' && !customer.trim()) return setError('Enter the customer name.');
    setBusy(true);
    try {
      await changeSerialStatus(s.id, to === 'sold'
        ? { to, customer_name: customer.trim(), customer_contact: contact.trim() || undefined, sold_at: soldAt }
        : { to, notes: notes.trim() || undefined });
      onDone(s, to);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!action} onClose={onClose} title={s ? `${titles[to]} — ${s.serial_number}` : ''}>
      {s && (
        <form onSubmit={submit}>
          <p className="muted-note" style={{ marginBottom: 14 }}>{s.item_name} · currently {STATUS_TEXT[s.status].toLowerCase()}</p>
          {to === 'sold' ? (
            <div className="form-grid">
              <div className="form-field span-2">
                <label htmlFor="ac-customer">Customer name</label>
                <input id="ac-customer" value={customer} onChange={(e) => setCustomer(e.target.value)} autoFocus required />
              </div>
              <div className="form-field">
                <label htmlFor="ac-contact">Contact (optional)</label>
                <input id="ac-contact" value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="ac-date">Sale date</label>
                <input id="ac-date" type="date" max={today()} value={soldAt} onChange={(e) => setSoldAt(e.target.value)} required />
              </div>
            </div>
          ) : (
            <div className="form-field">
              <label htmlFor="ac-notes">Notes (optional)</label>
              <textarea id="ac-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={to === 'defective' ? 'What is wrong with the unit?' : 'Why was it returned?'} />
            </div>
          )}
          <div className="step-note">{stockNote(s, to)}</div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : titles[to]}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}