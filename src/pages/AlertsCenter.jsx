import { useMemo, useState } from 'react';
import { AlertTriangle, AlertOctagon, Info, Check, BellOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useInventory } from '../context/InventoryContext.jsx';

const TIER_ICON = { critical: AlertOctagon, warning: AlertTriangle, info: Info };

export default function AlertsCenter() {
  const { alerts, resolveAlert } = useInventory();
  const { can, user } = useAuth();
  const [notes, setNotes] = useState({});
  const [snoozed, setSnoozed] = useState(() => { try { return JSON.parse(localStorage.getItem('ims_snoozed_alerts') || '{}'); } catch { return {}; } });
  const [tierFilter, setTierFilter] = useState('All');
  const [showResolved, setShowResolved] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  const filtered = useMemo(() => {
    if (!alerts) return [];
    return alerts.filter((a) => {
      const matchesTier = tierFilter === 'All' || a.tier === tierFilter;
      const matchesResolved = showResolved ? true : !a.resolved;
      const isSnoozed = Number(snoozed[a.id] || 0) > Date.now();
      return matchesTier && matchesResolved && (showResolved || !isSnoozed);
    });
  }, [alerts, tierFilter, showResolved, snoozed]);

  const handleResolve = async (id) => {
    setResolvingId(id);
    try { await resolveAlert(id, notes[id] || ''); }
    finally { setResolvingId(null); }
  };
  const snooze = (id) => {
    const next = { ...snoozed, [id]: Date.now() + 24 * 60 * 60 * 1000 };
    setSnoozed(next); localStorage.setItem('ims_snoozed_alerts', JSON.stringify(next));
  };

  return (
    <div className="container">
      <p className="kicker">Alert center</p>
      <h1 className="page-title">Reorder and expiry alerts</h1>
      <p className="page-lede">
       
      </p>

      <section className="section">
        <div className="toolbar">
          <select className="select-input" value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
            <option value="All">All tiers</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
            Show resolved
          </label>
        </div>

        {!alerts ? (
          <div className="alert-loading">Loading alerts…</div>
        ) : filtered.length === 0 ? (
          <div className="card table-empty">Nothing here — you're caught up.</div>
        ) : (
          <div className="alert-feed">
            {filtered.map((a) => {
              const Icon = TIER_ICON[a.tier] ?? Info;
              return (
                <div className={`alert-item tier-${a.tier}`} key={a.id} style={{ opacity: a.resolved ? 0.55 : 1 }}>
                  <Icon className="alert-icon" size={18} />
                  <div className="alert-body">
                    <div className="alert-title">{a.title}</div>
                    <div className="alert-meta">{a.meta}</div>
                  </div>
                  {a.resolved ? <div className="alert-audit">Resolved by {a.resolved_by || 'System'}{a.resolved_at ? ` · ${new Date(a.resolved_at).toLocaleString()}` : ''}{a.resolution_notes ? ` · ${a.resolution_notes}` : ''}</div> : <div className="alert-actions">
                    <input aria-label="Resolution note" className="alert-note-input" placeholder="Resolution note (optional)" value={notes[a.id] || ''} onChange={e=>setNotes(n=>({...n,[a.id]:e.target.value}))}/>
                    {can('resolveAlert') && <button className="btn btn-sm btn-primary" onClick={() => handleResolve(a.id)} disabled={resolvingId === a.id}><Check size={14}/>{resolvingId === a.id ? 'Resolving…' : 'Resolve'}</button>}
                    <button className="btn btn-sm btn-ghost" onClick={()=>snooze(a.id)} title="Snooze for 24 hours"><BellOff size={14}/> Snooze</button>
                  </div>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
