'use client';
import { useState, useRef, useEffect } from 'react';
import TripRouteMap from '@/components/TripRouteMap';
import ThaiDatePicker from '@/components/ThaiDatePicker';
import {
  Sparkles,
  MapPin,
  Wallet,
  Clock,
  Navigation,
  Map,
  AlertTriangle,
  LocateFixed,
  CheckCircle,
  Radar,
  Lightbulb,
  Search,
  CalendarDays,
  RotateCw,
  Building2,
  PenLine,
  RotateCcw,
  ArrowLeft,
  ArrowUp,
  Route,
} from 'lucide-react';

// ---------- จุดเริ่มต้นทริป ----------
// ตัวเมืองหล่มสัก: ใช้วัดระยะ และเป็นจุดเริ่มสำรองเมื่อหาตำแหน่งไม่ได้
const LOMSAK_CENTER = { lat: 16.7795, lng: 101.2425, name: 'ตัวเมืองหล่มสัก' };
// เครื่องที่ไม่มี GPS (คอม/โน้ตบุ๊ก) ได้ตำแหน่งประมาณจาก IP/WiFi ซึ่งคลาดได้เป็นสิบ ๆ กม.
const ACCURACY_LIMIT_M = 2000;
// ห่างจากหล่มสักเกินนี้ = น่าจะวางแผนล่วงหน้าจากที่อื่น หรือตำแหน่งผิด
const FAR_KM = 100;
// กรอบจังหวัดเพชรบูรณ์ (left,top,right,bottom) ให้ผลค้นหาในพื้นที่ขึ้นก่อน
const PHETCHABUN_VIEWBOX = '100.6,17.45,101.85,15.55';
const NOMINATIM = 'https://nominatim.openstreetmap.org';

const distanceKm = (a, b) => {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const formatKm = (km) => (km < 1 ? `${Math.round(km * 1000)} ม.` : `${Math.round(km)} กม.`);
const formatAccuracy = (m) =>
  m >= 1000 ? `±${Math.round(m / 1000)} กม.` : `±${Math.max(Math.round(m), 1)} ม.`;

// ชื่อพื้นที่แบบสั้นจาก Nominatim reverse เช่น "หล่มสัก, เพชรบูรณ์"
async function reverseName(lat, lng) {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'json',
      zoom: '10',
      'accept-language': 'th',
    });
    const res = await fetch(`${NOMINATIM}/reverse?${params}`);
    const data = await res.json();
    const a = data.address || {};
    const local = a.city || a.town || a.county || a.district || a.municipality || a.village;
    const province = a.state || a.province;
    return [local, province].filter(Boolean).join(', ') || data.display_name || '';
  } catch {
    return '';
  }
}

// กล่องสถานะ "ตำแหน่งปัจจุบัน": บอกผู้ใช้ว่าได้ตำแหน่งไหน แม่นแค่ไหน และให้ยืนยัน/เปลี่ยนได้
function GeoStatus({ geo, onLocate, onConfirm, onUseCenter, onManual }) {
  const place = geo.name || 'ตำแหน่งปัจจุบัน';
  const choices = (
    <div className="mt-3 flex flex-wrap gap-2">
      {(geo.status === 'inaccurate' || geo.status === 'far') && (
        <button type="button" onClick={onConfirm} className="geo-action is-primary">
          <CheckCircle size={14} />
          ใช้ตำแหน่งนี้
        </button>
      )}
      {(geo.status === 'denied' || geo.status === 'unsupported') && (
        <button type="button" onClick={onLocate} className="geo-action is-primary">
          <RotateCw size={14} />
          ลองอีกครั้ง
        </button>
      )}
      <button type="button" onClick={onUseCenter} className="geo-action">
        <Building2 size={14} />
        เริ่มจากตัวเมืองหล่มสัก
      </button>
      <button type="button" onClick={onManual} className="geo-action">
        <PenLine size={14} />
        เลือกจุดเริ่มเอง
      </button>
    </div>
  );

  if (geo.status === 'requesting') {
    return (
      <div className="geo-box" role="status">
        <span className="loading-ring" /> กำลังหาตำแหน่งของคุณ...
      </div>
    );
  }
  if (geo.status === 'idle') {
    return (
      <div className="geo-box">
        <p className="text-content-secondary">ระบบจะใช้ตำแหน่งของเครื่องนี้เป็นจุดเริ่มทริป</p>
        <button type="button" onClick={onLocate} className="geo-action is-primary mt-3">
          <LocateFixed size={14} />
          ตรวจหาตำแหน่ง
        </button>
      </div>
    );
  }
  if (geo.status === 'denied' || geo.status === 'unsupported') {
    return (
      <div className="geo-box is-danger" role="alert">
        <p className="flex items-center gap-2 font-semibold">
          <AlertTriangle size={16} />
          {geo.status === 'unsupported'
            ? 'เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง'
            : 'เข้าถึงตำแหน่งไม่ได้'}
        </p>
        <p className="mt-1 text-content-secondary">
          อนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์ หรือเลือกจุดเริ่มทริปเอง
        </p>
        {choices}
      </div>
    );
  }

  const detail = (
    <p className="mt-1 text-content-secondary">
      {place} · ความคลาดเคลื่อน {formatAccuracy(geo.accuracy)} · ห่างตัวเมืองหล่มสัก{' '}
      {formatKm(geo.distance)}
    </p>
  );

  if (geo.confirmed) {
    return (
      <div className="geo-box is-success">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle size={16} />
          เริ่มทริปจากตำแหน่งนี้
        </p>
        {detail}
        <button type="button" onClick={onLocate} className="geo-link mt-2">
          <RotateCw size={13} />
          ตรวจหาใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="geo-box is-warning" role="alert">
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle size={16} />
        {geo.status === 'far'
          ? `คุณอยู่ห่างหล่มสักประมาณ ${formatKm(geo.distance)}`
          : 'ตำแหน่งนี้อาจไม่แม่นยำ'}
      </p>
      {detail}
      <p className="mt-1 text-xs text-content-muted">
        {geo.status === 'far'
          ? 'ถ้ากำลังวางแผนล่วงหน้า ควรเลือกจุดที่จะออกเดินทางจริง เช่น ที่พักในหล่มสัก'
          : 'เครื่องนี้อาจไม่มี GPS ตำแหน่งจึงถูกประมาณจากอินเทอร์เน็ต'}
      </p>
      {choices}
    </div>
  );
}

// วันที่ตามเวลาเครื่องผู้ใช้ รูปแบบ YYYY-MM-DD
const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayISO = () => isoDate(new Date());
const DEFAULT_FORM = {
  days: 1,
  budget: 3000,
  start_time: '08:00',
  end_time: '18:00',
  start_date: '',
  place_types: [],
  radius_km: 50,
  location_mode: 'auto',
  manual_lat: '',
  manual_lng: '',
  search_address: '',
};

// วันที่แบบสั้นสำหรับแถบสรุป เช่น "จ. 19 ต.ค. 2569"
const TH_DOW_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const TH_MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const shortThaiDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${TH_DOW_SHORT[d.getDay()]} ${d.getDate()} ${TH_MONTH_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
};

// แถบสรุปเงื่อนไขของแผน (แสดงแทนฟอร์มหลังจัดทริปแล้ว)
function ConditionChips({ meta }) {
  const items = [
    { icon: MapPin, text: `${meta.days} วัน` },
    { icon: Wallet, text: `งบ ${Number(meta.budget).toLocaleString('th-TH')} บาท` },
    meta.date && { icon: CalendarDays, text: meta.date },
    { icon: Clock, text: `${meta.start_time}–${meta.end_time} น.` },
    { icon: Navigation, text: `เริ่มจาก ${meta.startLabel}`, wide: true },
  ].filter(Boolean);
  return (
    <div className="plan-meta">
      <ul className="plan-chips">
        {items.map(({ icon: Icon, text, wide }) => (
          <li key={text} className={wide ? 'is-wide' : undefined}>
            <Icon size={14} aria-hidden="true" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      {meta.categories.length > 0 && (
        <p className="plan-cats">สนใจ: {meta.categories.join(' · ')}</p>
      )}
    </div>
  );
}

export default function TripPlanner({ categories = [] }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  // 'form' = กรอกเงื่อนไข, 'result' = แสดงสรุป + แผนที่แทนฟอร์ม
  const [view, setView] = useState('form');
  const [planMeta, setPlanMeta] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const sectionRef = useRef(null);
  const [plan, setPlan] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [routePoints, setRoutePoints] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  // geo: { status: idle|requesting|ok|inaccurate|far|denied|unsupported, lat, lng, accuracy, distance, name, confirmed }
  const [geo, setGeo] = useState({ status: 'idle' });
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPlaceName, setSelectedPlaceName] = useState('');
  const resultsRef = useRef(null);

  // ตั้งค่าวันนี้หลัง mount (ไม่ทำตอน render เพื่อกัน hydration mismatch ระหว่าง server/client)
  useEffect(() => {
    setForm((prev) => (prev.start_date ? prev : { ...prev, start_date: todayISO() }));
  }, []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleCategory = (catId) =>
    setForm((prev) => ({
      ...prev,
      place_types: prev.place_types.includes(catId)
        ? prev.place_types.filter((id) => id !== catId)
        : [...prev.place_types, catId],
    }));

  const getPosition = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('unsupported'));
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      });
    });

  // ขอตำแหน่งทันทีที่ผู้ใช้เลือก แล้วตรวจความแม่นยำ/ระยะห่าง ก่อนนำไปใช้
  const locate = async () => {
    setGeo({ status: 'requesting' });
    let pos;
    try {
      pos = await getPosition();
    } catch (err) {
      const next = { status: err?.message === 'unsupported' ? 'unsupported' : 'denied' };
      setGeo(next);
      return next;
    }
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    const distance = distanceKm({ lat, lng }, LOMSAK_CENTER);
    const status =
      accuracy > ACCURACY_LIMIT_M ? 'inaccurate' : distance > FAR_KM ? 'far' : 'ok';
    const next = { status, lat, lng, accuracy, distance, name: '', confirmed: status === 'ok' };
    setGeo(next);
    reverseName(lat, lng).then((name) => {
      if (name) setGeo((prev) => (prev.lat === lat && prev.lng === lng ? { ...prev, name } : prev));
    });
    return next;
  };

  const chooseAuto = () => {
    update('location_mode', 'auto');
    setError('');
    if (geo.status === 'idle' || geo.status === 'denied') locate();
  };

  const chooseManual = () => {
    update('location_mode', 'manual');
    setError('');
  };

  const confirmGeo = () => setGeo((prev) => ({ ...prev, confirmed: true }));

  const selectStart = (lat, lng, name) => {
    setForm((prev) => ({
      ...prev,
      location_mode: 'manual',
      manual_lat: String(lat),
      manual_lng: String(lng),
    }));
    setSelectedPlaceName(name);
    setSearchResults([]);
    setError('');
  };

  const useLomsakCenter = () =>
    selectStart(LOMSAK_CENTER.lat, LOMSAK_CENTER.lng, LOMSAK_CENTER.name);

  // ค้นหาเฉพาะในไทย ให้พื้นที่เพชรบูรณ์ขึ้นก่อน แล้วเรียงตามระยะจากหล่มสัก
  const searchAddress = async () => {
    const q = form.search_address.trim();
    if (!q) return;
    setSearchingAddress(true);
    setSearchResults([]);
    setError('');
    try {
      const params = new URLSearchParams({
        q,
        format: 'json',
        limit: '6',
        countrycodes: 'th',
        viewbox: PHETCHABUN_VIEWBOX,
        'accept-language': 'th',
      });
      const res = await fetch(`${NOMINATIM}/search?${params}`);
      const data = await res.json();
      const results = (Array.isArray(data) ? data : [])
        .map((r) => {
          const lat = parseFloat(r.lat);
          const lng = parseFloat(r.lon);
          const parts = String(r.display_name || '').split(',').map((x) => x.trim());
          return {
            id: r.place_id,
            lat,
            lng,
            name: parts[0] || q,
            detail: parts.slice(1, 4).join(', '),
            distance: distanceKm({ lat, lng }, LOMSAK_CENTER),
          };
        })
        .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
        .sort((a, b) => a.distance - b.distance);
      if (results.length === 0) {
        setError('ไม่พบที่อยู่ที่ค้นหา ลองพิมพ์ชื่อสถานที่ อำเภอ หรือจังหวัดเพิ่ม');
      } else if (results.length === 1) {
        selectStart(results[0].lat, results[0].lng, results[0].name);
      } else {
        setSearchResults(results);
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการค้นหาที่อยู่');
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.place_types.length === 0) {
      setError('กรุณาเลือกประเภทสถานที่อย่างน้อย 1 ประเภท');
      return;
    }

    setError('');

    // ---- ตรวจจุดเริ่มต้นก่อน (ไม่วางแผนแบบเงียบ ๆ ด้วยตำแหน่งผิด) ----
    let startLat = null,
      startLng = null;
    if (form.location_mode === 'auto') {
      let current = geo;
      if (current.status === 'idle' || current.status === 'requesting') current = await locate();
      if (current.status === 'denied' || current.status === 'unsupported') {
        setError('เข้าถึงตำแหน่งไม่ได้ กรุณาเลือกจุดเริ่มทริป (ดูตัวเลือกในส่วน "จุดเริ่มต้นทริป")');
        return;
      }
      if (!current.confirmed) {
        setError('กรุณายืนยันจุดเริ่มทริปก่อน (ดูคำเตือนในส่วน "จุดเริ่มต้นทริป")');
        return;
      }
      startLat = current.lat;
      startLng = current.lng;
    } else {
      startLat = parseFloat(form.manual_lat);
      startLng = parseFloat(form.manual_lng);
      if (!Number.isFinite(startLat) || !Number.isFinite(startLng)) {
        setError('กรุณาค้นหาหรือเลือกจุดเริ่มทริป หรือกด "ตัวเมืองหล่มสัก"');
        return;
      }
    }

    // เก็บเงื่อนไข ณ ตอนกดจัด ไว้แสดงในแถบสรุป (ฟอร์มอาจถูกแก้ทีหลัง)
    const meta = {
      days: form.days,
      budget: form.budget,
      date: form.start_date ? shortThaiDate(form.start_date) : '',
      start_time: form.start_time,
      end_time: form.end_time,
      startLabel:
        form.location_mode === 'auto'
          ? geo.name || 'ตำแหน่งปัจจุบัน'
          : selectedPlaceName || 'พิกัดที่กำหนดเอง',
      categories: categories
        .filter((c) => form.place_types.includes(c.category_id))
        .map((c) => c.name),
    };

    // ไม่ล้างแผนเดิมก่อน: ถ้าจัดใหม่ไม่สำเร็จ ผู้ใช้ยังกลับไปดูแผนเดิมได้
    setLoading(true);

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
      setPlanMeta(meta);
      setUserLocation({ lat: startLat, lng: startLng });
      setNote(data.note || '');
      // เก็บวัน/ลำดับในวันไว้ด้วย เพื่อให้แผนที่นับเลขและลากเส้นแยกตามวัน (ตรงกับตารางกิจกรรม)
      const points = (result.days || []).flatMap((day, di) =>
        (day.activities || [])
          .map((a) => ({
            lat: parseFloat(a.lat),
            lng: parseFloat(a.lng),
            name: a.place,
            time: a.time,
            travel: a.travel,
            type: a.type,
            day: di + 1,
          }))
          .filter((p) => !isNaN(p.lat) && !isNaN(p.lng))
          .map((p, i) => ({ ...p, seq: i + 1 }))
      );
      setRoutePoints(points);
      setView('result');
      setConfirmReset(false);
      scrollToPlanner();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const scrollToPlanner = () =>
    setTimeout(
      () => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      60
    );

  const editConditions = () => {
    setView('form');
    setConfirmReset(false);
    setError('');
    scrollToPlanner();
  };

  const backToPlan = () => {
    setView('result');
    setError('');
    scrollToPlanner();
  };

  const startOver = () => {
    setForm({ ...DEFAULT_FORM, start_date: todayISO() });
    setPlan(null);
    setPlanMeta(null);
    setRoutePoints([]);
    setUserLocation(null);
    setNote('');
    setError('');
    setSearchResults([]);
    setSelectedPlaceName('');
    setConfirmReset(false);
    setView('form');
    scrollToPlanner();
  };

  const showResult = view === 'result' && plan && planMeta;

  return (
    <>
      <section
        ref={sectionRef}
        id="planner"
        className="planner-section scroll-mt-20"
        aria-labelledby="planner-title"
      >
        {showResult ? (
          <div className="page-shell plan-result-layout">
            <div className="plan-summary-card">
              <p className="eyebrow">
                <span className="eyebrow-line" />
                แผนทริปของคุณ
              </p>
              <h2 id="planner-title" className="plan-title">
                {plan.title || 'แผนท่องเที่ยวหล่มสัก'}
              </h2>
              {plan.summary && <p className="plan-summary-text">{plan.summary}</p>}
              <ConditionChips meta={planMeta} />
              {plan.total_budget && (
                <p className="plan-total">
                  <Wallet size={16} aria-hidden="true" />
                  ค่าใช้จ่ายโดยประมาณ <strong>{plan.total_budget}</strong>
                </p>
              )}
              {note && <p className="text-xs text-content-muted">{note}</p>}

              <div className="plan-actions">
                <button type="button" onClick={editConditions} className="plan-btn is-primary">
                  <PenLine size={16} />
                  แก้ไขเงื่อนไข
                </button>
                {confirmReset ? (
                  <div className="plan-confirm" role="group" aria-label="ยืนยันจัดทริปใหม่">
                    <span>ล้างแผนนี้แล้วเริ่มใหม่?</span>
                    <button type="button" onClick={startOver} className="plan-btn is-danger">
                      ล้างแล้วเริ่มใหม่
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="plan-btn"
                    >
                      ยกเลิก
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmReset(true)} className="plan-btn">
                    <RotateCcw size={16} />
                    จัดทริปใหม่
                  </button>
                )}
              </div>
            </div>

            <div className="plan-map">
              {routePoints.length > 0 ? (
                <TripRouteMap places={routePoints} userLocation={userLocation} className="h-full" />
              ) : (
                <div className="plan-map-empty">
                  <Route size={22} />
                  ไม่มีพิกัดสำหรับแสดงเส้นทาง
                </div>
              )}
            </div>
          </div>
        ) : (
        <div className="page-shell planner-layout">
          <div className="planner-intro">
            <p className="eyebrow">
              <span className="eyebrow-line" />
              01 / วางแผนทริปด้วย AI
            </p>
            <h2 id="planner-title">
              ออกแบบวันเที่ยว
              <br />
              หล่มสักในแบบของคุณ
            </h2>
            <ol className="planner-steps">
              <li>
                <span>1</span>กำหนดจำนวนวัน งบประมาณ และช่วงเวลา
              </li>
              <li>
                <span>2</span>เลือกจุดเริ่มต้นและรัศมีการเดินทาง
              </li>
              <li>
                <span>3</span>เลือกประเภทสถานที่ที่สนใจ แล้วให้ AI จัดเส้นทาง
              </li>
            </ol>
          </div>

          <form onSubmit={handleSubmit} className="planner-form grid gap-6">
            {plan && planMeta && (
              <button type="button" onClick={backToPlan} className="geo-link -mb-2 justify-self-start">
                <ArrowLeft size={14} />
                กลับไปดูแผนเดิม (ไม่เปลี่ยนแปลง)
              </button>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="field-label">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} />
                  จำนวนวัน
                </span>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={form.days}
                  onChange={(e) => update('days', parseInt(e.target.value) || 1)}
                  className="nature-input"
                  required
                />
              </label>
              <label className="field-label">
                <span className="inline-flex items-center gap-1.5">
                  <Wallet size={14} />
                  งบประมาณ (บาท)
                </span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={form.budget}
                  onChange={(e) => update('budget', parseInt(e.target.value) || 0)}
                  className="nature-input"
                  required
                />
              </label>
              <div className="field-label sm:col-span-2">
                <span id="start-date-label" className="inline-flex items-center gap-1.5">
                  <CalendarDays size={14} />
                  วันที่เริ่มเดินทาง
                </span>
                <ThaiDatePicker
                  value={form.start_date}
                  onChange={(value) => update('start_date', value)}
                  min={todayISO()}
                  ariaLabelledBy="start-date-label"
                  ariaDescribedBy="start-date-hint"
                />
                <span id="start-date-hint" className="text-xs font-normal text-content-muted">
                  ใช้คัดสถานที่ที่เปิดเฉพาะบางวัน เช่น ถนนคนเดินวันเสาร์
                </span>
              </div>
              <label className="field-label">
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} />
                  เวลาเริ่มต้น
                </span>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => update('start_time', e.target.value)}
                  className="nature-input"
                  required
                />
              </label>
              <label className="field-label">
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} />
                  เวลาสิ้นสุด
                </span>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => update('end_time', e.target.value)}
                  className="nature-input"
                  required
                />
              </label>
            </div>

            <div>
              <p className="form-section-title inline-flex items-center gap-1.5">
                <Navigation size={16} />
                จุดเริ่มต้นทริป
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  aria-pressed={form.location_mode === 'auto'}
                  onClick={chooseAuto}
                  className={`location-choice ${form.location_mode === 'auto' ? 'is-selected' : ''}`}
                >
                  <LocateFixed size={18} />
                  ตำแหน่งปัจจุบัน
                </button>
                <button
                  type="button"
                  aria-pressed={form.location_mode === 'manual'}
                  onClick={chooseManual}
                  className={`location-choice ${form.location_mode === 'manual' ? 'is-selected' : ''}`}
                >
                  <Map size={18} />
                  กำหนดเอง
                </button>
              </div>
              {form.location_mode === 'auto' && (
                <GeoStatus
                  geo={geo}
                  onLocate={locate}
                  onConfirm={confirmGeo}
                  onUseCenter={useLomsakCenter}
                  onManual={chooseManual}
                />
              )}
              {form.location_mode === 'manual' && (
                <>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="ค้นหาที่พัก สถานที่ หรือที่อยู่"
                      aria-label="ค้นหาที่อยู่"
                      value={form.search_address}
                      onChange={(e) => update('search_address', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchAddress())}
                      className="nature-input flex-1"
                    />
                    <button
                      type="button"
                      onClick={searchAddress}
                      disabled={searchingAddress || !form.search_address.trim()}
                      className="nature-button px-4"
                      aria-label="ค้นหา"
                    >
                      {searchingAddress ? <span className="loading-ring" /> : <Search size={18} />}
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <ul className="geo-results" aria-label="ผลการค้นหาที่อยู่">
                      {searchResults.map((r) => (
                        <li key={r.id}>
                          <button type="button" onClick={() => selectStart(r.lat, r.lng, r.name)}>
                            <MapPin size={15} className="mt-0.5 shrink-0 text-primary" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{r.name}</span>
                              <span className="block truncate text-xs text-content-muted">
                                {r.detail}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs text-content-muted">
                              {formatKm(r.distance)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button type="button" onClick={useLomsakCenter} className="geo-link mt-2">
                    <Building2 size={13} />
                    ใช้ตัวเมืองหล่มสักเป็นจุดเริ่ม
                  </button>
                  {(() => {
                    const lat = parseFloat(form.manual_lat);
                    const lng = parseFloat(form.manual_lng);
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                    const dist = distanceKm({ lat, lng }, LOMSAK_CENTER);
                    const far = dist > FAR_KM;
                    return (
                      <div className={`geo-box ${far ? 'is-warning' : 'is-success'}`}>
                        <p className="flex items-center gap-2 font-semibold">
                          {far ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                          {selectedPlaceName || 'พิกัดที่กำหนดเอง'}
                        </p>
                        <p className="mt-1 text-content-secondary">
                          ห่างตัวเมืองหล่มสัก {formatKm(dist)}
                          {far && ' — ตรวจสอบว่าเป็นจุดที่จะออกเดินทางจริง'}
                        </p>
                      </div>
                    );
                  })()}
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-content-muted">
                      ระบุพิกัด Latitude / Longitude เอง
                    </summary>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Latitude"
                        aria-label="Latitude"
                        value={form.manual_lat}
                        onChange={(e) => {
                          update('manual_lat', e.target.value);
                          setSelectedPlaceName('');
                        }}
                        className="nature-input"
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Longitude"
                        aria-label="Longitude"
                        value={form.manual_lng}
                        onChange={(e) => {
                          update('manual_lng', e.target.value);
                          setSelectedPlaceName('');
                        }}
                        className="nature-input"
                      />
                    </div>
                  </details>
                </>
              )}
            </div>

            <label className="field-label">
              <span className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5">
                  <Radar size={14} />
                  รัศมีการค้นหา
                </span>
                <span className="text-primary">{form.radius_km} กม.</span>
              </span>
              <input
                type="range"
                min="5"
                max="200"
                step="5"
                value={form.radius_km}
                onChange={(e) => update('radius_km', parseInt(e.target.value))}
                className="w-full accent-[var(--color-primary)]"
              />
            </label>

            {categories.length > 0 && (
              <div>
                <p className="form-section-title">ประเภทสถานที่ที่สนใจ</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.category_id}
                      type="button"
                      aria-pressed={form.place_types.includes(cat.category_id)}
                      onClick={() => toggleCategory(cat.category_id)}
                      className={`filter-chip ${form.place_types.includes(cat.category_id) ? 'is-selected' : ''}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="nature-button w-full">
              {loading ? (
                <>
                  <span className="loading-ring" />
                  กำลังวางแผน...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  {plan ? 'จัดทริปตามเงื่อนไขใหม่' : 'วางแผนทริป'}
                </>
              )}
            </button>

            {error && (
              <p role="alert" className="flex items-center gap-2 text-sm text-danger">
                <AlertTriangle size={16} />
                {error}
              </p>
            )}
          </form>
        </div>
        )}
      </section>

      {showResult && (
        <section
          ref={resultsRef}
          className="page-shell plan-schedule grid gap-6"
          aria-label="ตารางกิจกรรมรายวัน"
        >
          {(plan.days || []).map((day) => (
            <div key={day.day} className="result-panel">
              <h3 className="text-xl mb-4">
                วันที่ {day.day}
                {day.title ? ` · ${day.title}` : ''}
                {day.date && (
                  <span className="mt-1 block text-sm font-normal text-content-muted">
                    {day.date}
                  </span>
                )}
              </h3>
              <ol className="grid gap-4">
                {(day.activities || []).map((a, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-[auto_1fr] gap-4 border-t border-border-light pt-4 first:border-0 first:pt-0"
                  >
                    <span className="text-sm font-semibold text-primary whitespace-nowrap">
                      {a.time}
                    </span>
                    <div>
                      {a.travel && (
                        <p className="mb-1 inline-flex items-center gap-1 text-xs text-content-muted">
                          <Navigation size={12} />
                          {a.travel}
                        </p>
                      )}
                      <p
                        className={
                          a.type === 'free' ? 'font-medium text-content-muted' : 'font-semibold'
                        }
                      >
                        {a.place}
                      </p>
                      {a.description && (
                        <p className="mt-1 text-sm text-content-secondary leading-relaxed">
                          {a.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-content-muted">
                        {a.cost && <span>ค่าใช้จ่าย: {a.cost}</span>}
                        {a.tips && (
                          <span className="inline-flex items-center gap-1">
                            <Lightbulb size={12} />
                            {a.tips}
                          </span>
                        )}
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
                {plan.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ปุ่มท้ายตาราง: อ่านจบแล้วแก้ต่อได้เลย ไม่ต้องเลื่อนกลับขึ้นไป */}
          <div className="plan-end-actions">
            <button type="button" onClick={editConditions} className="plan-btn is-primary">
              <PenLine size={16} />
              แก้ไขเงื่อนไขแล้วจัดใหม่
            </button>
            <button type="button" onClick={scrollToPlanner} className="plan-btn">
              <ArrowUp size={16} />
              กลับไปดูแผนที่
            </button>
          </div>
        </section>
      )}
    </>
  );
}
