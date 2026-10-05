import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
  try {
    const { days, budget, start_time, end_time, place_types, user_lat, user_lng, radius_km } = await request.json();

    if (!days || !budget) {
      return NextResponse.json({ error: 'กรุณากรอกจำนวนวันและงบประมาณ' }, { status: 400 });
    }

    // Haversine distance calculation (km)
    const haversine = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Get places from DB for context
    let placesQuery = `
      SELECT p.name, p.description, p.address, p.open_time, p.close_time, p.latitude, p.longitude, c.name as category_name
      FROM places p
      LEFT JOIN categories c ON p.category_id = c.category_id
    `;
    const queryParams = [];

    if (place_types && place_types.length > 0) {
      const placeholders = place_types.map(() => '?').join(',');
      placesQuery += ` WHERE p.category_id IN (${placeholders})`;
      queryParams.push(...place_types);
    }

    let [places] = await pool.query(placesQuery, queryParams);

    // Filter by radius if user location is provided
    const maxRadius = radius_km || 200;
    if (user_lat && user_lng) {
      places = places
        .map(p => {
          if (p.latitude && p.longitude) {
            p._distance_km = Math.round(haversine(user_lat, user_lng, parseFloat(p.latitude), parseFloat(p.longitude)) * 10) / 10;
          } else {
            p._distance_km = 9999;
          }
          return p;
        })
        .filter(p => p._distance_km <= maxRadius)
        .sort((a, b) => a._distance_km - b._distance_km); // ✅ Sort nearest first
    }

    const placesInfo = places.map((p, idx) =>
      `${idx + 1}. ${p.name} (${p.category_name})${p._distance_km < 9999 ? ` [${p._distance_km}km]` : ''} | Open: ${p.open_time}-${p.close_time} | ${p.latitude},${p.longitude}`
    ).join('\n');

    // If no places found in radius, return early with a helpful message
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

    const userLocationInfo = user_lat && user_lng
      ? `Start: ${user_lat},${user_lng} | Radius: ${maxRadius}km | Found ${places.length} places (sorted nearest→farthest)`
      : '';

    const prompt = `Plan ${days}-day trip to Lomsak, Phetchabun. Budget: ${budget} THB. Time: ${start_time}-${end_time}.${userLocationInfo ? '\n' + userLocationInfo : ''}

Available places:
${placesInfo}

Rules:
- Use ONLY places from list above (exact names)
- Start from nearest place, group nearby places same day
- Respect opening hours (Open time in list)
- Calculate realistic travel time between places (use distance [km])
- Fit activities within ${start_time}-${end_time} daily
- Each activity: exact place name + travel time from previous location
- Include lat,lng for every activity
- All output in Thai language

Return JSON:
{"title":"","summary":"","total_budget":"","days":[{"day":1,"title":"","activities":[{"time":"","place":"","description":"","cost":"","tips":"","lat":"","lng":""}]}],"tips":[]}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      // Return mock data if no API key
      const mockPlan = {
        title: `แผนท่องเที่ยวหล่มสัก ${days} วัน`,
        summary: `แผนท่องเที่ยวอำเภอหล่มสัก จ.เพชรบูรณ์ ${days} วัน งบประมาณ ${budget} บาท`,
        total_budget: `${budget} บาท`,
        days: Array.from({ length: parseInt(days) }, (_, i) => ({
          day: i + 1,
          title: `วันที่ ${i + 1} - สำรวจหล่มสัก`,
          activities: places.slice(0, 3).map((p, j) => ({
            time: `${8 + j * 2}:00 - ${10 + j * 2}:00`,
            place: p.name,
            description: p.description || 'เที่ยวชมสถานที่',
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON from response
    let plan;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      plan = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch {
      plan = { title: 'แผนท่องเที่ว', summary: responseText, days: [], tips: [] };
    }

    // Save to DB
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
