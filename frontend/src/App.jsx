import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import MobileBottomNav from './components/layout/MobileBottomNav';
import QrParamsHandler from './components/layout/QrParamsHandler';
import ProtectedRoute from './components/auth/ProtectedRoute';
import CartDrawer from './components/cart/CartDrawer';
import Toaster from './components/ui/Toaster';
import PwaInstallBanner from './components/pwa/PwaInstallBanner';
import InstallModal from './components/pwa/InstallModal';
import ErrorBoundary from './components/ui/ErrorBoundary';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import ProductDetailPage from './pages/ProductDetailPage';
import PaymentCheckoutPage from './pages/PaymentCheckoutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OrdersPage from './pages/OrdersPage';
import TrackerPage from './pages/TrackerPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import DeliveryPage from './pages/DeliveryPage';
import { useConfigStore } from './store/useConfigStore';
import { useAuthStore } from './store/useAuthStore';
import { api } from './services/api';

function NotFound() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div>
        <p className="font-display text-6xl font-extrabold text-brand-500">404</p>
        <p className="mt-2 font-semibold">This page is not on the menu.</p>
        <Link to="/" className="btn-primary mt-4">Back to home</Link>
      </div>
    </div>
  );
}

export default function App() {
  const loadConfig = useConfigStore((s) => s.load);
  const token = useAuthStore((s) => s.token);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // Refresh the saved profile on startup (also logs out automatically if the token expired)
  useEffect(() => {
    if (!token) return;
    api.get('/auth/me').then(({ data }) => useAuthStore.setState({ user: data })).catch(() => { });
  }, [token]);

  return (
    <BrowserRouter>
      <QrParamsHandler />
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] pb-20 md:pb-6">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/menu/:id" element={<ProductDetailPage />} />
            <Route path="/checkout" element={<PaymentCheckoutPage />} />
            <Route path="/payment" element={<PaymentCheckoutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/track/:orderId" element={<TrackerPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin/*" element={<AdminPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['DELIVERY_RUNNER', 'ADMIN']} />}>
              <Route path="/delivery" element={<DeliveryPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <CartDrawer />
      <MobileBottomNav />
      <Toaster />
      <PwaInstallBanner />
      <InstallModal />
    </BrowserRouter>
  );
}
