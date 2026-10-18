import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  FUEL_THB_PER_KM,
  ROAD_FACTOR,
  buildRoadMatrix,
  buildSchedule,
  isLodging,
  roadKm,
  roadKmFromStart,
  toHHMM,
  toMin,
  tripWeekday,
  visitMinutes,
} from '@/lib/tripSchedule';
import { parseOpenDays } from '@/lib/openDays';

const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function POST(request) {
  try {
    const body = await request.json();
    const { start_time, end_time, place_types, user_lat, user_lng, radius_km } = body;
    const startDate = tripWeekday(body.start_date, 0) === null ? null : body.start_date;
    const days = parseInt(body.days);
    const budget = parseInt(body.budget);

    if (!days || !budget) {
      return NextResponse.json({ error: 'กรุณากรอกจำนวนวันและงบประมาณ' }, { status: 400 });
    }

    const dayStart = toMin(start_time) ?? 8 * 60;
    const dayEnd = toMin(end_time) ?? 18 * 60;
    if (dayEnd - dayStart < 120) {
      return NextResponse.json(
        { error: 'ช่วงเวลาเที่ยวต่อวันต้องไม่น้อยกว่า 2 ชั่วโมง' },
        { status: 400 }
      );
    }

    let placesQuery = `
      SELECT p.name, p.description, p.open_time, p.close_time, p.open_days, p.latitude, p.longitude, c.name as category_name
      FROM places p
      LEFT JOIN categories c ON p.category_id = c.category_id
    `;
    const queryParams = [];
    if (place_types && place_types.length > 0) {
      placesQuery += ` WHERE p.category_id IN (${place_types.map(() => '?').join(',')})`;
      queryParams.push(...place_types);
    }
    const [rows] = await pool.query(placesQuery, queryParams);

    const startPoint =
      user_lat && user_lng ? { lat: parseFloat(user_lat), lng: parseFloat(user_lng) } : null;
    const maxRadius = radius_km || 200;

    let places = rows.map((r) => {
      const lat = parseFloat(r.latitude),
        lng = parseFloat(r.longitude);
      const p = {
        name: r.name,
        category: r.category_name || '',
        desc: (r.description || '').slice(0, 80),
        lat,
        lng,
        open: toMin(r.open_time),
        close: toMin(r.close_time),
        openDays: parseOpenDays(r.open_days),
        visit: visitMinutes(r.category_name || '', r.name || ''),
      };
      p.distFromStart = startPoint ? roadKm(startPoint, p) : null;
      return p;
    });

    // วันในสัปดาห์ของแต่ละวันทริป → ตัดสถานที่ที่ไม่เปิดเลยตลอดทริปออกตั้งแต่ต้น
    const tripWeekdays = startDate
      ? Array.from({ length: days }, (_, i) => tripWeekday(startDate, i))
      : null;
    if (tripWeekdays) {
      places = places.filter(
        (p) => !p.openDays || p.openDays.some((d) => tripWeekdays.includes(d))
      );
    }

    if (startPoint) {
      // รัศมีวัดแบบเส้นตรงตามตัวเลื่อน แล้วเรียง "ใกล้สุด" ด้วยระยะถนนจริงจาก OSRM
      // (จุดที่ดูใกล้บนแผนที่อาจต้องขับอ้อมไกลกว่า) — OSRM สาธารณะรับได้ ~100 พิกัด จึงส่ง 90 จุดแรก
      places = places
        .filter((p) => p.distFromStart !== null && p.distFromStart / ROAD_FACTOR <= maxRadius)
        .sort((a, b) => a.distFromStart - b.distFromStart);
      const head = places.slice(0, 90);
      const roadDist = await roadKmFromStart(startPoint, head);
      head.forEach((p, i) => {
        if (Number.isFinite(roadDist[i])) p.distFromStart = roadDist[i];
      });
      places = [...head.sort((a, b) => a.distFromStart - b.distFromStart), ...places.slice(90)];
    }

    if (places.length === 0) {
      return NextResponse.json({
        plan: {
          title: `ไม่พบสถานที่ในรัศมี ${maxRadius} กม.`,
          summary: `ไม่พบสถานที่ท่องเที่ยวภายในรัศมี ${maxRadius} กิโลเมตรจากจุดเริ่มต้นของคุณ กรุณาเพิ่มระยะทางแล้วลองใหม่อีกครั้ง`,
          total_budget: '-',
          days: [],
          tips: [
            'ลองเพิ่มระยะทางในตัวเลื่อน (Slider) ให้มากขึ้น',
            'หรือเปลี่ยนจุดเริ่มต้นให้ใกล้แหล่งท่องเที่ยวมากขึ้น',
          ],
        },
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
            tips: 'ควรไปช่วงเช้าจะได้บรรยากาศดี',
          })),
        })),
        tips: ['เตรียมรองเท้าที่สวมใส่สบาย', 'พกน้ำดื่มให้เพียงพอ', 'ตรวจสอบสภาพอากาศก่อนเดินทาง'],
      };
      await pool.query(
        'INSERT INTO trip_plans (days, budget, start_time, end_time, place_types, plan_result) VALUES (?, ?, ?, ?, ?, ?)',
        [days, budget, start_time, end_time, place_types?.join(','), JSON.stringify(mockPlan)]
      );
      return NextResponse.json({
        plan: mockPlan,
        note: 'กรุณาตั้งค่า GEMINI_API_KEY เพื่อใช้ AI จริง',
      });
    }

    // ตารางระยะทาง/เวลาตามถนนจริง (index สุดท้าย = จุดเริ่มต้นของผู้ใช้ ถ้ามี)
    const nodes = startPoint ? [...candidates, startPoint] : candidates;
    const roadMatrix = await buildRoadMatrix(nodes);
    const startIdx = startPoint ? candidates.length : null;

    const placeLines = candidates
      .map((p, i) => {
        const hours =
          p.open !== null && p.close !== null ? `${toHHMM(p.open)}-${toHHMM(p.close)}` : 'unknown';
        const fromStart = startPoint ? `|start→${roadMatrix.min[startIdx][i]}m` : '';
        const kind = isLodging(p.category) ? 'LODGING' : `visit~${p.visit}m`;
        const openDays = p.openDays
          ? ` ONLY ${p.openDays.map((d) => WEEKDAY_EN[d]).join('/')}`
          : '';
        return `${p.id}|${p.name}|${p.category}|open ${hours}${openDays}|${kind}${fromStart}`;
      })
      .join('\n');

    const matrix = candidates
      .map((a, i) => `${a.id}:${candidates.map((_, j) => roadMatrix.min[i][j]).join(',')}`)
      .join('\n');

    const hasLodging = candidates.some((p) => isLodging(p.category));
    const dailyMinutes = dayEnd - dayStart;

    const prompt = `Plan a realistic ${days}-day car trip in Lomsak, Phetchabun, Thailand.
Budget: ${budget} THB total for 1 traveler (fuel is calculated separately: ~${FUEL_THB_PER_KM} THB/km). Daily window: ${start_time}-${end_time} (${dailyMinutes} min).
${tripWeekdays ? `Weekdays: ${tripWeekdays.map((d, i) => `day${i + 1}=${WEEKDAY_EN[d]}`).join(', ')}. A place marked "ONLY <days>" may be scheduled only on a matching day.` : 'Travel date unknown: avoid places marked "ONLY <days>" unless nothing else fits.'}
${startPoint ? "Day 1 starts at the traveler's location (start→ = travel minutes from it)." : 'Start point unknown; begin day 1 at the most central place.'}

Places (id|name|category|opening hours|type & suggested visit minutes):
${placeLines}

Travel minutes by car between places (row order = column order = ${candidates[0].id}..${candidates[candidates.length - 1].id}):
${matrix}

Planning rules:
1. Time budget per day: sum(travel + visit + meals) must fit ${dailyMinutes} min. Leave ~15% slack. Typically 3-5 visits/day; never cram.
2. Route: order visits to minimize travel (follow the matrix, avoid zig-zag, no backtracking). Cluster nearby places on the same day.
3. Opening hours: only schedule a place while open. Never repeat a place across days. Places opening at/after 16:00 (night markets, walking streets) belong at the END of a day, and only if the daily window ends at least ~60 min after they open; otherwise leave them out.
4. Fit by time of day: viewpoints at sunrise/early morning or late afternoon; waterfalls/nature 09:00-15:00; temples morning; markets per their open hours.
5. Meals: add a "meal" item for lunch between 11:30-13:30${dayEnd >= 18 * 60 ? ' and dinner after 17:30' : ''}; place it right after a nearby visit. Breakfast only if day starts before 08:00.
6. ${days > 1 ? (hasLodging ? 'End each day except the last with one "lodging" item (a LODGING id) close to the next day\'s first visit.' : 'No lodging in list: assume an overnight stay in Lomsak town; do not add lodging items.') : 'Single day: no lodging.'} LODGING ids are never "visit" items.
7. Budget: realistic local prices (entry fees often 0-50 THB, local meal 60-150 THB, lodging 500-1500 THB/night). Keep sum of costs + fuel within budget; scale choices down if budget is tight.
8. Use only ids from the list. Your main job is choosing WHICH places go on WHICH day (cluster by area) and the right meals; the server re-orders visits within each day for the shortest route and computes exact clock times.
9. All text values in Thai. description ≤ 25 words, tips ≤ 15 words, practical (what to bring, best spot, dress code).

Return JSON only:
{"title":"","summary":"","days":[{"day":1,"title":"","items":[{"type":"visit|meal|lodging","id":"P1 (visit/lodging only)","name":"(meal only: what/where to eat)","duration_min":60,"description":"","cost":0,"tips":""}]}],"tips":[""]}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    // ลำดับ fallback: ตัวที่โควตาเยอะ/เสถียรขึ้นก่อน เพื่อสลับอัตโนมัติเมื่อติด limit (429/quota) หรือ 404
    const candidates_models = [
      ...new Set(
        [
          process.env.GEMINI_MODEL,
          // Lite = RPM สูง (15/10) เหมาะเป็น fallback ตอนติด limit
          'gemini-3.1-flash-lite',
          'gemini-3.5-flash-lite',
          'gemini-2.5-flash-lite',
          // Flash ปกติ (RPM 5) - ตามตารางโควตาที่คุณยังใช้ได้
          'gemini-3.8-flash',
          'gemini-3.7-flash',
          'gemini-3.6-flash',
          'gemini-3-flash',
          'gemini-2.5-flash',
          // alias รวม - ให้ API แมปไปรุ่นล่าสุดที่เปิดให้โปรเจกต์คุณ
          'gemini-flash-latest',
          'gemini-flash-lite-latest',
          // legacy เผื่อกลับมาเปิดใหม่
          'gemini-2.0-flash',
          'gemini-1.5-flash',
        ].filter(Boolean)
      ),
    ];

    let responseText = null;
    let lastError = null;
    for (const modelName of candidates_models) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
        });
        const result = await model.generateContent(prompt);
        responseText = result.response.text();
        if (responseText) {
          if (modelName !== candidates_models[0])
            console.log(`Gemini success with fallback model: ${modelName}`);
          break;
        }
      } catch (e) {
        lastError = e;
        const msg = e?.message || '';
        const status = e?.status;
        const isRetryable =
          status === 404 ||
          status === 429 ||
          status === 500 ||
          status === 502 ||
          status === 503 ||
          /not found|no longer available|quota|rate limit|resource exhausted|too many requests|overloaded|unavailable/i.test(
            msg
          );
        if (!isRetryable) throw e;
        console.warn(
          `Gemini model ${modelName} failed (${status || 'no status'}), trying next...`,
          msg.slice(0, 300)
        );
      }
    }
    if (!responseText) throw lastError || new Error('AI ไม่ตอบกลับ');

    let aiPlan;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      aiPlan = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch {
      return NextResponse.json(
        { error: 'AI ตอบกลับในรูปแบบที่ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' },
        { status: 502 }
      );
    }

    const {
      days: scheduledDays,
      warnings,
      transport,
      itemCost,
    } = buildSchedule(aiPlan, candidates, startPoint, dayStart, dayEnd, roadMatrix, startDate);
    const total = transport + itemCost;

    const tips = [...(Array.isArray(aiPlan.tips) ? aiPlan.tips : [])];
    if (total > budget)
      tips.unshift(
        `ค่าใช้จ่ายโดยประมาณ (${total.toLocaleString()} บาท) เกินงบที่ตั้งไว้ ${(total - budget).toLocaleString()} บาท`
      );
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
