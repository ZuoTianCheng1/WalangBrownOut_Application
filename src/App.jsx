import { Routes, Route, Navigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { InventoryProvider } from './context/InventoryContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import Batches from './pages/Batches.jsx';
import AlertsCenter from './pages/AlertsCenter.jsx';
import NotFound from './pages/NotFound.jsx';
import Login from './pages/Login.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SettingsProvider, useSettings } from './context/SettingsContext.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Serials from './pages/Serials.jsx';
import Purchasing from './pages/Purchasing.jsx';
import AuditLog from './pages/AuditLog.jsx';

function PermissionRoute({ permission, children }) {
  const { can } = useAuth();
  return can(permission) ? children : <Navigate to="/" replace />;
}

function ThemeToggle() {
  const { settings, updateSettings } = useSettings();
  const dark = settings.theme === 'dark';
  return (
    <button type="button" className="nav-icon-btn page-theme-toggle" title="Toggle theme" aria-label="Toggle theme" onClick={() => updateSettings({ theme: dark ? 'light' : 'dark' })}>
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

function ProtectedApp() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <InventoryProvider>
      <div className="page-shell">
        <Navbar />
        <main className="page-main">
          <ThemeToggle />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/batches" element={<Batches />} />
            <Route path="/serials" element={<Serials />} />
            <Route path="/purchasing" element={<PermissionRoute permission="purchasing"><Purchasing /></PermissionRoute>} />
            <Route path="/alerts" element={<AlertsCenter />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/audit" element={<PermissionRoute permission="settings"><AuditLog /></PermissionRoute>} />
            <Route path="/settings" element={<PermissionRoute permission="settings"><Settings /></PermissionRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </InventoryProvider>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();

  return (
    <div data-theme={settings.theme}>
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider><AppRoutes /></SettingsProvider>
    </AuthProvider>
  );
}