'use client';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Shield, Key, Search } from 'lucide-react';
import Select from '@/components/Select';
import useModalScrollLock from '@/hooks/useModalScrollLock';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [places, setPlaces] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPermForm, setShowPermForm] = useState(false);
  const [showResetPw, setShowResetPw] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'staff',
  });
  const [newPassword, setNewPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState('');
  useEffect(() => {
    fetchUsers();
    fetchPlaces();
  }, []);
  const modalOpen = showForm || showPermForm || Boolean(showResetPw);
  useModalScrollLock(modalOpen);
  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data.users || []);
  };
  const fetchPlaces = async () => {
    const res = await fetch('/api/places?limit=100');
    const data = await res.json();
    setPlaces(data.places || []);
  };
  const fetchPermissions = async (uid) => {
    const res = await fetch(`/api/staff-permissions?user_id=${uid}`);
    const data = await res.json();
    setPermissions(data.permissions || []);
  };
  const resetForm = () => {
    setForm({ username: '', password: '', full_name: '', email: '', role: 'staff' });
    setEditingUser(null);
    setShowForm(false);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingUser)
      await fetch(`/api/users/${editingUser.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: form.full_name, email: form.email, role: form.role }),
      });
    else
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    fetchUsers();
    resetForm();
  };
  const handleDelete = async (id) => {
    if (!confirm('ยืนยันการลบ?')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    fetchUsers();
  };
  const handleResetPw = async (uid) => {
    if (newPassword.length < 6) {
      alert('ขั้นต่ำ 6 ตัว');
      return;
    }
    await fetch(`/api/users/${uid}/reset-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    });
    setShowResetPw(null);
    setNewPassword('');
  };
  const handleAddPerm = async () => {
    if (!selectedPlace) return;
    await fetch('/api/staff-permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selectedUser.user_id, place_id: parseInt(selectedPlace) }),
    });
    fetchPermissions(selectedUser.user_id);
    setSelectedPlace('');
  };
  const handleRemovePerm = async (pid) => {
    await fetch(`/api/staff-permissions?id=${pid}`, { method: 'DELETE' });
    fetchPermissions(selectedUser.user_id);
  };
  const filteredUsers = users.filter((u) =>
    (u.username + (u.full_name || '')).toLowerCase().includes(search.toLowerCase())
  );
  const inputClass =
    'min-h-11 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-content focus:outline-none focus:ring-2 focus:ring-primary/30';
  const buttonClass =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90';
  const closeClass =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-content-secondary hover:bg-surface-alt';
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-content">ผู้ใช้และสิทธิ์การดูแล</h1>
          <p className="mt-2 text-sm text-content-secondary">
            จัดการบัญชี บทบาท และสถานที่ที่เจ้าหน้าที่ได้รับมอบหมาย
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className={buttonClass}
        >
          <Plus className="h-4 w-4" />
          เพิ่มผู้ใช้
        </button>
      </div>
      <section className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-3 h-5 w-5 text-content-muted" />
            <input
              aria-label="ค้นหาผู้ใช้"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อหรือชื่อผู้ใช้"
              className={`${inputClass} pl-10`}
            />
          </div>
          <span className="text-sm text-content-secondary">{filteredUsers.length} ผู้ใช้</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-alt text-content-secondary">
              <tr>
                <th className="px-5 py-3 text-left font-medium">บัญชีผู้ใช้</th>
                <th className="px-5 py-3 text-left font-medium">บทบาท</th>
                <th className="px-5 py-3 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((u) => (
                <tr key={u.user_id} className="hover:bg-surface-alt">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-content">{u.username}</p>
                    <p className="mt-1 text-content-secondary">{u.full_name || '-'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="whitespace-nowrap rounded-lg bg-surface-alt px-2.5 py-1 text-xs font-medium text-primary">
                      {u.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        aria-label={`แก้ไข ${u.username}`}
                        title="แก้ไขผู้ใช้"
                        onClick={() => {
                          setEditingUser(u);
                          setForm({
                            ...form,
                            full_name: u.full_name || '',
                            email: u.email || '',
                            role: u.role,
                          });
                          setShowForm(true);
                        }}
                        className={`${closeClass} text-primary`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {u.role === 'staff' && (
                        <button
                          aria-label={`จัดการสิทธิ์ ${u.username}`}
                          title="จัดการสิทธิ์"
                          onClick={() => {
                            setSelectedUser(u);
                            fetchPermissions(u.user_id);
                            setShowPermForm(true);
                          }}
                          className={closeClass}
                        >
                          <Shield className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        aria-label={`รีเซ็ตรหัสผ่าน ${u.username}`}
                        title="รีเซ็ตรหัสผ่าน"
                        onClick={() => setShowResetPw(u.user_id)}
                        className={closeClass}
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`ลบ ${u.username}`}
                        title="ลบผู้ใช้"
                        onClick={() => handleDelete(u.user_id)}
                        className={`${closeClass} text-red-600 hover:bg-red-50`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredUsers.length && (
                <tr>
                  <td colSpan={3} className="px-5 py-14 text-center">
                    <p className="font-medium text-content">ไม่พบผู้ใช้</p>
                    <p className="mt-2 text-content-secondary">
                      ลองเปลี่ยนคำค้น หรือเพิ่มบัญชีผู้ใช้ใหม่
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-form-title"
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-white"
          >
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 id="user-form-title" className="text-lg font-semibold text-content">
                {editingUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
              </h2>
              <button aria-label="ปิดแบบฟอร์มผู้ใช้" onClick={resetForm} className={closeClass}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              {!editingUser && (
                <>
                  <label className="block text-sm text-content-secondary">
                    ชื่อผู้ใช้ *
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      required
                      className={`${inputClass} mt-2`}
                    />
                  </label>
                  <label className="block text-sm text-content-secondary">
                    รหัสผ่าน *
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      className={`${inputClass} mt-2`}
                    />
                  </label>
                </>
              )}
              <label className="block text-sm text-content-secondary">
                ชื่อ-นามสกุล
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className={`${inputClass} mt-2`}
                />
              </label>
              <label className="block text-sm text-content-secondary">
                อีเมล
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`${inputClass} mt-2`}
                />
              </label>
              <div className="block text-sm text-content-secondary">
                บทบาท
                <Select
                  label="บทบาทผู้ใช้"
                  value={form.role}
                  onChange={(role) => setForm({ ...form, role })}
                  className="mt-2"
                  options={[
                    { value: 'staff', label: 'เจ้าหน้าที่ (Staff)' },
                    { value: 'admin', label: 'ผู้ดูแลระบบ (Admin)' },
                  ]}
                />
              </div>
              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="min-h-11 rounded-xl border border-border px-4 text-sm text-content-secondary hover:bg-surface-alt"
                >
                  ยกเลิก
                </button>
                <button type="submit" className={buttonClass}>
                  {editingUser ? 'บันทึก' : 'เพิ่มผู้ใช้'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {showPermForm && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="permission-title"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border p-5">
              <div>
                <h2 id="permission-title" className="text-lg font-semibold text-content">
                  สิทธิ์ดูแลสถานที่
                </h2>
                <p className="mt-1 text-sm text-content-secondary">
                  {selectedUser.full_name || selectedUser.username}
                </p>
              </div>
              <button
                aria-label="ปิดการจัดการสิทธิ์"
                onClick={() => setShowPermForm(false)}
                className={closeClass}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-5">
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                <Select
                  label="สถานที่ที่ต้องการมอบหมาย"
                  containerClassName="min-w-0 flex-1"
                  value={selectedPlace}
                  onChange={setSelectedPlace}
                  placeholder="เลือกสถานที่"
                  searchable
                  searchPlaceholder="ค้นหาชื่อสถานที่…"
                  emptyMessage="ไม่พบสถานที่ที่ตรงกับคำค้น"
                  options={places.map((p) => ({ value: p.place_id, label: p.name }))}
                />
                <button onClick={handleAddPerm} className={`${buttonClass} shrink-0`}>
                  เพิ่มสิทธิ์
                </button>
              </div>
              <div className="divide-y divide-border">
                {permissions.map((p) => (
                  <div
                    key={p.permission_id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <span className="text-sm text-content">{p.place_name}</span>
                    <button
                      aria-label={`ถอนสิทธิ์ ${p.place_name}`}
                      onClick={() => handleRemovePerm(p.permission_id)}
                      className={`${closeClass} text-red-600`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {!permissions.length && (
                  <p className="py-8 text-center text-sm text-content-muted">
                    ยังไม่มีสถานที่ที่ได้รับมอบหมาย
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
      {showResetPw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-white p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="reset-title" className="text-lg font-semibold text-content">
                รีเซ็ตรหัสผ่าน
              </h2>
              <button
                aria-label="ปิดการรีเซ็ตรหัสผ่าน"
                onClick={() => {
                  setShowResetPw(null);
                  setNewPassword('');
                }}
                className={closeClass}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="block text-sm text-content-secondary">
              รหัสผ่านใหม่ (ขั้นต่ำ 6 ตัว)
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`${inputClass} mt-2`}
              />
            </label>
            <div className="mt-5 flex justify-end gap-3 border-t border-border pt-4">
              <button
                onClick={() => {
                  setShowResetPw(null);
                  setNewPassword('');
                }}
                className="min-h-11 rounded-xl border border-border px-4 text-sm text-content-secondary"
              >
                ยกเลิก
              </button>
              <button onClick={() => handleResetPw(showResetPw)} className={buttonClass}>
                รีเซ็ตรหัสผ่าน
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
