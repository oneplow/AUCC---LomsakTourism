import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// PUT update category
export async function PUT(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'กรุณากรอกชื่อหมวดหมู่' }, { status: 400 });

    await pool.query('UPDATE categories SET name = ? WHERE category_id = ?', [name, id]);
    return NextResponse.json({ message: 'อัปเดตหมวดหมู่สำเร็จ' });
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// DELETE category
export async function DELETE(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    await pool.query('DELETE FROM categories WHERE category_id = ?', [id]);
    return NextResponse.json({ message: 'ลบหมวดหมู่สำเร็จ' });
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
