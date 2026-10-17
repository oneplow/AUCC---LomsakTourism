import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { full_name, email, current_password, new_password } = body;

    // If changing password, verify current password first
    if (new_password) {
      if (!current_password) {
        return NextResponse.json({ error: 'กรุณาระบุรหัสผ่านปัจจุบัน' }, { status: 400 });
      }
      const [rows] = await pool.query('SELECT password FROM users WHERE user_id = ?', [
        user.user_id,
      ]);
      if (rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const valid = await bcrypt.compare(current_password, rows[0].password);
      if (!valid) {
        return NextResponse.json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, { status: 400 });
      }
      if (new_password.length < 6) {
        return NextResponse.json(
          { error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' },
          { status: 400 }
        );
      }
      const hashed = await bcrypt.hash(new_password, 10);
      await pool.query(
        'UPDATE users SET full_name = ?, email = ?, password = ? WHERE user_id = ?',
        [full_name || user.full_name, email || user.email, hashed, user.user_id]
      );
    } else {
      await pool.query('UPDATE users SET full_name = ?, email = ? WHERE user_id = ?', [
        full_name || user.full_name,
        email || user.email,
        user.user_id,
      ]);
    }

    return NextResponse.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ' });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
