import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Star, Eye, EyeOff, FolderPlus } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from '../../store/useToastStore';
import { rupees } from '../../utils/format';
import FoodImage from '../ui/FoodImage';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import VegMark from '../ui/VegMark';

const EMPTY = { name: '', description: '', price: '', categoryId: '', imageUrl: '', prepTimeMins: 10, isVeg: true, isFeatured: false };

export default function MenuManager() {
  const [items, setItems] = useState(null);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null); // item object | EMPTY | null
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const load = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([api.get('/menu'), api.get('/menu/categories')]);
      setItems(m.data);
      setCategories(c.data);
    } catch (e) {
      toast.error(e.message);
      setItems((i) => i ?? []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm({ ...EMPTY, categoryId: categories[0]?.id || '' }); setEditing('new'); };
  const openEdit = (item) => {
    setForm({
      name: item.name, description: item.description || '', price: String(Number(item.price)),
      categoryId: item.categoryId, imageUrl: item.imageUrl || '', prepTimeMins: item.prepTimeMins,
      isVeg: item.isVeg, isFeatured: item.isFeatured,
    });
    setEditing(item);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing === 'new') await api.post('/admin/menu-items', form);
      else await api.put(`/admin/menu-items/${editing.id}`, form);
      toast.success(editing === 'new' ? 'Dish added.' : 'Dish updated.');
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item, what) => {
    try {
      const { data, message } = await api.patch(`/menu/${item.id}/toggle-${what}`);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...data } : i)));
      toast.success(message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete “${item.name}”?`)) return;
    try {
      const { message } = await api.delete(`/admin/menu-items/${item.id}`);
      toast.success(message);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      await api.post('/admin/categories', { name: newCategory });
      setNewCategory('');
      toast.success('Category created.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (!items) return <Spinner />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold">Menu & stock</h2>
          <p className="text-sm text-ink-500 dark:text-ink-300">Mark dishes sold out the moment they run out. Customers see it live.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form onSubmit={addCategory} className="flex gap-1.5">
            <input className="input !w-40" placeholder="New category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} aria-label="New category name" />
            <button className="btn-ghost !px-3" aria-label="Add category"><FolderPlus size={16} /></button>
          </form>
          <button onClick={openNew} disabled={categories.length === 0} className="btn-primary"><Plus size={16} /> Add dish</button>
        </div>
      </div>

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {items.length === 0 && <p className="p-8 text-center text-sm text-ink-400">No dishes yet. Add a category, then your first dish.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-3 p-3">
            <FoodImage src={item.imageUrl} alt={item.name} className="h-14 w-14 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 basis-40">
              <p className="flex items-center gap-1.5 font-bold"><VegMark isVeg={item.isVeg} /> <span className="truncate">{item.name}</span></p>
              <p className="text-xs text-ink-400">{item.category?.name} · {rupees(item.price)} · ~{item.prepTimeMins} min</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toggle(item, 'stock')}
                className={`chip !px-3 !py-1.5 ${item.isAvailable ? 'bg-leaf-500/15 text-leaf-600 dark:text-emerald-300' : 'bg-chili-500/15 text-chili-600 dark:text-red-300'}`}
                title="Toggle availability"
              >
                {item.isAvailable ? <Eye size={13} /> : <EyeOff size={13} />} {item.isAvailable ? 'In stock' : 'Sold out'}
              </button>
              <button
                onClick={() => toggle(item, 'featured')}
                className={`rounded-lg p-2 ${item.isFeatured ? 'bg-brand-500 text-ink-950' : 'bg-ink-100 text-ink-400 dark:bg-ink-800'}`}
                title={item.isFeatured ? 'Shown in home swipe stack' : 'Add to home swipe stack'}
                aria-label="Toggle home special"
              >
                <Star size={15} fill={item.isFeatured ? 'currentColor' : 'none'} />
              </button>
              <button onClick={() => openEdit(item)} className="rounded-lg bg-ink-100 p-2 dark:bg-ink-800" aria-label={`Edit ${item.name}`}><Pencil size={15} /></button>
              <button onClick={() => remove(item)} className="rounded-lg bg-ink-100 p-2 text-chili-500 dark:bg-ink-800" aria-label={`Delete ${item.name}`}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add a dish' : 'Edit dish'}>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="label" htmlFor="m-name">Name</label>
            <input id="m-name" required className="input" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="label" htmlFor="m-desc">Description</label>
            <textarea id="m-desc" rows={2} className="input resize-none" value={form.description} onChange={set('description')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="m-price">Price (₹)</label>
              <input id="m-price" required type="number" min="1" step="0.5" className="input" value={form.price} onChange={set('price')} />
            </div>
            <div>
              <label className="label" htmlFor="m-prep">Prep (min)</label>
              <input id="m-prep" type="number" min="1" max="120" className="input" value={form.prepTimeMins} onChange={set('prepTimeMins')} />
            </div>
            <div>
              <label className="label" htmlFor="m-cat">Category</label>
              <select id="m-cat" required className="input" value={form.categoryId} onChange={set('categoryId')}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="m-img">Image URL</label>
            <input id="m-img" type="url" placeholder="https://…" className="input" value={form.imageUrl} onChange={set('imageUrl')} />
          </div>
          <div className="flex gap-5 text-sm font-semibold">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isVeg} onChange={set('isVeg')} className="accent-brand-500" /> Vegetarian</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} className="accent-brand-500" /> Home special</label>
          </div>
          <button disabled={saving} className="btn-primary w-full !py-3">{saving ? 'Saving…' : 'Save dish'}</button>
        </form>
      </Modal>
    </div>
  );
}
