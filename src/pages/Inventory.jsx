import { useMemo, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useInventory } from '../context/InventoryContext.jsx';
import { StockBadge, ClassBadge, BatchBadge } from '../components/Badges.jsx';
import Modal from '../components/Modal.jsx';
import { categories } from '../data/mockData.js';

function peso(n) {
  return `₱${n.toLocaleString('en-PH')}`;
}

export default function Inventory() {
  const { items, batches, addItem } = useInventory();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((i) => {
      const matchesQuery =
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        i.sku_id.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === 'All' || i.category === category;
      const matchesStatus = statusFilter === 'All' || i.stock_status === statusFilter;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [items, query, category, statusFilter]);

  const selectedBatches = useMemo(() => {
    if (!selected || !batches) return [];
    return batches
      .filter((b) => b.sku_id === selected.sku_id)
      .sort((a, b) => (a.expiry_date ?? '9999').localeCompare(b.expiry_date ?? '9999'));
  }, [selected, batches]);

  return (
    <div className="container-wide">
      <div className="page-header-row">
        <div>
          <p className="kicker">Inventory</p>
          <h1 className="page-title">All items</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add item
        </button>
      </div>
      <p className="page-lede">Search, filter, and open an item to see its batches in FEFO order.</p>

      <section className="section">
        <div className="toolbar">
          <div className="search-input">
            <Search size={16} />
            <input
              placeholder="Search by name or SKU…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className="select-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All statuses</option>
            <option value="healthy">Healthy</option>
            <option value="below_reorder">Below reorder point</option>
            <option value="out_of_stock">Out of stock</option>
          </select>
        </div>

        {!items ? (
          <div className="alert-loading">Loading inventory…</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Class</th>
                  <th>On hand</th>
                  <th>Unit price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-empty">No items match those filters.</td>
                  </tr>
                ) : (
                  filtered.map((i) => (
                    <tr key={i.sku_id} className="clickable" onClick={() => setSelected(i)}>
                      <td className="mono">{i.sku_id}</td>
                      <td>{i.name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{i.category}</td>
                      <td><ClassBadge abc={i.abc_class} xyz={i.xyz_class} /></td>
                      <td className="mono">{i.qty_on_hand}</td>
                      <td className="mono">{peso(i.unit_price)}</td>
                      <td><StockBadge status={i.stock_status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''} wide>
        {selected && (
          <>
            <div className="detail-grid">
              <div className="detail-field">
                <div className="k">SKU</div>
                <div className="v mono">{selected.sku_id}</div>
              </div>
              <div className="detail-field">
                <div className="k">Category</div>
                <div className="v">{selected.category}</div>
              </div>
              <div className="detail-field">
                <div className="k">Classification</div>
                <div className="v"><ClassBadge abc={selected.abc_class} xyz={selected.xyz_class} /></div>
              </div>
              <div className="detail-field">
                <div className="k">Handling</div>
                <div className="v">{selected.handling_class}</div>
              </div>
              <div className="detail-field">
                <div className="k">On hand / reorder point</div>
                <div className="v mono">{selected.qty_on_hand} / {selected.reorder_point}</div>
              </div>
              <div className="detail-field">
                <div className="k">Lead time</div>
                <div className="v">{selected.lead_time_days} days</div>
              </div>
            </div>

            <h3 style={{ fontSize: '0.95rem', marginBottom: 10 }}>Batches (FEFO order)</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th>Received</th>
                    <th>Expiry</th>
                    <th>Qty remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBatches.length === 0 ? (
                    <tr><td colSpan={5} className="table-empty">No batches recorded.</td></tr>
                  ) : (
                    selectedBatches.map((b) => (
                      <tr key={b.lot_id}>
                        <td className="mono">{b.lot_id}</td>
                        <td className="mono">{b.received_date}</td>
                        <td className="mono">{b.expiry_date ?? '—'}</td>
                        <td className="mono">{b.qty_remaining}</td>
                        <td><BatchBadge status={b.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>

      <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} onCreate={addItem} />
    </div>
  );
}

function AddItemModal({ open, onClose, onCreate }) {
  const empty = {
    sku_id: '', name: '', category: categories[0], handling_class: 'STANDARD',
    abc_class: 'B', xyz_class: 'Y', lead_time_days: 7, shelf_life_days: 0,
    unit_price: 0, reorder_point: 10,
  };
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.sku_id || !form.name) return;
    setSubmitting(true);
    await onCreate(form);
    setSubmitting(false);
    setForm(empty);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add item">
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label>SKU</label>
            <input value={form.sku_id} onChange={update('sku_id')} placeholder="e.g. FAN-CEIL-02" required />
          </div>
          <div className="form-field">
            <label>Name</label>
            <input value={form.name} onChange={update('name')} placeholder="Item name" required />
          </div>
          <div className="form-field">
            <label>Category</label>
            <select value={form.category} onChange={update('category')}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Handling class</label>
            <select value={form.handling_class} onChange={update('handling_class')}>
              <option value="STANDARD">Standard</option>
              <option value="PERISHABLE">Perishable</option>
            </select>
          </div>
          <div className="form-field">
            <label>ABC class</label>
            <select value={form.abc_class} onChange={update('abc_class')}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>
          <div className="form-field">
            <label>XYZ class</label>
            <select value={form.xyz_class} onChange={update('xyz_class')}>
              <option value="X">X</option>
              <option value="Y">Y</option>
              <option value="Z">Z</option>
            </select>
          </div>
          <div className="form-field">
            <label>Lead time (days)</label>
            <input type="number" min="0" value={form.lead_time_days} onChange={update('lead_time_days')} />
          </div>
          <div className="form-field">
            <label>Shelf life (days, 0 = none)</label>
            <input type="number" min="0" value={form.shelf_life_days} onChange={update('shelf_life_days')} />
          </div>
          <div className="form-field">
            <label>Unit price (PHP)</label>
            <input type="number" min="0" value={form.unit_price} onChange={update('unit_price')} />
          </div>
          <div className="form-field">
            <label>Reorder point</label>
            <input type="number" min="0" value={form.reorder_point} onChange={update('reorder_point')} />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
