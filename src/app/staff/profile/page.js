'use client';
import { useState, useEffect } from 'react';
import { UserCircle, Save, Lock, Mail, User } from 'lucide-react';
export default function StaffProfilePage() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ full_name: '', email: '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [message, setMessage] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          setForm({ full_name: d.user.full_name || '', email: d.user.email || '' });
        }
      });
  }, []);
  const profile = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const r = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      setMessage(r.ok ? 'อัปเดตข้อมูลสำเร็จ' : 'เกิดข้อผิดพลาด: ' + d.error);
    } catch {
      setMessage('เกิดข้อผิดพลาด');
    }
  };
  const password = async (e) => {
    e.preventDefault();
    setPwMessage('');
    if (pwForm.new_password !== pwForm.confirm) {
      setPwMessage('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }
    if (pwForm.new_password.length < 6) {
      setPwMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัว');
      return;
    }
    try {
      const r = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          current_password: pwForm.current_password,
          new_password: pwForm.new_password,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setPwMessage('เปลี่ยนรหัสผ่านสำเร็จ');
        setPwForm({ current_password: '', new_password: '', confirm: '' });
      } else setPwMessage(d.error || 'เกิดข้อผิดพลาด');
    } catch {
      setPwMessage('เกิดข้อผิดพลาด');
    }
  };
  const input =
    'min-h-11 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-content focus:outline-none focus:ring-2 focus:ring-primary/30';
  if (!user) return null;
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">ข้อมูลส่วนตัว</h2>
        <p className="mt-2 text-sm text-content-secondary">อัปเดตข้อมูลบัญชีและความปลอดภัยของคุณ</p>
      </div>
      <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
        <h3 className="flex items-center gap-2 font-semibold">
          <UserCircle className="h-5 w-5 text-primary" />
          ข้อมูลบัญชี
        </h3>
        <form onSubmit={profile} className="mt-5 space-y-5">
          <label className="block text-sm text-content-secondary">
            <span className="mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              ชื่อ-นามสกุล
            </span>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className={input}
            />
          </label>
          <label className="block text-sm text-content-secondary">
            <span className="mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              อีเมล
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={input}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90"
            >
              <Save className="h-4 w-4" />
              บันทึกข้อมูล
            </button>
            {message && (
              <span role="status" className="text-sm text-content-secondary">
                {message}
              </span>
            )}
          </div>
        </form>
      </section>
      <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
        <h3 className="flex items-center gap-2 font-semibold">
          <Lock className="h-5 w-5 text-primary" />
          เปลี่ยนรหัสผ่าน
        </h3>
        <form onSubmit={password} className="mt-5 space-y-5">
          <label className="block text-sm text-content-secondary">
            รหัสผ่านปัจจุบัน
            <input
              type="password"
              required
              value={pwForm.current_password}
              onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
              className={`${input} mt-2`}
            />
          </label>
          <label className="block text-sm text-content-secondary">
            รหัสผ่านใหม่
            <input
              type="password"
              required
              value={pwForm.new_password}
              onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
              className={`${input} mt-2`}
            />
          </label>
          <label className="block text-sm text-content-secondary">
            ยืนยันรหัสผ่านใหม่
            <input
              type="password"
              required
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              className={`${input} mt-2`}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90"
            >
              <Lock className="h-4 w-4" />
              เปลี่ยนรหัสผ่าน
            </button>
            {pwMessage && (
              <span role="status" className="text-sm text-content-secondary">
                {pwMessage}
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
