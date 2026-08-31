import { NavLink } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext.jsx';

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/inventory', label: 'Inventory' },
  { to: '/batches', label: 'Batches' },
  { to: '/alerts', label: 'Alerts', badge: true },
];

export default function Navbar() {
  const { alerts } = useInventory();
  const openAlerts = alerts ? alerts.filter((a) => !a.resolved).length : null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand">
          <span className="dot" />
          WalangBrownout IMS
          <span className="brand-sub">Inventory system</span>
        </NavLink>
        <div className="navbar-links">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {link.label}
              {link.badge && !!openAlerts && <span className="nav-badge">{openAlerts}</span>}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
