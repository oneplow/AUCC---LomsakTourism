'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, MapPin, Tag, Users, LogOut, Menu, X, ChevronRight, Compass, BarChart3 } from 'lucide-react';

const adminMenu = [
  { href: '/admin', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
  { href: '/admin/places', label: 'จัดการสถานที่', icon: MapPin },
  { href: '/admin/categories', label: 'จัดการหมวดหมู่', icon: Tag },
  { href: '/admin/users', label: 'จัดการผู้ใช้', icon: Users },
  { href: '/admin/reports', label: 'รายงาน', icon: BarChart3 },
];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleRef = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!res.ok || data.user?.role !== 'admin') { router.push('/login'); return; }
        setUser(data.user);
      } catch { router.push('/login'); }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebarRef.current?.querySelector('button')?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { setSidebarOpen(false); toggleRef.current?.focus(); }
      if (event.key === 'Tab') {
        const items = sidebarRef.current?.querySelectorAll('a, button');
        const first = items?.[0];
        const last = items?.[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown); };
  }, [sidebarOpen]);

  const closeSidebar = () => { setSidebarOpen(false); toggleRef.current?.focus(); };
  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); };
  const current = adminMenu.find(item => item.href === pathname) || adminMenu[0];
  if (!user) return <div role="status" aria-label="กำลังตรวจสอบสิทธิ์" className="flex min-h-screen items-center justify-center bg-bg"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="min-h-screen bg-bg text-content">
      <aside id="admin-sidebar" ref={sidebarRef} aria-label="เมนูผู้ดูแลระบบ" className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-white lg:visible lg:translate-x-0 ${sidebarOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}>
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="flex items-center justify-between border-b border-border px-5 py-5">
            <Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white"><Compass className="h-5 w-5" /></span><span><strong className="block text-sm">หล่มสักทริป AI</strong><small className="text-xs text-content-muted">Admin workspace</small></span></Link>
            <button aria-label="ปิดเมนู" onClick={closeSidebar} className="flex h-11 w-11 items-center justify-center rounded-xl text-content-secondary hover:bg-surface-alt lg:hidden"><X className="h-5 w-5" /></button>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            <p className="px-3 pb-2 pt-3 text-xs font-semibold text-content-muted">พื้นที่จัดการ</p>
            {adminMenu.map(item => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} onClick={() => setSidebarOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm ${active ? 'bg-primary font-semibold text-white' : 'text-content-secondary hover:bg-surface-alt hover:text-content'}`}><Icon className="h-4 w-4" /><span className="flex-1">{item.label}</span>{active && <ChevronRight className="h-4 w-4" />}</Link>;
            })}
          </nav>
          <div className="border-t border-border p-4">
            <div className="mb-3 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt text-sm font-bold text-primary">{user.full_name?.[0] || 'A'}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{user.full_name}</p><p className="text-xs text-content-muted">ผู้ดูแลระบบ</p></div></div>
            <button onClick={handleLogout} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />ออกจากระบบ</button>
          </div>
        </div>
      </aside>
      {sidebarOpen && <button aria-label="ปิดเมนู" tabIndex={-1} className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={closeSidebar} />}
      <main className="min-w-0 lg:ml-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-white px-4 py-3 sm:px-6">
          <button ref={toggleRef} aria-label="เปิดเมนู" aria-expanded={sidebarOpen} aria-controls="admin-sidebar" onClick={() => setSidebarOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-xl text-content-secondary hover:bg-surface-alt lg:hidden"><Menu className="h-5 w-5" /></button>
          <nav aria-label="เส้นทางปัจจุบัน" className="min-w-0 flex-1 text-sm text-content-secondary"><span className="hidden text-content-muted sm:inline">ผู้ดูแลระบบ / </span><span className="font-medium text-content">{current.label}</span></nav>
          <span className="hidden rounded-xl border border-border bg-surface-alt px-3 py-2 text-xs text-content-secondary sm:inline">ผู้ดูแลระบบ</span>
        </header>
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
