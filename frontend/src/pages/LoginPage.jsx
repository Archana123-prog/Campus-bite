import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';

const homeFor = (role) => (role === 'ADMIN' ? '/admin' : role === 'DELIVERY_RUNNER' ? '/delivery' : '/menu');

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const openCart = useCartStore((s) => s.openCart);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(form.email, form.password);
      const from = location.state?.from;
      navigate(u.role === 'CUSTOMER' ? from || '/menu' : homeFor(u.role), { replace: true });
      if (location.state?.openCart) setTimeout(openCart, 50);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-10">
      <form onSubmit={submit} className="card w-full space-y-4 p-6 shadow-xl">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Welcome back</h1>
          <p className="text-sm text-ink-500 dark:text-ink-300">Log in to order and track your food.</p>
        </div>
        {error && <p role="alert" className="rounded-lg bg-chili-500/10 px-3 py-2 text-sm font-semibold text-chili-600 dark:text-red-300">{error}</p>}
        <div>
          <label className="label" htmlFor="email">College email</label>
          <input id="email" type="email" required autoComplete="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required autoComplete="current-password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button disabled={busy} className="btn-primary w-full !py-3"><LogIn size={16} /> {busy ? 'Logging in…' : 'Log in'}</button>
        <p className="text-center text-sm text-ink-500 dark:text-ink-300">
          New here? <Link to="/register" className="font-bold text-brand-700 hover:underline dark:text-brand-400">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
