import pool from '@/lib/db';
import * as placesService from '@/services/placesService';

// ข้อมูลสาธารณะสำหรับ Server Components: query DB ตรง ไม่ต้อง fetch ผ่าน HTTP ไปหา API ของตัวเอง
// JSON round-trip เพื่อแปลง Date/Decimal ให้ส่งต่อเป็น props ของ Client Component ได้

export async function getCategories() {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name');
    return JSON.parse(JSON.stringify(rows));
  } catch (error) {
    console.error('Failed to load categories:', error);
    return [];
  }
}

export async function getPlacesSafe(options) {
  try {
    const { places } = await placesService.getPlaces(options);
    return JSON.parse(JSON.stringify(places));
  } catch (error) {
    console.error('Failed to load places:', error);
    return [];
  }
}
