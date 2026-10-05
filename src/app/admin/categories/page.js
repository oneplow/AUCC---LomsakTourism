'use client';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Tag, Search } from 'lucide-react';
import useModalScrollLock from '@/hooks/useModalScrollLock';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => { fetchCategories(); }, []);
  useModalScrollLock(showForm);
  const fetchCategories = async () => {
    try { const res = await fetch('/api/categories'); const data = await res.json(); setCategories(data.categories || []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  const resetForm = () => { setName(''); setEditingCat(null); setShowForm(false); };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingCat ? `/api/categories/${editingCat.category_id}` : '/api/categories';
      const method = editingCat ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      fetchCategories(); resetForm();
    } catch (err) { console.error(err); }
  };
  const handleDelete = async (id) => {
    if (!confirm('ยืนยันการลบหมวดหมู่?')) return;
    try { await fetch(`/api/categories/${id}`, { method: 'DELETE' }); fetchCategories(); }
    catch (err) { console.error(err); }
  };
  const filtered = categories.filter(cat => cat.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold text-content">หมวดหมู่สถานที่</h1><p className="mt-2 text-sm text-content-secondary">จัดระเบียบสถานที่เพื่อให้นักท่องเที่ยวค้นพบสิ่งที่สนใจได้ง่ายขึ้น</p></div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"><Plus className="h-4 w-4" />เพิ่มหมวดหมู่</button>
      </div>
      <section className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><label className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-3 h-5 w-5 text-content-muted" /><input aria-label="ค้นหาหมวดหมู่" value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาหมวดหมู่" className="min-h-11 w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-sm text-content focus:outline-none focus:ring-2 focus:ring-primary/30" /></label><span className="text-sm text-content-secondary">{filtered.length} หมวดหมู่</span></div>
        <ul className="divide-y divide-border">
          {filtered.map(cat => <li key={cat.category_id} className="flex items-center justify-between gap-3 p-4 sm:px-6 hover:bg-surface-alt"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-alt text-primary"><Tag className="h-5 w-5" /></span><span className="break-words text-sm font-semibold text-content">{cat.name}</span></div><div className="flex shrink-0 gap-2"><button aria-label={`แก้ไข ${cat.name}`} onClick={() => { setEditingCat(cat); setName(cat.name); setShowForm(true); }} className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm text-primary hover:bg-white"><Pencil className="h-4 w-4" /><span className="hidden sm:inline">แก้ไข</span></button><button aria-label={`ลบ ${cat.name}`} onClick={() => handleDelete(cat.category_id)} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></li>)}
        </ul>
        {loading && <p role="status" className="py-12 text-center text-sm text-content-muted">กำลังโหลดหมวดหมู่...</p>}
        {!loading && !filtered.length && <div className="px-4 py-14 text-center"><Tag className="mx-auto mb-3 h-8 w-8 text-content-muted" /><h2 className="font-semibold text-content">{search ? 'ไม่พบหมวดหมู่ที่ค้นหา' : 'ยังไม่มีหมวดหมู่'}</h2><p className="mt-2 text-sm text-content-secondary">{search ? 'ลองใช้คำค้นอื่น หรือล้างคำค้นเพื่อดูทั้งหมด' : 'เริ่มต้นด้วยการเพิ่มหมวดหมู่สถานที่ใหม่'}</p></div>}
      </section>
      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="category-form-title" className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-white"><div className="flex items-center justify-between gap-3 border-b border-border p-5"><h2 id="category-form-title" className="text-lg font-semibold text-content">{editingCat ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</h2><button aria-label="ปิดแบบฟอร์มหมวดหมู่" onClick={resetForm} className="flex h-11 w-11 items-center justify-center rounded-xl text-content-secondary hover:bg-surface-alt"><X className="h-5 w-5" /></button></div><form onSubmit={handleSubmit} className="space-y-5 p-5"><div><label htmlFor="category-name" className="mb-2 block text-sm font-medium text-content-secondary">ชื่อหมวดหมู่ *</label><input id="category-name" autoFocus type="text" value={name} onChange={e => setName(e.target.value)} required className="min-h-11 w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-content focus:outline-none focus:ring-2 focus:ring-primary/30" /></div><div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4"><button type="button" onClick={resetForm} className="min-h-11 rounded-xl border border-border px-4 text-sm text-content-secondary hover:bg-surface-alt">ยกเลิก</button><button type="submit" className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90">{editingCat ? 'บันทึกการแก้ไข' : 'เพิ่มหมวดหมู่'}</button></div></form></section></div>}
    </div>
  );
}
