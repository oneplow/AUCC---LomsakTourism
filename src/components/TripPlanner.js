'use client';
import { useState, useEffect, useRef } from 'react';
import TripRouteMap from '@/components/TripRouteMap';
import { Sparkles, MapPin, Wallet, ArrowRight, Navigation, Map, AlertTriangle, LocateFixed, CheckCircle, Radar } from 'lucide-react';

export default function TripPlanner({ categories, allPlaces }) {
  const [form, setForm] = useState({ days: 1, budget: 3000, start_time: '08:00', end_time: '18:00', place_types: [], radius_km: 50, location_mode: 'auto', manual_lat: '', manual_lng: '' });
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [routePoints, setRoutePoints] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const resultsRef = useRef(null);

  const toggleCategory = (catId) => setForm(prev => ({ ...prev, place_types: prev.place_types.includes(catId) ? prev.place_types.filter(id => id !== catId) : [...prev.place_types, catId] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPlan(null);
    setRoutePoints([]);
    setUserLocation(null);
    setGpsStatus('idle');
    let startLat = null, startLng = null;
    if (form.location_mode === 'auto') {
      if (navigator.geolocation) {
        setGpsStatus('requesting');
        try {
          const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }));
          startLat = pos.coords.latitude;
          startLng = pos.coords.longitude;
          setUserLocation({ lat: startLat, lng: startLng });
          setGpsStatus('granted');
        } catch {
          setGpsStatus('denied');
        }
      } else {
        setGpsStatus('denied');
      }
    } else if (form.manual_lat && form.manual_lng) {
      startLat = parseFloat(form.manual_lat);
      startLng = parseFloat(form.manual_lng);
      setUserLocation({ lat: startLat, lng: startLng });
    }
    try {
      const res = await fetch('/api/trip-planner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, user_lat: startLat, user_lng: startLng }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
      setPlan(data);
      const points = data.days.flatMap(day => day.places.map(p => ({ lat: parseFloat(p.latitude), lng: parseFloat(p.longitude), name: p.place_name })));
      setRoutePoints(points);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (form.location_mode === 'auto' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => {}, { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 });
    }
  }, [form.location_mode]);

  return (
    <div className="trip-planner-container">
      <div className="trip-planner-hero">
        <div className="hero-content">
          <Sparkles className="hero-icon" />
          <h1 className="hero-title">วางแผนทริปอัจฉริยะ</h1>
          <p className="hero-subtitle">ให้ AI ช่วยวางแผนการเดินทางที่เหมาะกับคุณ</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="planner-form">
        <div className="form-row">
          <div className="form-field">
            <label className="form-label"><MapPin className="label-icon" />จำนวนวัน</label>
            <input type="number" min="1" max="7" value={form.days} onChange={e => setForm({ ...form, days: parseInt(e.target.value) || 1 })} className="form-input" required />
          </div>
          <div className="form-field">
            <label className="form-label"><Wallet className="label-icon" />งบประมาณ (บาท)</label>
            <input type="number" min="0" step="100" value={form.budget} onChange={e => setForm({ ...form, budget: parseInt(e.target.value) || 0 })} className="form-input" required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label">เวลาเริ่มต้น</label>
            <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="form-input" required />
          </div>
          <div className="form-field">
            <label className="form-label">เวลาสิ้นสุด</label>
            <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="form-input" required />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label"><Navigation className="label-icon" />ตำแหน่งเริ่มต้น</label>
          <div className="location-selector">
            <button type="button" onClick={() => setForm({ ...form, location_mode: 'auto' })} className={`location-choice ${form.location_mode === 'auto' ? 'is-selected' : ''}`}><LocateFixed size={18} />ตำแหน่งปัจจุบัน</button>
            <button type="button" onClick={() => setForm({ ...form, location_mode: 'manual' })} className={`location-choice ${form.location_mode === 'manual' ? 'is-selected' : ''}`}><Map size={18} />กำหนดเอง</button>
          </div>
          {form.location_mode === 'manual' && (
            <div className="manual-location">
              <input type="text" placeholder="Latitude" value={form.manual_lat} onChange={e => setForm({ ...form, manual_lat: e.target.value })} className="form-input" />
              <input type="text" placeholder="Longitude" value={form.manual_lng} onChange={e => setForm({ ...form, manual_lng: e.target.value })} className="form-input" />
            </div>
          )}
        </div>

        <div className="form-field">
          <label className="form-label"><Radar className="label-icon" />รัศมีการค้นหา (กม.)</label>
          <input type="number" min="1" max="200" value={form.radius_km} onChange={e => setForm({ ...form, radius_km: parseInt(e.target.value) || 50 })} className="form-input" />
        </div>

        <div className="form-field">
          <label className="form-label">ประเภทสถานที่ที่สนใจ</label>
          <div className="category-grid">
            {categories.map(cat => (
              <button key={cat.category_id} type="button" onClick={() => toggleCategory(cat.category_id)} className={`filter-chip w-full justify-center text-center ${form.place_types.includes(cat.category_id) ? 'is-selected' : ''}`}>{cat.category_name}</button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className="submit-btn">{loading ? 'กำลังวางแผน...' : (<><Sparkles size={20} />วางแผนทริป</>)}</button>
      </form>

      {error && <div className="error-box"><AlertTriangle size={20} />{error}</div>}
      {gpsStatus === 'denied' && <div className="warning-box"><AlertTriangle size={18} />ไม่สามารถเข้าถึงตำแหน่งของคุณได้ กรุณาอนุญาตการเข้าถึงตำแหน่งหรือกำหนดตำแหน่งเอง</div>}
      {gpsStatus === 'granted' && <div className="success-box"><CheckCircle size={18} />ตรวจพบตำแหน่งของคุณแล้ว</div>}

      {plan && (
        <div ref={resultsRef} className="results-section">
          <h2 className="results-title">แผนการเดินทางของคุณ</h2>
          {plan.days.map((day, idx) => (
            <div key={idx} className="day-card">
              <h3 className="day-title">วันที่ {day.day}</h3>
              {day.places.map((place, pIdx) => (
                <div key={pIdx} className="place-card">
                  <div className="place-header"><span className="place-number">{pIdx + 1}</span><h4 className="place-name">{place.place_name}</h4></div>
                  <p className="place-description">{place.description}</p>
                  <div className="place-meta"><span className="meta-badge">฿{place.entry_fee || 0}</span><span className="meta-badge">{place.recommended_duration}</span></div>
                </div>
              ))}
            </div>
          ))}
          {routePoints.length > 0 && <TripRouteMap places={routePoints} userLocation={userLocation} />}
        </div>
      )}
    </div>
  );
}
