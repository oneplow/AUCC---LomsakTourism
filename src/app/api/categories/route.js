import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET all categories
export async function GET() {
  try {
    const [categories] = await pool.query('SELECT * FROM categories ORDER BY name');
    return NextResponse.json({ categories }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// POST create category (admin only)
export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'กรุณากรอกชื่อหมวดหมู่' }, { status: 400 });

    const [result] = await pool.query('INSERT INTO categories (name) VALUES (?)', [name]);
    return NextResponse.json({ message: 'เพิ่มหมวดหมู่สำเร็จ', category_id: result.insertId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
