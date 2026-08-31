import { Routes, Route } from 'react-router-dom';
import { InventoryProvider } from './context/InventoryContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import Batches from './pages/Batches.jsx';
import AlertsCenter from './pages/AlertsCenter.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <InventoryProvider>
      <div className="page-shell">
        <Navbar />
        <main className="page-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/batches" element={<Batches />} />
            <Route path="/alerts" element={<AlertsCenter />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </InventoryProvider>
  );
}
