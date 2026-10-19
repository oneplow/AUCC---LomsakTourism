// ตรรกะจัดตารางทริป (pure functions) แยกจาก API route เพื่อให้ทดสอบด้วย node ได้โดยตรง
import { DAY_NAMES, formatOpenDays, isOpenOn } from './openDays.js';

// สมมติฐานการเดินทางในพื้นที่ภูเขา/ชนบท
export const ROAD_FACTOR = 1.4; // ระยะถนนจริง ≈ ระยะเส้นตรง × 1.4
const AVG_SPEED_KMH = 45; // ความเร็วเฉลี่ยรวมทางขึ้นเขา
const PARKING_MIN = 5; // เวลาจอดรถ/เดินเข้าสถานที่
export const FUEL_THB_PER_KM = 3; // ค่าน้ำมันรถยนต์โดยประมาณ
const FALLBACK_TRAVEL_MIN = 20;
const OSRM_TIMEOUT_MS = 6000;
const OSRM_DURATION_FACTOR = 1.15; // OSRM มักเร็วกว่าความจริงบนถนนชนบท/ทางเขา
// ช่วงสั้นๆ ไม่ใช้ระยะ OSRM เพื่อกัน one-way อ้อมบล็อก → ใช้ทางตรงแทน
const SHORT_LEG_KM = 0.45;
const SHORT_LEG_MIN = 3;
const LUNCH_START = 11 * 60 + 30;
const LUNCH_END = 13 * 60 + 30;
const DINNER_START = 17 * 60 + 30;
const MIN_FREE_BLOCK = 20; // ต้องรอสถานที่เปิดนานเกินนี้ แสดงเป็นช่วง "เวลาว่าง"

export const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const hasCoords = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng);
export const roadKm = (a, b) =>
  hasCoords(a) && hasCoords(b) ? haversine(a.lat, a.lng, b.lat, b.lng) * ROAD_FACTOR : null;
const travelMin = (km) =>
  km === null ? FALLBACK_TRAVEL_MIN : Math.round((km / AVG_SPEED_KMH) * 60) + PARKING_MIN;

export const toMin = (t) => {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};
export const toHHMM = (m) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// วันที่ปัจจุบันตามเวลาไทย (server บน Vercel ใช้ UTC) — ใช้กันเลือกวันที่ที่ผ่านไปแล้ว
export function bangkokToday(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export const isLodging = (cat) => /ที่พัก|รีสอร์ท|โรงแรม/.test(cat || '');
export const visitMinutes = (cat, name = '') => {
  if (/อนุสาวรีย์|อนุสรณ์|ศาลเจ้า|ศาลหลักเมือง|ป้าย|ซุ้ม/.test(name)) return 30;
  if (/วัด|ศาสน/.test(cat)) return 45;
  if (/น้ำตก|ธรรมชาติ/.test(cat)) return 90;
  if (/ชมวิว/.test(cat)) return 60;
  if (/ตลาด|ชุมชน/.test(cat)) return 60;
  return 60;
};
const toNumber = (v) => {
  const n = parseFloat(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : 0;
};

// ระยะถนนจริง (กม.) จากจุดเริ่มต้นไปทุกสถานที่ ด้วย OSRM Table (sources=0) — ใช้คัด/เรียงสถานที่ที่ใกล้จริง
// คืน array ความยาวเท่า places; ค่าที่ OSRM หาไม่ได้จะเป็นค่าประมาณ haversine × ROAD_FACTOR
export async function roadKmFromStart(start, places) {
  const result = places.map((p) => roadKm(start, p));
  const idx = places.map((p, i) => (hasCoords(p) ? i : -1)).filter((i) => i >= 0);
  if (!hasCoords(start) || idx.length === 0) return result;
  try {
    const coords = [start, ...idx.map((i) => places[i])].map((p) => `${p.lng},${p.lat}`).join(';');
    const res = await fetch(
      `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=distance`,
      { signal: AbortSignal.timeout(OSRM_TIMEOUT_MS), cache: 'no-store' }
    );
    const data = await res.json();
    if (data.code === 'Ok') {
      idx.forEach((placeIdx, k) => {
        const d = data.distances?.[0]?.[k + 1];
        if (Number.isFinite(d)) result[placeIdx] = d / 1000;
      });
    }
  } catch (e) {
    console.warn('OSRM start distances unavailable, using estimate:', e.message);
  }
  return result;
}

// ระยะทาง/เวลาตามถนนจริงจาก OSRM Table API (fallback เป็นสูตร haversine × ROAD_FACTOR)
export async function buildRoadMatrix(nodes) {
  const n = nodes.length;
  const km = Array.from({ length: n }, () => Array(n).fill(null));
  const min = Array.from({ length: n }, () => Array(n).fill(null));
  let source = 'estimate';

  if (n > 1 && nodes.every(hasCoords)) {
    try {
      const coords = nodes.map((p) => `${p.lng},${p.lat}`).join(';');
      const res = await fetch(
        `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration,distance`,
        { signal: AbortSignal.timeout(OSRM_TIMEOUT_MS), cache: 'no-store' }
      );
      const data = await res.json();
      if (data.code === 'Ok') {
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            const d = data.distances?.[i]?.[j];
            const t = data.durations?.[i]?.[j];
            if (Number.isFinite(d)) km[i][j] = d / 1000;
            if (Number.isFinite(t)) min[i][j] = (t / 60) * OSRM_DURATION_FACTOR;
          }
        }
        source = 'osrm';
      }
    } catch (e) {
      console.warn('OSRM table unavailable, using estimate:', e.message);
    }
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        km[i][j] = 0;
        min[i][j] = 0;
        continue;
      }
      if (km[i][j] === null) km[i][j] = roadKm(nodes[i], nodes[j]);
      if (min[i][j] === null) min[i][j] = travelMin(km[i][j]);
      else min[i][j] = Math.round(min[i][j]) + PARKING_MIN;
      if (Number.isFinite(km[i][j]) && km[i][j] < SHORT_LEG_KM) {
        km[i][j] = haversine(nodes[i].lat, nodes[i].lng, nodes[j].lat, nodes[j].lng);
        min[i][j] = SHORT_LEG_MIN;
      }
    }
  }
  return { km, min, source };
}

/**
 * จำลองการเที่ยว 1 วันตามลำดับที่กำหนด — ใช้ทั้งตอนให้คะแนนลำดับ และตอนสร้างตารางจริง
 * เพื่อให้สิ่งที่ optimizer เห็นตรงกับตารางที่ผู้ใช้ได้รับ (รวมมื้อเที่ยง/เย็น และการรอสถานที่เปิด)
 */
function walkDay(order, ctx) {
  const { startIdx, dayStart, dayEnd, leg, lunch, dinner } = ctx;
  let clock = dayStart;
  let cur = startIdx;
  let lunchDone = !lunch || dayStart >= LUNCH_END || dayEnd <= LUNCH_START;
  let dinnerDone = !dinner;
  const events = [];
  let dropped = 0;
  let drive = 0;

  const meal = (m, earliest, kind) => {
    const start = Math.max(clock, earliest);
    const duration = Math.max(30, Math.min(toNumber(m.duration_min) || 60, 90));
    if (start + duration > dayEnd) return;
    events.push({ kind, meal: m, start, end: start + duration });
    clock = start + duration;
  };

  for (const v of order) {
    const travel = cur === null ? 0 : leg(cur, v.idx).min;
    const opensAt = v.place.open ?? 0;
    // กินข้าวเที่ยงเมื่อใกล้ 11:30 หรือถ้าไปจุดนี้ (รวมรอเปิด) แล้วจะเลย 13:30
    const wouldLeave = Math.max(clock + travel, opensAt) + v.duration;
    if (!lunchDone && (clock >= LUNCH_START - 15 || wouldLeave > LUNCH_END)) {
      meal(lunch, LUNCH_START, 'lunch');
      lunchDone = true;
    }
    if (!dinnerDone && clock >= 18 * 60) {
      meal(dinner, DINNER_START, 'dinner');
      dinnerDone = true;
    }

    let arrive = clock + travel;
    const wait = Math.max(0, opensAt - arrive);
    arrive += wait;
    const leave = arrive + v.duration;
    if (leave > dayEnd || leave > v.closeLimit) {
      dropped++;
      events.push({ kind: 'dropped', v, reason: opensAt >= dayEnd - v.duration ? 'late' : 'time' });
      continue;
    }
    drive += travel;
    events.push({
      kind: 'visit',
      v,
      from: cur,
      travel,
      wait,
      depart: arrive - travel,
      arrive,
      leave,
    });
    clock = leave;
    cur = v.idx;
  }

  if (!lunchDone && clock <= 14 * 60) meal(lunch, LUNCH_START, 'lunch');
  if (!dinnerDone) meal(dinner, DINNER_START, 'dinner');

  // นับขากลับจุดเริ่มต้นของวัน (บ้าน/GPS หรือที่พัก) ด้วย → ได้เส้นทางแบบวงรอบ
  // ไม่งั้น "ไปจุดไกลก่อนแล้ววิ่งย้อนทางเดิม" จะได้คะแนนพอๆ กับวงรอบ ทำให้เส้นบนแผนที่ทับกันไปมา
  // (ใช้ให้คะแนนอย่างเดียว ไม่ใส่ในตาราง/ไม่กระทบเวลา)
  const back = startIdx !== null && cur !== null && cur !== startIdx ? leg(cur, startIdx).min : 0;

  // ตัดสถานที่ทิ้งแย่สุด > ขับรถนาน > เลิกช้า
  // (ไม่ลงโทษเวลารอเปิด: ถ้าลงโทษ optimizer จะเลือกขับอ้อมเพื่อ "ฆ่าเวลา" แทนการพักจริง)
  const score = dropped * 100000 + (drive + back) * 10 + clock;
  return { events, score, clock, cur };
}

// ≤ 8 จุด ลองทุกลำดับ (≤ 40,320 แบบ) = คำตอบดีที่สุดจริง, มากกว่านั้นใช้ nearest-neighbor + 2-opt
function optimizeOrder(visits, ctx) {
  if (visits.length <= 1) return visits;
  const score = (o) => walkDay(o, ctx).score;

  if (visits.length <= 8) {
    let best = visits;
    let bestScore = Infinity;
    const perm = [];
    const taken = Array(visits.length).fill(false);
    const walk = () => {
      if (perm.length === visits.length) {
        const s = score(perm);
        if (s < bestScore) {
          bestScore = s;
          best = [...perm];
        }
        return;
      }
      for (let i = 0; i < visits.length; i++) {
        if (taken[i]) continue;
        taken[i] = true;
        perm.push(visits[i]);
        walk();
        perm.pop();
        taken[i] = false;
      }
    };
    walk();
    return best;
  }

  const remaining = [...visits];
  const order = [];
  let cur = ctx.startIdx;
  if (cur === null) {
    order.push(remaining.shift());
    cur = order[0].idx;
  }
  while (remaining.length) {
    let b = 0;
    for (let i = 1; i < remaining.length; i++) {
      if (ctx.leg(cur, remaining[i].idx).min < ctx.leg(cur, remaining[b].idx).min) b = i;
    }
    cur = remaining[b].idx;
    order.push(...remaining.splice(b, 1));
  }
  let best = order;
  let bestScore = score(order);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = ctx.startIdx === null ? 1 : 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const cand = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
        const s = score(cand);
        if (s < bestScore) {
          best = cand;
          bestScore = s;
          improved = true;
        }
      }
    }
  }
  return best;
}

// วันในสัปดาห์ของวันที่ N ของทริป (0 = อาทิตย์) — null ถ้าไม่ระบุวันเริ่มเดินทาง
export function tripWeekday(startDate, dayIdx) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || '')) return null;
  const d = new Date(`${startDate}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : (d.getUTCDay() + dayIdx) % 7;
}

// เช่น "วันเสาร์ 24 ต.ค. 2569"
function tripDateLabel(startDate, dayIdx) {
  const weekday = tripWeekday(startDate, dayIdx);
  if (weekday === null) return '';
  const d = new Date(`${startDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dayIdx);
  const date = d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `วัน${DAY_NAMES[weekday]} ${date}`;
}

// คำนวณตารางเวลาจริง: AI เลือกสถานที่ต่อวัน, server จัดลำดับ เวลาเดินทาง มื้ออาหาร และตัดสิ่งที่เกินเวลา
export function buildSchedule(
  aiPlan,
  candidates,
  startPoint,
  dayStart,
  dayEnd,
  matrix,
  startDate = null
) {
  const byId = Object.fromEntries(candidates.map((c) => [c.id, c]));
  const START = startPoint ? candidates.length : null; // index ของจุดเริ่มต้นใน matrix
  const leg = (a, b) => ({ km: matrix.km[a][b], min: matrix.min[a][b] });
  const used = new Set();
  const warnings = [];
  let currentIdx = START;
  let lodgedIdx = null;
  let totalKm = 0;
  let itemCost = 0;
  const travelText = (t, km) =>
    t ? `เดินทาง ${t} นาที${km ? ` · ${km.toFixed(1)} กม.` : ''}` : '';
  const aiDays = aiPlan.days || [];

  const days = aiDays.map((day, dayIdx) => {
    const items = day.items || [];
    // วันถัดไปเริ่มจากที่พัก ถ้าไม่มีที่พักให้เริ่มจากจุดเริ่มต้น (GPS) เดิม
    if (dayIdx > 0) currentIdx = lodgedIdx ?? START ?? currentIdx;
    lodgedIdx = null;

    const meals = items.filter((it) => it.type === 'meal');
    const ctx = {
      startIdx: currentIdx,
      dayStart,
      dayEnd,
      leg,
      lunch: meals[0] || null,
      dinner: dayEnd >= 18 * 60 ? meals[1] || null : null,
    };

    const weekday = tripWeekday(startDate, dayIdx);
    const visits = items
      .filter((it) => (it.type || 'visit') === 'visit' && byId[it.id] && !used.has(it.id))
      .filter((it, i, arr) => arr.findIndex((x) => x.id === it.id) === i)
      .filter((it) => {
        const place = byId[it.id];
        if (weekday === null) {
          // ไม่รู้วันเดินทาง: จัดให้ แต่เตือนว่าเปิดเฉพาะบางวัน
          if (place.openDays)
            warnings.push(
              `"${place.name}" เปิด${formatOpenDays(place.openDays)} ตรวจวันเดินทางก่อนไป`
            );
          return true;
        }
        if (isOpenOn(place.openDays, weekday)) return true;
        warnings.push(
          `ตัด "${place.name}" ออกจากวันที่ ${dayIdx + 1} (วัน${DAY_NAMES[weekday]}) เพราะเปิด${formatOpenDays(place.openDays)}`
        );
        return false;
      })
      .map((it) => {
        const place = byId[it.id];
        return {
          item: it,
          place,
          idx: candidates.indexOf(place),
          duration: Math.max(20, Math.min(toNumber(it.duration_min) || place.visit, 240)),
          closeLimit:
            place.close !== null && place.close > (place.open ?? 0) ? place.close : 24 * 60,
        };
      });

    const { events, cur } = walkDay(optimizeOrder(visits, ctx), ctx);
    const activities = [];

    for (const e of events) {
      if (e.kind === 'lunch' || e.kind === 'dinner') {
        const cost = toNumber(e.meal.cost);
        itemCost += cost;
        activities.push({
          time: `${toHHMM(e.start)} - ${toHHMM(e.end)}`,
          place:
            e.meal.name || (e.kind === 'lunch' ? 'พักรับประทานอาหารกลางวัน' : 'รับประทานอาหารเย็น'),
          description: e.meal.description || '',
          cost: `${cost} บาท`,
          tips: e.meal.tips || '',
          type: 'meal',
        });
        continue;
      }
      if (e.kind === 'dropped') {
        const { name, open } = e.v.place;
        warnings.push(
          e.reason === 'late'
            ? `ตัด "${name}" ออกจากวันที่ ${dayIdx + 1} เพราะเปิด ${toHHMM(open)} น. ซึ่งช้ากว่าเวลาเที่ยวที่ตั้งไว้ (ลองขยายเวลาสิ้นสุด)`
            : `ตัด "${name}" ออกจากวันที่ ${dayIdx + 1} เพราะเวลาไม่พอหรือสถานที่ปิดก่อน`
        );
        continue;
      }

      const { v, from, travel, wait, arrive, leave } = e;
      // รอสถานที่เปิดนาน → แสดงเป็นเวลาว่างก่อนออกเดินทาง (ไม่ไปยืนรอหน้าประตู)
      if (wait >= MIN_FREE_BLOCK) {
        const freeStart = arrive - travel - wait;
        activities.push({
          time: `${toHHMM(freeStart)} - ${toHHMM(freeStart + wait)}`,
          place: 'เวลาว่าง / พักผ่อนตามอัธยาศัย',
          description: `รอ "${v.place.name}" เปิดเวลา ${toHHMM(v.place.open)} น.`,
          type: 'free',
        });
      }
      const km = from === null ? 0 : leg(from, v.idx).km || 0;
      const cost = toNumber(v.item.cost);
      itemCost += cost;
      totalKm += km;
      used.add(v.place.id);
      activities.push({
        time: `${toHHMM(arrive)} - ${toHHMM(leave)}`,
        place: v.place.name,
        description: v.item.description || '',
        cost: `${cost} บาท`,
        tips: v.item.tips || '',
        travel: travelText(travel, km),
        lat: v.place.lat,
        lng: v.place.lng,
        type: 'visit',
      });
    }
    currentIdx = cur;

    const lodgingItem = items.find((it) => it.type === 'lodging' && byId[it.id]);
    if (lodgingItem && dayIdx < aiDays.length - 1) {
      const place = byId[lodgingItem.id];
      const idx = candidates.indexOf(place);
      const lastEnd = events.reduce((t, e) => Math.max(t, e.leave ?? e.end ?? 0), dayStart);
      const { km, min: travel } = currentIdx === null ? { km: 0, min: 0 } : leg(currentIdx, idx);
      const cost = toNumber(lodgingItem.cost);
      itemCost += cost;
      totalKm += km || 0;
      activities.push({
        time: `${toHHMM(lastEnd + travel)} เช็คอิน`,
        place: place.name,
        description: lodgingItem.description || 'เข้าพักค้างคืน',
        cost: `${cost} บาท`,
        tips: lodgingItem.tips || '',
        travel: travelText(travel, km),
        lat: place.lat,
        lng: place.lng,
        type: 'lodging',
      });
      currentIdx = idx;
      lodgedIdx = idx;
    }

    return {
      day: day.day || dayIdx + 1,
      title: day.title || '',
      date: tripDateLabel(startDate, dayIdx),
      activities,
    };
  });

  const transport = Math.round(totalKm * FUEL_THB_PER_KM);
  return { days, warnings, transport, itemCost };
}
