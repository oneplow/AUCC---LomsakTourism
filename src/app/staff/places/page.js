'use client';
import { useState, useEffect } from 'react';
import Select from '@/components/Select';
import { Pencil, X, MapPin, Eye, Plus, Trash2, ImagePlus } from 'lucide-react';
import useModalScrollLock from '@/hooks/useModalScrollLock';
export default function StaffPlacesPage() {
  const [places, setPlaces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingPlace, setEditingPlace] = useState(null);
  useModalScrollLock(Boolean(editingPlace));
  const [form, setForm] = useState({
    name: '',
    category_id: '',
    description: '',
    history: '',
    address: '',
    latitude: '',
    longitude: '',
    open_time: '',
    close_time: '',
    phone: '',
  });
  const [images, setImages] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  useEffect(() => {
    fetchMyPlaces();
    fetchCategories();
  }, []);
  const fetchMyPlaces = async () => {
    const me = await (await fetch('/api/auth/me')).json();
    if (!me.user) return;
    const p = await (await fetch(`/api/staff-permissions?user_id=${me.user.user_id}`)).json();
    const d = await Promise.all(
      (p.permissions || []).map(
        async (x) => (await (await fetch(`/api/places/${x.place_id}`)).json()).place
      )
    );
    setPlaces(d.filter(Boolean));
  };
  const fetchCategories = async () => {
    const d = await (await fetch('/api/categories')).json();
    setCategories(d.categories || []);
  };
  const fetchImages = async (id) => {
    const d = await (await fetch(`/api/places/${id}/images`)).json();
    setImages(d.images || []);
  };
  const close = () => {
    setEditingPlace(null);
    setImages([]);
    setNewImageUrl('');
  };
  const openEdit = (p) => {
    setForm({
      name: p.name || '',
      category_id: p.category_id || '',
      description: p.description || '',
      history: p.history || '',
      address: p.address || '',
      latitude: p.latitude || '',
      longitude: p.longitude || '',
      open_time: p.open_time || '',
      close_time: p.close_time || '',
      phone: p.phone || '',
    });
    setEditingPlace(p);
    fetchImages(p.place_id);
  };
  const addImage = async () => {
    if (!newImageUrl.trim()) return;
    await fetch(`/api/places/${editingPlace.place_id}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: newImageUrl.trim() }),
    });
    setNewImageUrl('');
    fetchImages(editingPlace.place_id);
  };
  const deleteImage = async (id) => {
    if (!confirm('ยืนยันการลบรูปภาพ?')) return;
    await fetch(`/api/places/${editingPlace.place_id}/images?image_id=${id}`, { method: 'DELETE' });
    fetchImages(editingPlace.place_id);
  };
  const submit = async (e) => {
    e.preventDefault();
    await fetch(`/api/places/${editingPlace.place_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    close();
    fetchMyPlaces();
  };
  const input =
    'min-h-11 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-content focus:outline-none focus:ring-2 focus:ring-primary/30';
  const primary =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90';
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">สถานที่ของฉัน</h2>
        <p className="mt-2 text-sm text-content-secondary">
          แก้ไขข้อมูลเฉพาะสถานที่ที่ได้รับมอบหมาย ({places.length} แห่ง)
        </p>
      </div>
      <section className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-alt text-content-secondary">
              <tr>
                <th className="px-5 py-3 text-left font-medium">สถานที่ / หมวดหมู่</th>
                <th className="px-5 py-3 text-center font-medium">เข้าชม</th>
                <th className="px-5 py-3 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {places.map((p) => (
                <tr key={p.place_id} className="hover:bg-surface-alt">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="mt-1 text-xs text-content-secondary">
                          {p.category_name || '-'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center text-content-secondary">
                    {p.visit_count || 0}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      aria-label={`แก้ไข ${p.name}`}
                      onClick={() => openEdit(p)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="hidden sm:inline">แก้ไข</span>
                    </button>
                  </td>
                </tr>
              ))}
              {!places.length && (
                <tr>
                  <td colSpan={3} className="px-5 py-14 text-center text-content-secondary">
                    ยังไม่มีสถานที่ที่ได้รับมอบหมาย
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {editingPlace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-place-title"
            className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-white"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white p-5">
              <h2 id="staff-place-title" className="text-lg font-semibold">
                แก้ไข: {editingPlace.name}
              </h2>
              <button
                aria-label="ปิดแบบฟอร์มสถานที่"
                onClick={close}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-content-secondary hover:bg-surface-alt"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-6 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-content-secondary sm:col-span-2">
                  ชื่อ
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={`${input} mt-2`}
                  />
                </label>
                <div className="block text-sm text-content-secondary">
                  หมวดหมู่
                  <Select
                    label="หมวดหมู่สถานที่"
                    value={form.category_id}
                    onChange={(category_id) => setForm({ ...form, category_id })}
                    placeholder="--"
                    className="mt-2"
                    options={[
                      { value: '', label: '--' },
                      ...categories.map((c) => ({ value: c.category_id, label: c.name })),
                    ]}
                  />
                </div>
                <label className="block text-sm text-content-secondary">
                  โทรศัพท์
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={`${input} mt-2`}
                  />
                </label>
                <label className="block text-sm text-content-secondary sm:col-span-2">
                  ที่อยู่
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className={`${input} mt-2`}
                  />
                </label>
                {[
                  ['latitude', 'ละติจูด', 'number'],
                  ['longitude', 'ลองจิจูด', 'number'],
                  ['open_time', 'เวลาเปิด', 'time'],
                  ['close_time', 'เวลาปิด', 'time'],
                ].map(([k, l, t]) => (
                  <label key={k} className="block text-sm text-content-secondary">
                    {l}
                    <input
                      type={t}
                      step={t === 'number' ? 'any' : undefined}
                      value={form[k]}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      className={`${input} mt-2`}
                    />
                  </label>
                ))}
                {[
                  ['description', 'รายละเอียด'],
                  ['history', 'ประวัติ'],
                ].map(([k, l]) => (
                  <label key={k} className="block text-sm text-content-secondary sm:col-span-2">
                    {l}
                    <textarea
                      rows={3}
                      value={form[k]}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      className={`${input} mt-2`}
                    />
                  </label>
                ))}
              </div>
              <section className="border-t border-border pt-5">
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  <ImagePlus className="h-5 w-5 text-primary" />
                  รูปภาพสถานที่
                </h3>
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((img) => (
                    <div
                      key={img.image_id}
                      className="relative aspect-video overflow-hidden rounded-xl border border-border"
                    >
                      <img
                        src={img.image_url}
                        alt="รูปภาพสถานที่"
                        className="h-full w-full object-cover"
                      />
                      <button
                        aria-label="ลบรูปภาพ"
                        type="button"
                        onClick={() => deleteImage(img.image_id)}
                        className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="url"
                    aria-label="URL รูปภาพ"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://... URL รูปภาพ"
                    className={input}
                  />
                  <button type="button" onClick={addImage} className={`${primary} shrink-0`}>
                    <Plus className="h-4 w-4" />
                    เพิ่มรูป
                  </button>
                </div>
              </section>
              <div className="flex justify-end gap-3 border-t border-border pt-5">
                <button
                  type="button"
                  onClick={close}
                  className="min-h-11 rounded-xl border border-border px-5 text-sm text-content-secondary"
                >
                  ยกเลิก
                </button>
                <button type="submit" className={primary}>
                  บันทึก
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
