import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

// สมมติฐานการเดินทางในพื้นที่ภูเขา/ชนบท
const ROAD_FACTOR = 1.4;      // ระยะถนนจริง ≈ ระยะเส้นตรง × 1.4
const AVG_SPEED_KMH = 45;     // ความเร็วเฉลี่ยรวมทางขึ้นเขา
const PARKING_MIN = 5;        // เวลาจอดรถ/เดินเข้าสถานที่
const FUEL_THB_PER_KM = 3;    // ค่าน้ำมันรถยนต์โดยประมาณ
const FALLBACK_TRAVEL_MIN = 20;

const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const hasCoords = p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng);
const roadKm = (a, b) => (hasCoords(a) && hasCoords(b) ? haversine(a.lat, a.lng, b.lat, b.lng) * ROAD_FACTOR : null);
const travelMin = km => (km === null ? FALLBACK_TRAVEL_MIN : Math.round(km / AVG_SPEED_KMH * 60) + PARKING_MIN);

const toMin = t => {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};
const toHHMM = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const isLodging = cat => /ที่พัก|รีสอร์ท|โรงแรม/.test(cat || '');
const visitMinutes = cat => {
  if (/วัด|ศาสน/.test(cat)) return 45;
  if (/น้ำตก|ธรรมชาติ/.test(cat)) return 90;
  if (/ชมวิว/.test(cat)) return 60;
  if (/ตลาด|ชุมชน/.test(cat)) return 60;
  if (/เรียนรู้|พิพิธ/.test(cat)) return 60;
  return 60;
};
const toNumber = v => {
  const n = parseFloat(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : 0;
};

// คำนวณตารางเวลาจริงจากลำดับที่ AI เลือก: เวลาเดินทาง, รอเปิด, ตัดกิจกรรมที่เกินเวลา/ปิดแล้ว
function buildSchedule(aiPlan, candidates, startPoint, dayStart, dayEnd) {
  const byId = Object.fromEntries(candidates.map(c => [c.id, c]));
  const used = new Set();
  const warnings = [];
  let current = startPoint;
  let totalKm = 0;
  let itemCost = 0;

  const days = (aiPlan.days || []).map((day, dayIdx) => {
    let clock = dayStart;
    const activities = [];

    for (const item of day.items || []) {
      const type = item.type || 'visit';

      if (type === 'meal') {
        const duration = Math.max(30, Math.min(toNumber(item.duration_min) || 60, 90));
        if (clock + duration > dayEnd) continue;
        const cost = toNumber(item.cost);
        itemCost += cost;
        activities.push({
          time: `${toHHMM(clock)} - ${toHHMM(clock + duration)}`,
          place: item.name || 'พักรับประทานอาหาร',
          description: item.description || '',
          cost: `${cost} บาท`,
          tips: item.tips || '',
          type: 'meal',
        });
        clock += duration;
        continue;
      }

      const place = byId[item.id];
      if (!place || (type === 'visit' && used.has(place.id))) continue;

      const km = roadKm(current, place);
      const travel = current ? travelMin(km) : 0;
      let arrive = clock + travel;

      if (type === 'lodging') {
        const cost = toNumber(item.cost);
        itemCost += cost;
        totalKm += km || 0;
        activities.push({
          time: `${toHHMM(arrive)} เช็คอิน`,
          place: place.name,
          description: item.description || 'เข้าพักค้างคืน',
          cost: `${cost} บาท`,
          tips: item.tips || '',
          travel: travel ? `เดินทาง ${travel} นาที${km ? ` · ${km.toFixed(1)} กม.` : ''}` : '',
          lat: place.lat, lng: place.lng, type: 'lodging',
        });
        current = place;
        clock = arrive;
        continue;
      }

      if (place.open !== null && arrive < place.open) arrive = place.open; // รอสถานที่เปิด
      const duration = Math.max(20, Math.min(toNumber(item.duration_min) || place.visit, 240));
      const leave = arrive + duration;
      const closeLimit = place.close !== null && place.close > (place.open ?? 0) ? place.close : 24 * 60;

      if (leave > dayEnd || leave > closeLimit) {
        warnings.push(`ตัด "${place.name}" ออกจากวันที่ ${dayIdx + 1} เพราะเวลาไม่พอหรือสถานที่ปิดก่อน`);
        continue;
      }

      const cost = toNumber(item.cost);
      itemCost += cost;
      totalKm += km || 0;
      used.add(place.id);
      activities.push({
        time: `${toHHMM(arrive)} - ${toHHMM(leave)}`,
        place: place.name,
        description: item.description || '',
        cost: `${cost} บาท`,
        tips: item.tips || '',
        travel: travel ? `เดินทาง ${travel} นาที${km ? ` · ${km.toFixed(1)} กม.` : ''}` : '',
        lat: place.lat, lng: place.lng, type: 'visit',
      });
      current = place;
      clock = leave;
    }

    return { day: day.day || dayIdx + 1, title: day.title || '', activities };
  });

  const transport = Math.round(totalKm * FUEL_THB_PER_KM);
  return { days, warnings, transport, itemCost };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { start_time, end_time, place_types, user_lat, user_lng, radius_km } = body;
    const days = parseInt(body.days);
    const budget = parseInt(body.budget);

    if (!days || !budget) {
      return NextResponse.json({ error: 'กรุณากรอกจำนวนวันและงบประมาณ' }, { status: 400 });
    }

    const dayStart = toMin(start_time) ?? 8 * 60;
    const dayEnd = toMin(end_time) ?? 18 * 60;
    if (dayEnd - dayStart < 120) {
      return NextResponse.json({ error: 'ช่วงเวลาเที่ยวต่อวันต้องไม่น้อยกว่า 2 ชั่วโมง' }, { status: 400 });
    }

    let placesQuery = `
      SELECT p.name, p.description, p.open_time, p.close_time, p.latitude, p.longitude, c.name as category_name
      FROM places p
      LEFT JOIN categories c ON p.category_id = c.category_id
    `;
    const queryParams = [];
    if (place_types && place_types.length > 0) {
      placesQuery += ` WHERE p.category_id IN (${place_types.map(() => '?').join(',')})`;
      queryParams.push(...place_types);
    }
    const [rows] = await pool.query(placesQuery, queryParams);

    const startPoint = user_lat && user_lng ? { lat: parseFloat(user_lat), lng: parseFloat(user_lng) } : null;
    const maxRadius = radius_km || 200;

    let places = rows.map(r => {
      const lat = parseFloat(r.latitude), lng = parseFloat(r.longitude);
      const p = {
        name: r.name,
        category: r.category_name || '',
        desc: (r.description || '').slice(0, 80),
        lat, lng,
        open: toMin(r.open_time),
        close: toMin(r.close_time),
        visit: visitMinutes(r.category_name || ''),
      };
      p.distFromStart = startPoint ? roadKm(startPoint, p) : null;
      return p;
    });

    if (startPoint) {
      places = places
        .filter(p => p.distFromStart !== null && p.distFromStart / ROAD_FACTOR <= maxRadius)
        .sort((a, b) => a.distFromStart - b.distFromStart);
    }

    if (places.length === 0) {
      return NextResponse.json({
        plan: {
          title: `ไม่พบสถานที่ในรัศมี ${maxRadius} กม.`,
          summary: `ไม่พบสถานที่ท่องเที่ยวภายในรัศมี ${maxRadius} กิโลเมตรจากจุดเริ่มต้นของคุณ กรุณาเพิ่มระยะทางแล้วลองใหม่อีกครั้ง`,
          total_budget: '-',
          days: [],
          tips: ['ลองเพิ่มระยะทางในตัวเลื่อน (Slider) ให้มากขึ้น', 'หรือเปลี่ยนจุดเริ่มต้นให้ใกล้แหล่งท่องเที่ยวมากขึ้น']
        }
      });
    }

    // จำกัดจำนวนตัวเลือกเพื่อคุม token และให้ AI ตัดสินใจง่ายขึ้น
    const maxCandidates = Math.min(25, days * 6 + 4);
    const candidates = places.slice(0, maxCandidates).map((p, i) => ({ ...p, id: `P${i + 1}` }));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      const mockPlan = {
        title: `แผนท่องเที่ยวหล่มสัก ${days} วัน`,
        summary: `แผนท่องเที่ยวอำเภอหล่มสัก จ.เพชรบูรณ์ ${days} วัน งบประมาณ ${budget} บาท`,
        total_budget: `${budget} บาท`,
        days: Array.from({ length: parseInt(days) }, (_, i) => ({
          day: i + 1,
          title: `วันที่ ${i + 1} - สำรวจหล่มสัก`,
          activities: candidates.slice(0, 3).map((p, j) => ({
            time: `${8 + j * 2}:00 - ${10 + j * 2}:00`,
            place: p.name,
            description: p.desc || 'เที่ยวชมสถานที่',
            cost: `${Math.round(parseInt(budget) / parseInt(days) / 3)} บาท`,
            tips: 'ควรไปช่วงเช้าจะได้บรรยากาศดี'
          }))
        })),
        tips: ['เตรียมรองเท้าที่สวมใส่สบาย', 'พกน้ำดื่มให้เพียงพอ', 'ตรวจสอบสภาพอากาศก่อนเดินทาง']
      };
      await pool.query(
        'INSERT INTO trip_plans (days, budget, start_time, end_time, place_types, plan_result) VALUES (?, ?, ?, ?, ?, ?)',
        [days, budget, start_time, end_time, place_types?.join(','), JSON.stringify(mockPlan)]
      );
      return NextResponse.json({ plan: mockPlan, note: 'กรุณาตั้งค่า GEMINI_API_KEY เพื่อใช้ AI จริง' });
    }

    // ข้อมูลสถานที่ + ตารางเวลาเดินทาง (นาที) ที่ server คำนวณให้ AI ไม่ต้องเดาเอง
    const placeLines = candidates.map(p => {
      const hours = p.open !== null && p.close !== null ? `${toHHMM(p.open)}-${toHHMM(p.close)}` : 'unknown';
      const fromStart = startPoint ? `|start→${travelMin(p.distFromStart)}m` : '';
      const kind = isLodging(p.category) ? 'LODGING' : `visit~${p.visit}m`;
      return `${p.id}|${p.name}|${p.category}|open ${hours}|${kind}${fromStart}`;
    }).join('\n');

    const matrix = candidates.map(a =>
      `${a.id}:${candidates.map(b => (a === b ? 0 : travelMin(roadKm(a, b)))).join(',')}`
    ).join('\n');

    const hasLodging = candidates.some(p => isLodging(p.category));
    const dailyMinutes = dayEnd - dayStart;

    const prompt = `Plan a realistic ${days}-day car trip in Lomsak, Phetchabun, Thailand.
Budget: ${budget} THB total for 1 traveler (fuel is calculated separately: ~${FUEL_THB_PER_KM} THB/km). Daily window: ${start_time}-${end_time} (${dailyMinutes} min).
${startPoint ? 'Day 1 starts at the traveler\'s location (start→ = travel minutes from it).' : 'Start point unknown; begin day 1 at the most central place.'}

Places (id|name|category|opening hours|type & suggested visit minutes):
${placeLines}

Travel minutes by car between places (row order = column order = ${candidates[0].id}..${candidates[candidates.length - 1].id}):
${matrix}

Planning rules:
1. Time budget per day: sum(travel + visit + meals) must fit ${dailyMinutes} min. Leave ~15% slack. Typically 3-5 visits/day; never cram.
2. Route: order visits to minimize travel (follow the matrix, avoid zig-zag, no backtracking). Cluster nearby places on the same day.
3. Opening hours: only schedule a place while open. Never repeat a place across days.
4. Fit by time of day: viewpoints at sunrise/early morning or late afternoon; waterfalls/nature 09:00-15:00; temples morning; markets per their open hours.
5. Meals: add a "meal" item for lunch between 11:30-13:30${dayEnd >= 18 * 60 ? ' and dinner after 17:30' : ''}; place it right after a nearby visit. Breakfast only if day starts before 08:00.
6. ${days > 1 ? (hasLodging ? 'End each day except the last with one "lodging" item (a LODGING id) close to the next day\'s first visit.' : 'No lodging in list: assume an overnight stay in Lomsak town; do not add lodging items.') : 'Single day: no lodging.'} LODGING ids are never "visit" items.
7. Budget: realistic local prices (entry fees often 0-50 THB, local meal 60-150 THB, lodging 500-1500 THB/night). Keep sum of costs + fuel within budget; scale choices down if budget is tight.
8. Use only ids from the list. Items are in chronological order; the server computes exact clock times.
9. All text values in Thai. description ≤ 25 words, tips ≤ 15 words, practical (what to bring, best spot, dress code).

Return JSON only:
{"title":"","summary":"","days":[{"day":1,"title":"","items":[{"type":"visit|meal|lodging","id":"P1 (visit/lodging only)","name":"(meal only: what/where to eat)","duration_min":60,"description":"","cost":0,"tips":""}]}],"tips":[""]}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
    });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let aiPlan;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      aiPlan = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch {
      return NextResponse.json({ error: 'AI ตอบกลับในรูปแบบที่ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' }, { status: 502 });
    }

    const { days: scheduledDays, warnings, transport, itemCost } = buildSchedule(aiPlan, candidates, startPoint, dayStart, dayEnd);
    const total = transport + itemCost;

    const tips = [...(Array.isArray(aiPlan.tips) ? aiPlan.tips : [])];
    if (total > budget) tips.unshift(`ค่าใช้จ่ายโดยประมาณ (${total.toLocaleString()} บาท) เกินงบที่ตั้งไว้ ${(total - budget).toLocaleString()} บาท`);
    tips.push(...warnings);

    const plan = {
      title: aiPlan.title || `แผนท่องเที่ยวหล่มสัก ${days} วัน`,
      summary: aiPlan.summary || '',
      total_budget: `${total.toLocaleString()} บาท (ค่าน้ำมันประมาณ ${transport.toLocaleString()} บาท)`,
      days: scheduledDays,
      tips,
    };

    await pool.query(
      'INSERT INTO trip_plans (days, budget, start_time, end_time, place_types, plan_result) VALUES (?, ?, ?, ?, ?, ?)',
      [days, budget, start_time, end_time, place_types?.join(','), JSON.stringify(plan)]
    );

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Trip planner error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการวางแผน' }, { status: 500 });
  }
}
