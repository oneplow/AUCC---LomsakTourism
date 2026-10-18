import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const tokenUser = await getAuthUser();
    if (!tokenUser) {
      return NextResponse.json({ error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });
    }

    // token เก็บแค่ข้อมูลตอน login (ไม่มี email และ full_name อาจเก่า) จึงอ่านค่าล่าสุดจากฐานข้อมูล
    try {
      const [rows] = await pool.query(
        'SELECT user_id, username, role, full_name, email FROM users WHERE user_id = ?',
        [tokenUser.user_id]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 401 });
      }
      return NextResponse.json({ user: { ...tokenUser, ...rows[0] } });
    } catch (dbError) {
      // ฐานข้อมูลมีปัญหา: ยังใช้ข้อมูลจาก token ได้ เพื่อไม่ให้หน้า admin/staff ล่มทั้งหน้า
      console.error('GET /api/auth/me db error', dbError);
      return NextResponse.json({ user: tokenUser });
    }
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
