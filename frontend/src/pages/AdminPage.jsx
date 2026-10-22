import React from 'react';
import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { ChefHat, LayoutDashboard, UtensilsCrossed, QrCode, Users } from 'lucide-react';
import KitchenKDS from '../components/admin/KitchenKDS';
import AdminDashboard from '../components/admin/AdminDashboard';
import MenuManager from '../components/admin/MenuManager';
import TableQRGenerator from '../components/admin/TableQRGenerator';
import StaffManager from '../components/admin/StaffManager';

const tabs = [
  { to: '/admin', end: true, label: 'Live orders', icon: ChefHat },
  { to: '/admin/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/menu', label: 'Menu & stock', icon: UtensilsCrossed },
  { to: '/admin/tables', label: 'Table QR', icon: QrCode },
  { to: '/admin/team', label: 'Team', icon: Users },
];

export default function AdminPage() {
  return (
    <div className="w-full overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <nav
          className="mb-4 flex gap-1.5 overflow-x-auto scrollbar-none pb-1"
          aria-label="Admin sections"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {tabs.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `btn shrink-0 !rounded-full !px-4 !py-2 text-sm ${
                  isActive
                    ? 'bg-ink-900 text-white'
                    : 'bg-white text-ink-600 ring-1 ring-ink-200'
                }`
              }
            >
              <Icon size={15} /> {label}
            </NavLink>
          ))}
        </nav>
        <Routes>
          <Route index element={<KitchenKDS />} />
          <Route path="overview" element={<AdminDashboard />} />
          <Route path="menu" element={<MenuManager />} />
          <Route path="tables" element={<TableQRGenerator />} />
          <Route path="team" element={<StaffManager />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  );
}
