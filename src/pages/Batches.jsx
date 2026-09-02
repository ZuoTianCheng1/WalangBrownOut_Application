import { useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext.jsx';
import { BatchBadge } from '../components/Badges.jsx';

export default function Batches() {
  const { items, batches } = useInventory();
  const [statusFilter, setStatusFilter] = useState('All');
  const [sku, setSku] = useState('All');

  const nameFor = (skuId) => items?.find((i) => i.sku_id === skuId)?.name ?? skuId;

  const filtered = useMemo(() => {
    if (!batches) return [];
    return batches
      .filter((b) => statusFilter === 'All' || b.status === statusFilter)
      .filter((b) => sku === 'All' || b.sku_id === sku)
      .sort((a, b) => (a.expiry_date ?? '9999').localeCompare(b.expiry_date ?? '9999'));
  }, [batches, statusFilter, sku]);

  return (
    <div className="container-wide">
      <p className="kicker">Batches</p>
      <h1 className="page-title">Every open lot, oldest expiry first.</h1>
      <p className="page-lede">
        
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
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="table-empty">No batches match those filters.</td></tr>
                ) : (
                  filtered.map((b) => (
                    <tr key={b.lot_id}>
                      <td className="mono">{b.lot_id}</td>
                      <td>{nameFor(b.sku_id)}</td>
                      <td className="mono">{b.received_date}</td>
                      <td className="mono">{b.expiry_date ?? '—'}</td>
                      <td className="mono">{b.qty_received}</td>
                      <td className="mono">{b.qty_remaining}</td>
                      <td><BatchBadge status={b.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}