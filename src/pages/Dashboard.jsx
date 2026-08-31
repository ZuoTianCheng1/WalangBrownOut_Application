import { Link } from 'react-router-dom';
import { AlertTriangle, AlertOctagon, Info, ArrowRight } from 'lucide-react';
import { useInventory } from '../context/InventoryContext.jsx';
import { StockBadge } from '../components/Badges.jsx';

const TIER_ICON = { critical: AlertOctagon, warning: AlertTriangle, info: Info };

function peso(n) {
  return `₱${n.toLocaleString('en-PH')}`;
}

export default function Dashboard() {
  const { items, batches, alerts } = useInventory();
  const loading = !items || !batches || !alerts;

  const belowReorder = loading ? [] : items.filter((i) => i.stock_status !== 'healthy');
  const nearExpiry = loading ? [] : batches.filter((b) => b.status === 'near_expiry' || b.status === 'expired');
  const openAlerts = loading ? [] : alerts.filter((a) => !a.resolved).slice(0, 4);
  const inventoryValue = loading ? 0 : items.reduce((sum, i) => sum + i.qty_on_hand * i.unit_price, 0);

  return (
    <div className="container-wide">
      <p className="kicker">Dashboard</p>
      <h1 className="page-title">Floor status, right now</h1>
      <p className="page-lede">
        Everything below is derived live from stock on hand and open batches — not a weekly count.
      </p>

      <section className="section">
        {loading ? (
          <div className="alert-loading">Loading dashboard…</div>
        ) : (
          <div className="kpi-grid">
            <div className="kpi-cell">
              <div className="kpi-value">{items.length}</div>
              <div className="kpi-label">Active SKUs</div>
            </div>
            <div className="kpi-cell">
              <div className="kpi-value">{belowReorder.length}</div>
              <div className="kpi-label">Items at or below reorder point</div>
              {belowReorder.length > 0 && <span className="kpi-delta down">needs action</span>}
            </div>
            <div className="kpi-cell">
              <div className="kpi-value">{nearExpiry.length}</div>
              <div className="kpi-label">Batches near expiry or expired</div>
              {nearExpiry.length > 0 && <span className="kpi-delta flag">check floor</span>}
            </div>
            <div className="kpi-cell">
              <div className="kpi-value">
                {peso(inventoryValue).replace('₱', '')}
                <span className="unit">PHP</span>
              </div>
              <div className="kpi-label">On-hand inventory value</div>
            </div>
          </div>
        )}
      </section>

      <div className="two-col" style={{ marginTop: 48, alignItems: 'start' }}>
        <section>
          <div className="page-header-row" style={{ marginBottom: 16 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>Below reorder point</h2>
            <Link to="/inventory" className="btn btn-ghost btn-sm">
              View inventory <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="alert-loading">Loading…</div>
          ) : belowReorder.length === 0 ? (
            <div className="card table-empty">Every item is above its reorder point.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>On hand</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {belowReorder.map((i) => (
                    <tr key={i.sku_id}>
                      <td>{i.name}</td>
                      <td className="mono">{i.qty_on_hand} / {i.reorder_point}</td>
                      <td><StockBadge status={i.stock_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <div className="page-header-row" style={{ marginBottom: 16 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>Open alerts</h2>
            <Link to="/alerts" className="btn btn-ghost btn-sm">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="alert-loading">Loading…</div>
          ) : openAlerts.length === 0 ? (
            <div className="card table-empty">No open alerts.</div>
          ) : (
            <div className="alert-feed">
              {openAlerts.map((a) => {
                const Icon = TIER_ICON[a.tier] ?? Info;
                return (
                  <div className={`alert-item tier-${a.tier}`} key={a.id}>
                    <Icon className="alert-icon" size={18} />
                    <div className="alert-body">
                      <div className="alert-title">{a.title}</div>
                      <div className="alert-meta">{a.meta}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
