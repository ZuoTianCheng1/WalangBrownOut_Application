import { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Search, Sun, Moon } from 'lucide-react';
import { useInventory } from '../context/InventoryContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

export default function Navbar() {
  const { items, batches, alerts } = useInventory();
  const { logout, user, can } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const openAlerts = alerts ? alerts.filter((a) => !a.resolved).length : null;
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return [
      ...(items || []).filter(x => `${x.name} ${x.sku_id} ${x.category}`.toLowerCase().includes(q)).slice(0, 5).map(x => ({ label: x.name, sub: x.sku_id, to: '/inventory' })),
      ...(batches || []).filter(x => `${x.lot_id} ${x.sku_id}`.toLowerCase().includes(q)).slice(0, 3).map(x => ({ label: `Lot ${x.lot_id}`, sub: x.sku_id, to: '/batches' })),
      ...(alerts || []).filter(x => `${x.title} ${x.meta}`.toLowerCase().includes(q)).slice(0, 3).map(x => ({ label: x.title, sub: x.resolved ? 'Resolved alert' : 'Open alert', to: '/alerts' })),
    ].slice(0, 8);
  }, [query, items, batches, alerts]);
  const links = [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/inventory', label: 'Inventory' },
    { to: '/batches', label: 'Batches' },
    { to: '/alerts', label: 'Alerts', badge: true },
    ...(can('reports') ? [{ to: '/reports', label: 'Reports' }] : []),
    ...(can('settings') ? [{ to: '/settings', label: 'Settings' }] : []),
  ];
  return <nav className="navbar"><div className="navbar-inner">
    <NavLink to="/" className="navbar-brand"><span className="dot" />WalangBrownout<span className="brand-sub">Inventory system</span></NavLink>
    <div className="navbar-links">
      {links.map(link => <NavLink key={link.to} to={link.to} end={link.end} className={({isActive}) => `nav-link${isActive ? ' active' : ''}`}>{link.label}{link.badge && !!openAlerts && <span className="nav-badge">{openAlerts}</span>}</NavLink>)}
    </div>
    <div className="nav-tools">
      <div className="global-search"><Search size={15}/><input aria-label="Search inventory, batches and alerts" placeholder="Search all…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && results[0]) { navigate(results[0].to); setQuery(''); } }} />
        {query.trim().length >= 2 && <div className="search-results">{results.length ? results.map((r,i)=><button key={`${r.to}-${r.sub}-${i}`} onClick={()=>{navigate(r.to);setQuery('');}}><strong>{r.label}</strong><small>{r.sub}</small></button>) : <div className="search-no-results">No matches found</div>}</div>}
      </div>
      <button type="button" className="nav-icon-btn" title="Toggle theme" aria-label="Toggle theme" onClick={()=>updateSettings({theme:settings.theme==='dark'?'light':'dark'})}>{settings.theme==='dark'?<Sun size={16}/>:<Moon size={16}/>}</button>
      <span className="nav-user">{user?.name} · {user?.role}</span>
      <button type="button" className="nav-logout" onClick={logout} title="Sign out"><LogOut size={15}/><span>Sign out</span></button>
    </div>
  </div></nav>;
}
