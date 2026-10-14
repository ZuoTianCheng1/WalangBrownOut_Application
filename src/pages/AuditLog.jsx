import { Fragment, useCallback, useEffect, useState } from 'react';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/features.css';
import { getAudit } from '../services/api.js';
import { dateTime, label } from '../utils/format.js';

const PER_PAGE = 25;
const EXPORT_PAGE = 200;
const EXPORT_MAX = 1000;

const ACTION_TEXT = {
  login: 'Signed in', login_failed: 'Failed sign-in', logout: 'Signed out',
  create: 'Created', update: 'Updated', archive: 'Archived',
  receive: 'Received stock', issue: 'Issued stock', adjust: 'Adjusted stock',
  resolve: 'Resolved alert', snooze: 'Snoozed alert',
  approve: 'Approved', cancel: 'Cancelled', receive_purchase_order: 'Received PO goods',
  register_serials: 'Registered serials', serial_sold: 'Sold unit', serial_returned: 'Returned unit', serial_defective: 'Marked defective',
};
const actionText = (a) => ACTION_TEXT[a] ?? label(a);
const actionTone = (a) => (['login_failed', 'cancel', 'serial_defective', 'archive'].includes(a) ? 'red'
  : ['approve', 'create', 'receive_purchase_order', 'register_serials'].includes(a) ? 'teal'
  : ['serial_returned', 'adjust', 'snooze'].includes(a) ? 'amber' : '');

const HIDDEN_DETAILS = new Set(['source']);
const fmtValue = (v) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v));
const detailPairs = (details) => Object.entries(details ?? {}).filter(([k]) => !HIDDEN_DETAILS.has(k));
const summarize = (details) => detailPairs(details).map(([k, v]) => `${label(k).toLowerCase()}: ${fmtValue(v)}`).join(' \u00b7 ') || '\u2014';
const who = (row) => row.actor ?? (row.action === 'login_failed' ? 'Not signed in' : 'System');
const record = (row) => (row.action === 'login_failed' ? `username “${row.entity_id}”` : `${label(row.entity_type)} #${row.entity_id}`);

// Spreadsheet formula injection guard: cells that start with = + - @ are prefixed with an apostrophe.
const csvCell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function AuditLog() {
  const [filters, setFilters] = useState({ q: '', actor_id: '', action: '', entity_type: '', from: '', to: '' });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [options, setOptions] = useState({ actions: [], entity_types: [], actors: [] });
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setQ(filters.q.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const apiParams = useCallback((extra = {}) => ({
    q, actor_id: filters.actor_id, action: filters.action, entity_type: filters.entity_type, from: filters.from, to: filters.to, ...extra,
  }), [q, filters.actor_id, filters.action, filters.entity_type, filters.from, filters.to]);

  useEffect(() => {
    let alive = true;
    getAudit(apiParams({ page, per_page: PER_PAGE }))
      .then((r) => {
        if (!alive) return;
        setResult(r); setError(''); setExpanded(null);
        setOptions({ actions: r.actions, entity_types: r.entity_types, actors: r.actors });
      })
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [apiParams, page]);

  const setFilter = (key) => (e) => { setFilters((f) => ({ ...f, [key]: e.target.value })); setPage(1); };
  const rows = result?.data ?? [];
  const total = result?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const first = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const last = Math.min(total, page * PER_PAGE);
  const anyFilter = Object.values(filters).some(Boolean);

  const exportCsv = async () => {
    setExporting(true); setError('');
    try {
      const all = [];
      for (let p = 1; all.length < EXPORT_MAX; p++) {
        const r = await getAudit(apiParams({ page: p, per_page: EXPORT_PAGE }));
        all.push(...r.data);
        if (r.data.length < EXPORT_PAGE || all.length >= r.total) break;
      }
      const header = ['When', 'User', 'Action', 'Record', 'Details'];
      const lines = [header, ...all.slice(0, EXPORT_MAX).map((r) => [r.created_at, who(r), actionText(r.action), record(r), summarize(r.details)])]
        .map((row) => row.map(csvCell).join(','));
      const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container-wide">
      <div className="page-header-row">
        <div>
          <p className="kicker">Audit log</p>
          <h1 className="page-title">Who did what, and when.</h1>
          <p className="page-lede">Every sign-in, stock movement, order, approval and warranty change is recorded here. Only Admins can see this page.</p>
        </div>
        <button className="btn" onClick={exportCsv} disabled={exporting || total === 0}><Download size={15} /> {exporting ? 'Preparing…' : 'Export CSV'}</button>
      </div>

      {error && <div className="banner error" role="alert"><span>{error}</span><button aria-label="Dismiss" onClick={() => setError('')}>&times;</button></div>}

      <section className="section">
        <div className="filters-wrap">
          <label className="search-input">
            <Search size={15} />
            <input aria-label="Search audit log" placeholder="Search user, action, record or details" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
          </label>
          <select className="select-input" aria-label="User" value={filters.actor_id} onChange={setFilter('actor_id')}>
            <option value="">All users</option>
            {options.actors.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select className="select-input" aria-label="Action" value={filters.action} onChange={setFilter('action')}>
            <option value="">All actions</option>
            {options.actions.map((a) => <option key={a} value={a}>{actionText(a)}</option>)}
          </select>
          <select className="select-input" aria-label="Record type" value={filters.entity_type} onChange={setFilter('entity_type')}>
            <option value="">All records</option>
            {options.entity_types.map((t) => <option key={t} value={t}>{label(t)}</option>)}
          </select>
          <label className="muted-note">From <input className="date-input" type="date" aria-label="From date" value={filters.from} onChange={setFilter('from')} /></label>
          <label className="muted-note">To <input className="date-input" type="date" aria-label="To date" value={filters.to} onChange={setFilter('to')} /></label>
          {anyFilter && <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ q: '', actor_id: '', action: '', entity_type: '', from: '', to: '' }); setPage(1); }}>Clear filters</button>}
        </div>

        {!result && !error ? <div className="alert-loading">Loading audit log…</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>When</th><th>User</th><th>Action</th><th>Record</th><th>Details</th></tr></thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={5} className="table-empty">No activity matches those filters.</td></tr>
                ) : rows.map((r) => {
                  const open = expanded === r.id;
                  const pairs = detailPairs(r.details);
                  return (
                    <Fragment key={r.id}>
                      <tr className={`clickable${open ? ' expanded' : ''}`} onClick={() => setExpanded(open ? null : r.id)} aria-expanded={open}>
                        <td className="mono" style={{ whiteSpace: 'nowrap' }}>{dateTime(r.created_at)}</td>
                        <td>{who(r)}</td>
                        <td><span className={`tag ${actionTone(r.action)}`}>{actionText(r.action)}</span></td>
                        <td>{record(r)}</td>
                        <td className="truncate-cell">{summarize(r.details)}</td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={5} className="audit-detail">
                            <dl>
                              <dt>Time</dt><dd className="mono">{r.created_at}</dd>
                              <dt>User</dt><dd>{who(r)}{r.actor_username ? ` (${r.actor_username})` : ''}</dd>
                              <dt>Action code</dt><dd className="mono">{r.action}</dd>
                              {pairs.map(([k, v]) => (<Fragment key={k}><dt>{label(k)}</dt><dd>{fmtValue(v)}</dd></Fragment>))}
                              {r.details?.source === 'demo seed' && (<><dt>Source</dt><dd>Demo data</dd></>)}
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <span>{total === 0 ? 'No entries' : `Showing ${first}\u2013${last} of ${total}`}</span>
          <div>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /> Previous</button>
            <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={14} /></button>
          </div>
        </div>
      </section>
    </div>
  );
}