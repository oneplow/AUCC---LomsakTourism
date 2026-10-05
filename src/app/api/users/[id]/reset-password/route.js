import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth, hashPassword } from '@/lib/auth';

// PUT reset password
export async function PUT(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
    }

    const hashed = hashPassword(password);
    await pool.query('UPDATE users SET password = ? WHERE user_id = ?', [hashed, id]);
    return NextResponse.json({ message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
