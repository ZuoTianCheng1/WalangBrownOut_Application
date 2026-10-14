import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, MoreHorizontal, Search, Settings as SettingsIcon } from 'lucide-react';
import { useInventory } from '../context/InventoryContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { items, batches, alerts } = useInventory();
  const { logout, user, can } = useAuth();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [menuOpen]);
  const openAlerts = alerts ? alerts.filter((a) => !a.resolved).length : null;
  const links = [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/inventory', label: 'Inventory' },
    { to: '/batches', label: 'Batches' },
    { to: '/serials', label: 'Serials' },
    ...(can('purchasing') ? [{ to: '/purchasing', label: 'Purchasing' }] : []),
    { to: '/alerts', label: 'Alerts', badge: true },
    ...(can('reports') ? [{ to: '/reports', label: 'Reports' }] : []),
    ...(can('settings') ? [{ to: '/audit', label: 'Audit log' }] : []),
  ];
  const [searchOpen, setSearchOpen] = useState(false);
  const [active, setActive] = useState(0);
  const searchRef = useRef(null);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const pages = [...links, ...(can('settings') ? [{ to: '/settings', label: 'Settings' }] : [])]
      .filter(x => x.label.toLowerCase().includes(q)).slice(0, 3).map(x => ({ type: 'Page', label: x.label, sub: 'Go to page', to: x.to }));
    const starts = (x) => (x.label.toLowerCase().startsWith(q) ? 0 : 1);
    return [
      ...pages,
      ...(items || []).filter(x => `${x.name} ${x.sku_id} ${x.category}`.toLowerCase().includes(q)).map(x => ({ type: 'Item', label: x.name, sub: [x.sku_id, x.category].filter(Boolean).join(' · '), to: '/inventory' })).sort((p, r) => starts(p) - starts(r)).slice(0, 5),
      ...(batches || []).filter(x => `Lot ${x.lot_id} ${x.sku_id}`.toLowerCase().includes(q)).slice(0, 3).map(x => ({ type: 'Batch', label: `Lot ${x.lot_id}`, sub: x.sku_id, to: '/batches' })),
      ...(alerts || []).filter(x => `${x.title} ${x.meta}`.toLowerCase().includes(q)).slice(0, 3).map(x => ({ type: 'Alert', label: x.title, sub: x.resolved ? 'Resolved alert' : 'Open alert', to: '/alerts' })),
    ].slice(0, 10);
  }, [query, items, batches, alerts, links, can]);
  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    if (!searchOpen) return undefined;
    const close = (e) => { if (!searchRef.current?.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [searchOpen]);
  const pick = (r) => { navigate(r.to); setQuery(''); setSearchOpen(false); };
  const onSearchKey = (e) => {
    if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); setSearchOpen(true); setActive(i => (i + 1) % results.length); }
    else if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); setActive(i => (i - 1 + results.length) % results.length); }
    else if (e.key === 'Enter' && results[active]) pick(results[active]);
    else if (e.key === 'Escape') setSearchOpen(false);
  };
  const highlight = (text) => {
    const q = query.trim();
    const i = q ? String(text).toLowerCase().indexOf(q.toLowerCase()) : -1;
    return i < 0 ? text : <>{String(text).slice(0, i)}<mark>{String(text).slice(i, i + q.length)}</mark>{String(text).slice(i + q.length)}</>;
  };
  return <nav className="navbar"><div className="navbar-inner">
    <NavLink to="/" className="navbar-brand"><span className="dot" />WalangBrownout<span className="brand-sub">Inventory system</span></NavLink>
    <div className="navbar-links">
      {links.map(link => <NavLink key={link.to} to={link.to} end={link.end} className={({isActive}) => `nav-link${isActive ? ' active' : ''}`}>{link.label}{link.badge && !!openAlerts && <span className="nav-badge">{openAlerts}</span>}</NavLink>)}
    </div>
    <div className="nav-tools">
      <div className="global-search" ref={searchRef}><Search size={15}/><input aria-label="Search pages, inventory, batches and alerts" role="combobox" aria-expanded={searchOpen && !!query.trim()} aria-autocomplete="list" autoComplete="off" placeholder="Search…" value={query} onChange={e => { setQuery(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onKeyDown={onSearchKey} />
        {searchOpen && query.trim() && <div className="search-results" role="listbox">{results.length ? results.map((r, i) => <button type="button" role="option" aria-selected={i === active} key={`${r.type}-${r.to}-${r.sub}-${i}`} className={i === active ? 'active' : ''} onMouseEnter={() => setActive(i)} onClick={() => pick(r)}><span className="sr-type">{r.type}</span><span className="sr-text"><strong>{highlight(r.label)}</strong><small>{highlight(r.sub)}</small></span></button>) : <div className="search-no-results">No matches for “{query.trim()}”</div>}</div>}
      </div>
      <span className="nav-user">{user?.name} · {user?.role}</span>
      <div className="nav-menu" ref={menuRef}>
        <button type="button" className="nav-icon-btn" title="More" aria-label="More options" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}><MoreHorizontal size={16}/></button>
        {menuOpen && <div className="nav-menu-panel" role="menu">
          {can('settings') && <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/settings'); }}><SettingsIcon size={15}/>Settings</button>}
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); logout(); }}><LogOut size={15}/>Sign out</button>
        </div>}
      </div>
    </div>
  </div></nav>;
}