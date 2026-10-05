'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      router.push(data.user.role === 'admin' ? '/admin' : '/staff');
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f4ed] text-[#20352b] lg:grid lg:grid-cols-2">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#173d2d] px-12 py-14 text-[#f8f5eb] lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-20" aria-hidden="true">
          <div className="absolute -left-24 top-24 h-80 w-80 rounded-full border border-[#d6b36a]" />
          <div className="absolute bottom-20 right-12 h-56 w-56 rounded-full border border-[#d6b36a]" />
          <div className="absolute bottom-0 left-1/3 h-1/2 w-px bg-[#d6b36a]/40" />
        </div>
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d6b36a]/60 text-[#d6b36a]">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v18m0-14 6-3m-6 7 7-3m-7 7 5-2m-5-9-5-3m5 8-6-3m6 8-4-2" /></svg>
          </div>
          <span className="text-2xl font-semibold tracking-tight">เที่ยวหล่มสัก</span>
        </div>
        <div className="relative max-w-lg">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.25em] text-[#d6b36a]">Lomsak Tourism · Staff portal</p>
          <h1 className="text-4xl font-semibold leading-tight xl:text-5xl">ดูแลเรื่องราวของหล่มสักให้เดินทางต่อไป</h1>
          <p className="mt-6 max-w-md leading-7 text-[#d8e1d8]">พื้นที่สำหรับเจ้าหน้าที่จัดการข้อมูลสถานที่ท่องเที่ยว ให้ข้อมูลท้องถิ่นชัดเจนและน่าเชื่อถือสำหรับผู้มาเยือน</p>
        </div>
        <p className="relative text-sm text-[#b9cbbd]">ระบบจัดการสถานที่ท่องเที่ยว และข้อมูลเจ้าหน้าที่ส่วนภูมิภาค</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 text-xl font-semibold text-[#173d2d]">เที่ยวหล่มสัก</Link>
          </div>
          <div className="mb-8">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-[#a16a2a]">ยินดีต้อนรับกลับมา</p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#20352b]">เข้าสู่ระบบเจ้าหน้าที่</h2>
            <p className="mt-3 text-sm leading-6 text-[#68766d]">กรอกข้อมูลเพื่อเข้าสู่แผงควบคุมการจัดการข้อมูล</p>
          </div>
          {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-[#dfe3d9] bg-white p-6 shadow-[0_14px_40px_rgba(32,53,43,0.08)] sm:p-8">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#20352b]">ชื่อผู้ใช้</label>
              <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full rounded-xl border border-[#cfd8ce] bg-[#fbfcf8] px-4 py-3 text-sm text-[#20352b] outline-none transition focus:border-[#2f6b4f] focus:ring-2 focus:ring-[#2f6b4f]/15" placeholder="กรอกชื่อผู้ใช้ของคุณ" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#20352b]">รหัสผ่าน</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border border-[#cfd8ce] bg-[#fbfcf8] px-4 py-3 text-sm text-[#20352b] outline-none transition focus:border-[#2f6b4f] focus:ring-2 focus:ring-[#2f6b4f]/15" placeholder="กรอกรหัสผ่าน" required />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#2f6b4f] py-3.5 text-sm font-semibold text-white transition hover:bg-[#24563f] disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</button>
          </form>
          <div className="mt-7 text-center"><Link href="/" className="text-sm font-medium text-[#68766d] transition hover:text-[#2f6b4f]">← กลับหน้าแรก</Link></div>
        </div>
      </section>
    </main>
  );
}
