import Link from 'next/link';
import { Compass, ArrowUpRight, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="nature-footer">
      <div className="page-shell py-14 md:py-20">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div><Link href="/" className="inline-flex items-center gap-3 text-xl font-semibold"><Compass size={27} strokeWidth={1.5} /> หล่มสักทริป AI</Link><p className="mt-5 text-white/75 leading-7 max-w-sm">เดินทางให้ช้าลง มองเห็นให้มากขึ้น<br />ค้นพบธรรมชาติ วัฒนธรรม และเรื่องราวของผู้คนในอำเภอหล่มสัก จังหวัดเพชรบูรณ์</p></div>
          <div><h2 className="text-sm font-semibold mb-5 text-white/60">ออกเดินทาง</h2><div className="flex flex-col items-start gap-4"><Link href="/places" className="footer-link">สำรวจสถานที่ <ArrowUpRight size={15} /></Link><Link href="/#planner" className="footer-link">วางแผนทริป AI <ArrowUpRight size={15} /></Link><Link href="/login" className="footer-link">สำหรับเจ้าหน้าที่ <ArrowUpRight size={15} /></Link></div></div>
          <div><h2 className="text-sm font-semibold mb-5 text-white/60">เรื่องราวของพื้นที่</h2><p className="flex items-start gap-2 text-sm leading-7 text-white/85"><MapPin size={18} className="shrink-0 mt-1" /> อำเภอหล่มสัก<br />จังหวัดเพชรบูรณ์ ประเทศไทย</p><p className="mt-4 text-sm text-white/65 leading-7">ระบบแนะนำการท่องเที่ยวและวางแผนทริปด้วย AI กรณีศึกษาอำเภอหล่มสัก</p></div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/20 flex flex-wrap justify-between gap-3 text-xs text-white/65"><p>© 2026 หล่มสักทริป AI · ผู้ช่วยอัจฉริยะจัดทริปท่องเที่ยว อำเภอหล่มสัก</p><p>เคารพธรรมชาติ ใส่ใจชุมชน ในทุกการเดินทาง</p></div>
      </div>
    </footer>
  );
}
