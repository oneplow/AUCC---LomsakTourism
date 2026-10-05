import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth, hashPassword } from '@/lib/auth';

// PUT update user
export async function PUT(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const { full_name, email, role } = await request.json();

    await pool.query(
      'UPDATE users SET full_name = ?, email = ?, role = ? WHERE user_id = ?',
      [full_name, email, role, id]
    );

    return NextResponse.json({ message: 'อัปเดตผู้ใช้สำเร็จ' });
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// DELETE user
export async function DELETE(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    await pool.query('DELETE FROM users WHERE user_id = ?', [id]);
    return NextResponse.json({ message: 'ลบผู้ใช้สำเร็จ' });
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
