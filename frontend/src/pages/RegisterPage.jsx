import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useConfigStore } from '../store/useConfigStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const register = useAuthStore((s) => s.register);
  const hostelBlocks = useConfigStore((s) => s.hostelBlocks);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', hostelBlock: '', roomNumber: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/menu" replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
      navigate('/menu', { replace: true });
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
          <h1 className="font-display text-2xl font-extrabold">Create your account</h1>
          <p className="text-sm text-ink-500 dark:text-ink-300">For students and staff. Takes under a minute.</p>
        </div>
        {error && <p role="alert" className="rounded-lg bg-chili-500/10 px-3 py-2 text-sm font-semibold text-chili-600 dark:text-red-300">{error}</p>}
        <div>
          <label className="label" htmlFor="fullName">Full name</label>
          <input id="fullName" required className="input" value={form.fullName} onChange={set('fullName')} autoComplete="name" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" value={form.email} onChange={set('email')} autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" type="tel" required className="input" value={form.phone} onChange={set('phone')} autoComplete="tel" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="password">Password (min 6 characters)</label>
          <input id="password" type="password" required minLength={6} className="input" value={form.password} onChange={set('password')} autoComplete="new-password" />
        </div>
        <div className="rounded-xl bg-ink-50 p-3 dark:bg-ink-800">
          <p className="mb-2 text-xs font-semibold text-ink-500 dark:text-ink-300">Staying in a hostel? Save your address for faster delivery (optional).</p>
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <select className="input" value={form.hostelBlock} onChange={set('hostelBlock')} aria-label="Hostel block">
              <option value="">Day scholar / staff</option>
              {hostelBlocks.map((b) => <option key={b}>{b}</option>)}
            </select>
            <input className="input" placeholder="Room" maxLength={10} value={form.roomNumber} onChange={set('roomNumber')} aria-label="Room number" disabled={!form.hostelBlock} />
          </div>
        </div>
        <button disabled={busy} className="btn-primary w-full !py-3"><UserPlus size={16} /> {busy ? 'Creating…' : 'Create account'}</button>
        <p className="text-center text-sm text-ink-500">
          Already registered? <Link to="/login" className="font-bold text-brand-700 hover:underline dark:text-brand-400">Log in</Link>
        </p>
      </form>
    </div>
  );
}
