import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, Trash2, ShieldCheck, Bike } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';
import Spinner from '../ui/Spinner';

const EMPTY = { fullName: '', email: '', phone: '', password: '', role: 'DELIVERY_RUNNER' };

export default function StaffManager() {
  const me = useAuthStore((s) => s.user);
  const [staff, setStaff] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get('/admin/staff').then(({ data }) => setStaff(data)).catch((e) => { toast.error(e.message); setStaff([]); });
  }, []);
  useEffect(load, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/admin/staff', form);
      toast.success('Account created.');
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s) => {
    if (!window.confirm(`Remove ${s.fullName}?`)) return;
    try {
      await api.delete(`/admin/staff/${s.id}`);
      toast.success('Removed.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <form onSubmit={create} className="card space-y-3 p-5">
        <h2 className="font-display text-xl font-bold">Add canteen staff</h2>
        <p className="text-xs text-ink-500 dark:text-ink-300">Delivery runners can see ready hostel orders and accept them. Admins run the kitchen.</p>
        <input required className="input" placeholder="Full name" value={form.fullName} onChange={set('fullName')} />
        <input required type="email" className="input" placeholder="Email" value={form.email} onChange={set('email')} />
        <input required className="input" placeholder="Phone" value={form.phone} onChange={set('phone')} />
        <input required minLength={6} type="password" className="input" placeholder="Temporary password" value={form.password} onChange={set('password')} />
        <select className="input" value={form.role} onChange={set('role')} aria-label="Role">
          <option value="DELIVERY_RUNNER">Delivery runner</option>
          <option value="ADMIN">Admin / kitchen</option>
        </select>
        <button disabled={busy} className="btn-primary w-full"><UserPlus size={16} /> Create account</button>
      </form>

      <section className="card divide-y divide-ink-100 dark:divide-ink-800">
        <h2 className="p-4 font-display text-xl font-bold">Team</h2>
        {!staff ? <Spinner /> : staff.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-100 dark:bg-ink-800">
              {s.role === 'ADMIN' ? <ShieldCheck size={18} /> : <Bike size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{s.fullName} {s.id === me?.id && <span className="text-xs font-normal text-ink-400 dark:text-ink-300">(you)</span>}</p>
              <p className="truncate text-xs text-ink-400 dark:text-ink-300">{s.email} · {s.phone}</p>
            </div>
            <span className="chip bg-ink-100 dark:bg-ink-800">{s.role === 'ADMIN' ? 'Admin' : 'Runner'}</span>
            {s.id !== me?.id && (
              <button onClick={() => remove(s)} className="rounded-lg p-2 text-chili-500 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label={`Remove ${s.fullName}`}><Trash2 size={16} /></button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
