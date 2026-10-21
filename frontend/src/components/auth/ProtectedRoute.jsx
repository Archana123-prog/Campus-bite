import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

/** Redirects guests to /login and users without a permitted role to the home page. */
export default function ProtectedRoute({ allowedRoles = [] }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!token || !user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
