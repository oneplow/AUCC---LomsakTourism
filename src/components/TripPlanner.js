'use client';
import { useState, useRef } from 'react';
import TripRouteMap from '@/components/TripRouteMap';
import { Sparkles, MapPin, Wallet, Clock, Navigation, Map, AlertTriangle, LocateFixed, CheckCircle, Radar, Lightbulb } from 'lucide-react';

export default function TripPlanner({ categories = [] }) {
  const [form, setForm] = useState({ days: 1, budget: 3000, start_time: '08:00', end_time: '18:00', place_types: [], radius_km: 50, location_mode: 'auto', manual_lat: '', manual_lng: '' });
  const [plan, setPlan] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [routePoints, setRoutePoints] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const resultsRef = useRef(null);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const toggleCategory = (catId) => setForm(prev => ({
    ...prev,
    place_types: prev.place_types.includes(catId) ? prev.place_types.filter(id => id !== catId) : [...prev.place_types, catId],
  }));

  const getPosition = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('unsupported'));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNote('');
    setPlan(null);
    setRoutePoints([]);

    let startLat = null, startLng = null;
    if (form.location_mode === 'auto') {
      setGpsStatus('requesting');
      try {
        const pos = await getPosition();
        startLat = pos.coords.latitude;
        startLng = pos.coords.longitude;
        setGpsStatus('granted');
      } catch {
        setGpsStatus('denied');
      }
    } else if (form.manual_lat && form.manual_lng) {
      startLat = parseFloat(form.manual_lat);
      startLng = parseFloat(form.manual_lng);
      setGpsStatus('idle');
    }
    setUserLocation(startLat && startLng ? { lat: startLat, lng: startLng } : null);

    try {
      const res = await fetch('/api/trip-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, user_lat: startLat, user_lng: startLng }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');

      const result = data.plan || {};
      setPlan(result);
      setNote(data.note || '');
      const points = (result.days || []).flatMap(day =>
        (day.activities || [])
          .map(a => ({ lat: parseFloat(a.lat), lng: parseFloat(a.lng), name: a.place }))
          .filter(p => !isNaN(p.lat) && !isNaN(p.lng))
      );
      setRoutePoints(points);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section id="planner" className="planner-section scroll-mt-20" aria-labelledby="planner-title">
        <div className="page-shell planner-layout">
          <div className="planner-intro">
            <p className="eyebrow"><span className="eyebrow-line" />01 / วางแผนทริปด้วย AI</p>
            <h2 id="planner-title">ออกแบบวันเที่ยว<br />หล่มสักในแบบของคุณ</h2>
            <ol className="planner-steps">
              <li><span>1</span>กำหนดจำนวนวัน งบประมาณ และช่วงเวลา</li>
              <li><span>2</span>เลือกจุดเริ่มต้นและรัศมีการเดินทาง</li>
              <li><span>3</span>เลือกประเภทสถานที่ที่สนใจ แล้วให้ AI จัดเส้นทาง</li>
            </ol>
          </div>

          <form onSubmit={handleSubmit} className="planner-form grid gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="field-label">
                <span className="inline-flex items-center gap-1.5"><MapPin size={14} />จำนวนวัน</span>
                <input type="number" min="1" max="7" value={form.days} onChange={e => update('days', parseInt(e.target.value) || 1)} className="nature-input" required />
              </label>
              <label className="field-label">
                <span className="inline-flex items-center gap-1.5"><Wallet size={14} />งบประมาณ (บาท)</span>
                <input type="number" min="0" step="100" value={form.budget} onChange={e => update('budget', parseInt(e.target.value) || 0)} className="nature-input" required />
              </label>
              <label className="field-label">
                <span className="inline-flex items-center gap-1.5"><Clock size={14} />เวลาเริ่มต้น</span>
                <input type="time" value={form.start_time} onChange={e => update('start_time', e.target.value)} className="nature-input" required />
              </label>
              <label className="field-label">
                <span className="inline-flex items-center gap-1.5"><Clock size={14} />เวลาสิ้นสุด</span>
                <input type="time" value={form.end_time} onChange={e => update('end_time', e.target.value)} className="nature-input" required />
              </label>
            </div>

            <div>
              <p className="form-section-title inline-flex items-center gap-1.5"><Navigation size={16} />ตำแหน่งเริ่มต้น</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" aria-pressed={form.location_mode === 'auto'} onClick={() => update('location_mode', 'auto')} className={`location-choice ${form.location_mode === 'auto' ? 'is-selected' : ''}`}><LocateFixed size={18} />ตำแหน่งปัจจุบัน</button>
                <button type="button" aria-pressed={form.location_mode === 'manual'} onClick={() => update('location_mode', 'manual')} className={`location-choice ${form.location_mode === 'manual' ? 'is-selected' : ''}`}><Map size={18} />กำหนดเอง</button>
              </div>
              {form.location_mode === 'manual' && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <input type="text" inputMode="decimal" placeholder="Latitude" aria-label="Latitude" value={form.manual_lat} onChange={e => update('manual_lat', e.target.value)} className="nature-input" />
                  <input type="text" inputMode="decimal" placeholder="Longitude" aria-label="Longitude" value={form.manual_lng} onChange={e => update('manual_lng', e.target.value)} className="nature-input" />
                </div>
              )}
            </div>

            <label className="field-label">
              <span className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5"><Radar size={14} />รัศมีการค้นหา</span>
                <span className="text-primary">{form.radius_km} กม.</span>
              </span>
              <input type="range" min="5" max="200" step="5" value={form.radius_km} onChange={e => update('radius_km', parseInt(e.target.value))} className="w-full accent-[var(--color-primary)]" />
            </label>

            {categories.length > 0 && (
              <div>
                <p className="form-section-title">ประเภทสถานที่ที่สนใจ</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button key={cat.category_id} type="button" aria-pressed={form.place_types.includes(cat.category_id)} onClick={() => toggleCategory(cat.category_id)} className={`filter-chip ${form.place_types.includes(cat.category_id) ? 'is-selected' : ''}`}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="nature-button w-full">
              {loading ? (<><span className="loading-ring" />กำลังวางแผน...</>) : (<><Sparkles size={18} />วางแผนทริป</>)}
            </button>

            {error && <p role="alert" className="flex items-center gap-2 text-sm text-danger"><AlertTriangle size={16} />{error}</p>}
            {gpsStatus === 'denied' && <p className="flex items-center gap-2 text-sm text-accent"><AlertTriangle size={16} />เข้าถึงตำแหน่งไม่ได้ ระบบจะวางแผนโดยไม่ใช้จุดเริ่มต้น</p>}
            {gpsStatus === 'granted' && <p className="flex items-center gap-2 text-sm text-success"><CheckCircle size={16} />ตรวจพบตำแหน่งของคุณแล้ว</p>}
          </form>
        </div>
      </section>

      {plan && (
        <section ref={resultsRef} className="page-shell py-16 grid gap-6" aria-labelledby="result-title">
          <div className="result-summary">
            <p className="text-xs tracking-widest uppercase opacity-70">แผนการเดินทางของคุณ</p>
            <h2 id="result-title" className="mt-2 text-2xl md:text-3xl">{plan.title}</h2>
            {plan.summary && <p className="mt-3 opacity-85 leading-relaxed">{plan.summary}</p>}
            {plan.total_budget && <p className="mt-4 font-semibold">งบประมาณรวม: {plan.total_budget}</p>}
            {note && <p className="mt-3 text-sm opacity-70">{note}</p>}
          </div>

          {routePoints.length > 0 && <TripRouteMap places={routePoints} userLocation={userLocation} />}

          {(plan.days || []).map(day => (
            <div key={day.day} className="result-panel">
              <h3 className="text-xl mb-4">วันที่ {day.day}{day.title ? ` · ${day.title}` : ''}</h3>
              <ol className="grid gap-4">
                {(day.activities || []).map((a, i) => (
                  <li key={i} className="grid grid-cols-[auto_1fr] gap-4 border-t border-border-light pt-4 first:border-0 first:pt-0">
                    <span className="text-sm font-semibold text-primary whitespace-nowrap">{a.time}</span>
                    <div>
                      <p className="font-semibold">{a.place}</p>
                      {a.description && <p className="mt-1 text-sm text-content-secondary leading-relaxed">{a.description}</p>}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-content-muted">
                        {a.cost && <span>ค่าใช้จ่าย: {a.cost}</span>}
                        {a.tips && <span className="inline-flex items-center gap-1"><Lightbulb size={12} />{a.tips}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}

          {plan.tips?.length > 0 && (
            <div className="result-panel">
              <h3 className="text-lg mb-3">เคล็ดลับการเดินทาง</h3>
              <ul className="grid gap-2 text-sm text-content-secondary list-disc pl-5">
                {plan.tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
        </section>
      )}
    </>
  );
}
