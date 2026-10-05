'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { ArrowLeft, Check, Copy, QrCode } from 'lucide-react';

export default function SharePage() {
  const { id } = useParams();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);
  useEffect(() => { if (id) fetchPlace(); }, [id]);
  useEffect(() => { if (place && qrRef.current) generateQR(); }, [place]);
  const fetchPlace = async () => {
    try { const res = await fetch(`/api/places/${id}`); const data = await res.json(); setPlace(data.place); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  };
  const generateQR = async () => {
    try { const QRCode = (await import('qrcode')).default; const url = `${window.location.origin}/places/${id}`; await QRCode.toCanvas(qrRef.current, url, { width: 250, margin: 2, color: { dark: '#1b4332', light: '#ffffff' } }); }
    catch (err) { console.error(err); }
  };
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/places/${id}` : '';
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch (err) { console.error(err); }
  };
  const shareFacebook = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  const shareLine = () => window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`, '_blank');

  return (
    <div className="min-h-screen bg-[#f6f4ed] text-[#20352b]">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-28">
        <Link href={`/places/${id}`} className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#68766d] transition hover:text-[#2f6b4f]"><ArrowLeft className="h-4 w-4" />กลับไปหน้ารายละเอียด</Link>
        <header className="mb-8"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#a16a2a]">ส่งต่อการเดินทาง</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">แชร์สถานที่ให้คนที่อยากไปด้วย</h1><p className="mt-3 text-[#68766d]">สแกน QR Code หรือส่งลิงก์ แล้วนัดกันออกไปค้นพบหล่มสัก</p></header>
        {loading ? <div className="h-80 animate-pulse rounded-2xl bg-[#e6eadd]" aria-label="กำลังโหลดสถานที่" /> : !place ? <div className="rounded-2xl border border-[#dfe3d9] bg-white p-8"><h2 className="text-xl font-semibold">ไม่พบสถานที่</h2><Link href="/places" className="mt-4 inline-block text-[#2f6b4f]">ค้นหาสถานที่อื่น</Link></div> :
          <section className="grid overflow-hidden rounded-2xl border border-[#dfe3d9] bg-white shadow-[0_14px_40px_rgba(32,53,43,0.07)] md:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col items-center justify-center border-b border-[#dfe3d9] bg-[#edf1e8] px-5 py-10 md:border-b-0 md:border-r"><span className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#2f6b4f]"><QrCode className="h-5 w-5" />สแกนเพื่อดูสถานที่</span><div className="max-w-full rounded-2xl border border-[#dfe3d9] bg-white p-3"><canvas ref={qrRef} className="mx-auto max-w-full" aria-label={`QR Code สำหรับ ${place.name}`} /></div><p className="mt-5 text-xs text-[#68766d]">เปิดกล้องบนโทรศัพท์เพื่อสแกน</p></div>
            <div className="flex flex-col justify-center p-6 sm:p-9"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#8a968d]">จุดหมายของคุณ</p><h2 className="text-2xl font-semibold leading-snug">{place.name}</h2><label htmlFor="share-url" className="mb-2 mt-8 text-sm font-semibold">ลิงก์สถานที่</label><input id="share-url" type="text" value={shareUrl} readOnly className="min-w-0 w-full rounded-xl border border-[#ccd7cb] bg-[#fbfcf8] px-4 py-3 text-sm text-[#68766d] outline-none focus:border-[#2f6b4f]" /><button onClick={copyLink} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2f6b4f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#24563f]" aria-live="polite">{copied ? <><Check className="h-4 w-4" />คัดลอกแล้ว</> : <><Copy className="h-4 w-4" />คัดลอกลิงก์</>}</button><div className="mt-7 border-t border-[#e7ebe3] pt-5"><p className="mb-3 text-sm text-[#68766d]">หรือแชร์ผ่าน</p><div className="grid grid-cols-2 gap-3"><button onClick={shareFacebook} className="rounded-xl border border-[#d5dfe9] bg-[#f5f8fd] px-4 py-3 text-sm font-semibold text-[#1877F2] transition hover:bg-[#eaf1fc]">Facebook</button><button onClick={shareLine} className="rounded-xl border border-[#cde4cc] bg-[#f3faf1] px-4 py-3 text-sm font-semibold text-[#25863e] transition hover:bg-[#e5f4e2]">LINE</button></div></div></div>
          </section>}
      </main>
    </div>
  );
}
