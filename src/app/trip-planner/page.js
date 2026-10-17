'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Sparkles,
  Zap,
  AlertTriangle,
  Calendar,
  Wallet,
  Lightbulb,
  DollarSign,
} from 'lucide-react';

export default function TripPlannerPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    days: 1,
    budget: 3000,
    start_time: '08:00',
    end_time: '18:00',
    place_types: [],
  });
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => {
    fetchCategories();
  }, []);
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error(err);
    }
  };
  const toggleCategory = (catId) =>
    setForm((prev) => ({
      ...prev,
      place_types: prev.place_types.includes(catId)
        ? prev.place_types.filter((id) => id !== catId)
        : [...prev.place_types, catId],
    }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPlan(null);
    setNote('');
    try {
      const res = await fetch('/api/trip-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
        if (data.note) setNote(data.note);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const inputClass =
    'w-full rounded-xl border border-[#ccd7cb] bg-[#fbfcf8] px-4 py-3 text-[#20352b] outline-none transition focus:border-[#2f6b4f] focus:ring-2 focus:ring-[#2f6b4f]/15';
  return (
    <div className="min-h-screen bg-[#f6f4ed] text-[#20352b]">
      <Navbar />
      <header className="border-b border-[#dfe3d9] bg-[#edf1e8] px-4 pb-12 pt-28 sm:pb-16">
        <div className="mx-auto max-w-5xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#a16a2a]">
            วางแผนการเดินทาง
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            ออกแบบวันหยุดในหล่มสัก
            <br />
            <span className="text-[#2f6b4f]">ให้เป็นจังหวะของคุณ</span>
          </h1>
          <p className="mt-5 max-w-xl leading-7 text-[#68766d]">
            บอกความต้องการ แล้วให้ AI ช่วยเรียงสถานที่และเวลาให้เหมาะกับทริปของคุณ
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#dfe3d9] bg-white p-6 shadow-[0_14px_40px_rgba(32,53,43,0.07)] sm:p-8"
        >
          <div className="mb-8 flex items-center gap-3 border-b border-[#e7ebe3] pb-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2f6b4f] text-sm font-bold text-white">
              1
            </span>
            <div>
              <h2 className="text-xl font-semibold">กำหนดกรอบทริป</h2>
              <p className="text-sm text-[#68766d]">เวลาและงบประมาณที่คุณมี</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="text-sm font-semibold">
              จำนวนวัน
              <input
                type="number"
                min="1"
                max="7"
                value={form.days}
                onChange={(e) => setForm({ ...form, days: parseInt(e.target.value) })}
                className={`${inputClass} mt-2 font-normal`}
              />
            </label>
            <label className="text-sm font-semibold">
              งบประมาณ (บาท)
              <input
                type="number"
                min="500"
                step="500"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: parseInt(e.target.value) })}
                className={`${inputClass} mt-2 font-normal`}
              />
            </label>
            <label className="text-sm font-semibold">
              เวลาออกเดินทาง
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className={`${inputClass} mt-2 font-normal`}
              />
            </label>
            <label className="text-sm font-semibold">
              เวลากลับ
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className={`${inputClass} mt-2 font-normal`}
              />
            </label>
          </div>
          <div className="mt-10 border-t border-[#e7ebe3] pt-7">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2f6b4f] text-sm font-bold text-white">
                2
              </span>
              <div>
                <h2 className="text-xl font-semibold">เลือกความสนใจ</h2>
                <p className="text-sm text-[#68766d]">เลือกได้มากกว่าหนึ่งประเภท</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.category_id}
                  type="button"
                  onClick={() => toggleCategory(cat.category_id)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${form.place_types.includes(cat.category_id) ? 'border-[#2f6b4f] bg-[#2f6b4f] text-white' : 'border-[#ccd7cb] bg-[#fbfcf8] text-[#526258] hover:border-[#2f6b4f] hover:text-[#2f6b4f]'}`}
                >
                  {cat.name}
                </button>
              ))}
              {categories.length === 0 && (
                <span className="text-sm text-[#8a968d]">กำลังโหลดหมวดหมู่...</span>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-9 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2f6b4f] py-3.5 font-semibold text-white transition hover:bg-[#24563f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              'AI กำลังวางแผน...'
            ) : (
              <>
                <Zap className="h-5 w-5" />
                วางแผนทริป
              </>
            )}
          </button>
        </form>
        {note && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-[#ead9b8] bg-[#fff8e8] px-4 py-3 text-sm text-[#8a5c20]">
            <AlertTriangle className="h-4 w-4" />
            {note}
          </div>
        )}
        {plan && (
          <div className="mt-10 space-y-6">
            <div className="rounded-2xl bg-[#24563f] p-7 text-white">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#d6b36a]">
                <Sparkles className="h-4 w-4" /> แผนจาก AI
              </div>
              <h2 className="text-2xl font-semibold">{plan.title}</h2>
              <p className="mt-2 text-[#d8e1d8]">{plan.summary}</p>
              {plan.total_budget && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm">
                  <Wallet className="h-4 w-4" />
                  งบประมาณรวม: {plan.total_budget}
                </p>
              )}
            </div>
            {plan.days?.map((day) => (
              <section
                key={day.day}
                className="overflow-hidden rounded-2xl border border-[#dfe3d9] bg-white shadow-sm"
              >
                <div className="border-b border-[#dfe3d9] bg-[#edf1e8] px-6 py-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Calendar className="h-5 w-5 text-[#2f6b4f]" />
                    วันที่ {day.day}: {day.title}
                  </h3>
                </div>
                <div className="space-y-4 p-6">
                  {day.activities?.map((activity, idx) => (
                    <div key={idx} className="flex gap-4">
                      <span className="shrink-0 rounded-lg bg-[#e7efe6] px-3 py-1 text-xs font-semibold text-[#2f6b4f]">
                        {activity.time}
                      </span>
                      <div className="flex-1 border-b border-[#edf0eb] pb-4 last:border-0 last:pb-0">
                        <h4 className="font-semibold">{activity.place}</h4>
                        <p className="mt-1 text-sm leading-6 text-[#68766d]">
                          {activity.description}
                        </p>
                        {activity.cost && (
                          <p className="mt-1.5 flex items-center gap-1 text-xs text-[#8a968d]">
                            <DollarSign className="h-3 w-3" />
                            {activity.cost}
                          </p>
                        )}
                        {activity.tips && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-[#2f6b4f]">
                            <Lightbulb className="h-3 w-3" />
                            {activity.tips}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {plan.tips?.length > 0 && (
              <section className="rounded-2xl border border-[#dfe3d9] bg-white p-6">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <Lightbulb className="h-5 w-5 text-[#a16a2a]" />
                  คำแนะนำ
                </h3>
                <ul className="space-y-2 text-sm text-[#68766d]">
                  {plan.tips.map((tip, idx) => (
                    <li key={idx}>• {tip}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
