import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST record a visit
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    await pool.query('INSERT INTO place_visits (place_id) VALUES (?)', [id]);
    return NextResponse.json({ message: 'บันทึกการเข้าชมสำเร็จ' });
  } catch (error) {
    console.error('Record visit error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
