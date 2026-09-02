import { useMemo, useState } from 'react';
import { AlertTriangle, AlertOctagon, Info, Check } from 'lucide-react';
import { useInventory } from '../context/InventoryContext.jsx';

const TIER_ICON = { critical: AlertOctagon, warning: AlertTriangle, info: Info };

export default function AlertsCenter() {
  const { alerts, resolveAlert } = useInventory();
  const [tierFilter, setTierFilter] = useState('All');
  const [showResolved, setShowResolved] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  const filtered = useMemo(() => {
    if (!alerts) return [];
    return alerts.filter((a) => {
      const matchesTier = tierFilter === 'All' || a.tier === tierFilter;
      const matchesResolved = showResolved ? true : !a.resolved;
      return matchesTier && matchesResolved;
    });
  }, [alerts, tierFilter, showResolved]);

  const handleResolve = async (id) => {
    setResolvingId(id);
    await resolveAlert(id);
    setResolvingId(null);
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
                  {!a.resolved && (
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleResolve(a.id)}
                      disabled={resolvingId === a.id}
                    >
                      <Check size={14} /> {resolvingId === a.id ? 'Resolving…' : 'Resolve'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
