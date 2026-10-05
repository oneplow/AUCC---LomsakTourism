'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Compass, ArrowUpRight, Menu, X } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef(null);
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') { setMenuOpen(false); toggleRef.current?.focus(); }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);
  const links = [{ href: '/', label: 'หน้าแรก' }, { href: '/places', label: 'สำรวจสถานที่' }];
  const active = href => href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <nav className="nature-nav" aria-label="เมนูหลัก">
      <div className="page-shell flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" aria-label="เที่ยวหล่มสัก หน้าแรก">
          <span className="brand-mark"><Compass size={23} strokeWidth={1.5} /></span>
          <span><span className="block font-semibold text-lg text-primary-dark">เที่ยวหล่มสัก</span><span className="block text-[10px] tracking-[0.2em] text-content-secondary">LOMSAK · LOCAL JOURNEYS</span></span>
        </Link>
        <div className="hidden md:flex items-center gap-7">
          {links.map(item => <Link key={item.href} href={item.href} aria-current={active(item.href) ? 'page' : undefined} className={`nav-link ${active(item.href) ? 'is-active' : ''}`}>{item.label}</Link>)}
          <Link href="/#planner" className="nav-link" aria-current={pathname === '/#planner' ? 'page' : undefined}>วางแผนทริป AI</Link>
          <Link href="/login" className="nature-button-secondary text-sm" aria-label="เข้าสู่ระบบ" aria-current={pathname === '/login' ? 'page' : undefined}>เข้าสู่ระบบ <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
        <button ref={toggleRef} type="button" aria-label={menuOpen ? 'ปิดเมนูหลัก' : 'เปิดเมนูหลัก'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-3 rounded-lg text-primary border border-border">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
      <div id="mobile-navigation" hidden={!menuOpen} className="md:hidden border-t border-border bg-bg">
        <div className="page-shell py-4 flex flex-col gap-2">
          {links.map(item => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} aria-current={active(item.href) ? 'page' : undefined} className={`nav-link py-3 ${active(item.href) ? 'is-active' : ''}`}>{item.label}</Link>)}
          <Link href="/#planner" onClick={() => setMenuOpen(false)} className="nav-link py-3" aria-current={pathname === '/#planner' ? 'page' : undefined}>วางแผนทริป AI</Link>
          <Link href="/login" onClick={() => setMenuOpen(false)} className="nature-button" aria-label="เข้าสู่ระบบ">เข้าสู่ระบบ <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
    </nav>
  );
}
