import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import StoreOrderPage from './features/production/store-order/StoreOrderPage';

import ProductionPlanningPage from './features/production/production-planning/ProductionPlanningPage';
import SalePage from './features/production/sales/SalePage';
import BatchesPage from './features/production/batches/BatchesPage';
import ReportsPage from './features/production/reports/ReportsPage';
import AdminPage from './features/admin/AdminPage';
import InternalTransferPage from './features/production/internal-transfer/InternalTransferPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <header className="topbar">
          <div className="brand">
            <div className="title">BIFL</div>
            <div className="sub">Stock Management System</div>
          </div>
          <div className="sub" style={{ color: '#CBDDF5' }}>Factory Module</div>
        </header>

        <aside className="sidebar">
          <nav className="sidebar-nav">
            <ul>
              <li>
                <div className="module-heading">Factory Module</div>
                <ul>
                  <li><NavLink to="/admin">Admin</NavLink></li>
                  <li><NavLink to="/store-orders">Store Orders</NavLink></li>
                  <li><NavLink to="/production-planning">Production Planning</NavLink></li>
                   <li><NavLink to="/batches">Batches</NavLink></li>
                  <li><NavLink to="/internal-transfer">Internal Transfer</NavLink></li>
                  <li><NavLink to="/sale">Sale</NavLink></li>
                  <li><NavLink to="/reports">Reports</NavLink></li>
                </ul>
              </li>
            </ul>
          </nav>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/" element={<Navigate replace to="/store-orders" />} />
            <Route path="/store-orders" element={<StoreOrderPage />} />
            <Route path="/production-planning" element={<ProductionPlanningPage />} />
            <Route path="/batches" element={<BatchesPage />} />
            <Route path="/internal-transfer" element={<InternalTransferPage />} />
            <Route path="/sale" element={<SalePage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
