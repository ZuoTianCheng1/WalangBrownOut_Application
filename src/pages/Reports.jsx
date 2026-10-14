import { useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, Printer } from 'lucide-react';
import { useInventory } from '../context/InventoryContext.jsx';

const peso = n => `₱${Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
function csvDownload(name, rows) {
  if (!rows.length) return;
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const esc = v => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const csv = [keys.map(esc).join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
export default function Reports() {
  const { items, batches } = useInventory();
  const ready = !!items && !!batches;
  const categories = useMemo(() => ready ? Object.values(items.reduce((a,i) => {
    a[i.category] ??= { category: i.category, value: 0, quantity: 0 };
    a[i.category].value += i.qty_on_hand * i.unit_price; a[i.category].quantity += i.qty_on_hand; return a;
  }, {})) : [], [items,batches,ready]);
  const abc = useMemo(() => ready ? ['A','B','C'].map(c => ({ name: `Class ${c}`, value: items.filter(i=>i.abc_class===c).reduce((s,i)=>s+i.qty_on_hand*i.unit_price,0), count: items.filter(i=>i.abc_class===c).length })) : [], [items,ready]);
  const expiry = useMemo(() => ready ? batches.filter(b=>b.expiry_date).map(b=>({ lot_id:b.lot_id, sku_id:b.sku_id, expiry_date:b.expiry_date, status:b.status, qty_remaining:b.qty_remaining, value_lost:b.status==='expired' ? b.qty_remaining*(items.find(i=>i.sku_id===b.sku_id)?.unit_price||0) : 0 })) : [], [items,batches,ready]);
  const wasteValue = expiry.reduce((s,b)=>s+b.value_lost,0);
  const movement = ready ? batches.flatMap(b=>(b.history||[]).map(h=>({date:h.date,lot_id:b.lot_id,sku_id:b.sku_id,type:h.type,quantity:h.quantity,reason:h.reason,actor:h.actor||'System'}))) : [];
  return <div className="container-wide">
    <p className="kicker">Reporting & insight</p><h1 className="page-title">Inventory reports.</h1>
    <p className="page-lede">Exportable inventory, expiry and movement records with category and ABC-class valuation.</p>
    {!ready ? <div className="alert-loading">Preparing reports…</div> : <>
      <div className="report-toolbar"><button className="btn btn-primary" onClick={()=>csvDownload('inventory-report.csv',items.map(i=>({sku:i.sku_id,name:i.name,category:i.category,abc_class:i.abc_class,quantity:i.qty_on_hand,unit_price:i.unit_price,stock_value:i.qty_on_hand*i.unit_price,status:i.stock_status})))}><Download size={15}/> Inventory CSV</button>
      <button className="btn" onClick={()=>csvDownload('expiry-waste-report.csv',expiry)}><Download size={15}/> Expiry / waste CSV</button>
      <button className="btn" onClick={()=>csvDownload('movement-history.csv',movement)}><Download size={15}/> Movement CSV</button>
      <button className="btn btn-ghost" onClick={()=>window.print()}><Printer size={15}/> Print / Save PDF</button></div>
      <div className="report-summary-grid">
        <div className="card"><div className="kpi-label">Total inventory value</div><div className="report-number">{peso(items.reduce((s,i)=>s+i.qty_on_hand*i.unit_price,0))}</div></div>
        <div className="card"><div className="kpi-label">Expired stock value (remaining units)</div><div className="report-number danger">{peso(wasteValue)}</div><small>Calculated from expired batches × item unit price.</small></div>
        <div className="card"><div className="kpi-label">Lots with expiry dates</div><div className="report-number">{expiry.length}</div></div>
      </div>
      <div className="two-col section">
        <div className="card chart-card"><h3 className="chart-title">Stock value by category</h3><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={categories}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="category" stroke="var(--text-muted)" tick={{fontSize:10}}/><YAxis stroke="var(--text-muted)" tick={{fontSize:10}}/><Tooltip formatter={v=>peso(v)}/><Bar dataKey="value" name="Stock value" fill="var(--chart-fill)" radius={[3,3,0,0]}/></BarChart></ResponsiveContainer></div></div>
        <div className="card chart-card"><h3 className="chart-title">ABC class breakdown · stock value</h3><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={abc} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} label>{abc.map((a,i)=><Cell key={a.name} fill={['var(--chart-fill)','#3eb489','#d64550'][i]}/>)}</Pie><Tooltip formatter={v=>peso(v)}/><Legend/></PieChart></ResponsiveContainer></div></div>
      </div>
      <section className="section"><h2 className="section-heading">Expiry and waste report</h2><p className="section-note">Expired stock is valued using remaining quantity, avoiding counting already-consumed units as waste.</p><div className="table-wrap"><table className="data-table"><thead><tr><th>Lot</th><th>SKU</th><th>Expiry date</th><th>Status</th><th>Remaining</th><th>Waste value</th></tr></thead><tbody>{expiry.length ? expiry.map(b=><tr key={b.lot_id}><td className="mono">{b.lot_id}</td><td className="mono">{b.sku_id}</td><td>{b.expiry_date}</td><td>{b.status}</td><td>{b.qty_remaining}</td><td>{peso(b.value_lost)}</td></tr>) : <tr><td colSpan="6" className="table-empty">No batches have expiry dates.</td></tr>}</tbody></table></div></section>
      <section className="section"><h2 className="section-heading">Movement history</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>Date</th><th>Lot</th><th>SKU</th><th>Type</th><th>Quantity</th><th>Reason</th><th>Actor</th></tr></thead><tbody>{movement.length ? movement.map((m,i)=><tr key={`${m.lot_id}-${m.date}-${i}`}><td>{m.date}</td><td>{m.lot_id}</td><td>{m.sku_id}</td><td>{m.type}</td><td>{m.quantity}</td><td>{m.reason}</td><td>{m.actor}</td></tr>) : <tr><td colSpan="7" className="table-empty">No movement history available.</td></tr>}</tbody></table></div></section>
    </>}
  </div>;
}
