import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth, hashPassword } from '@/lib/auth';

// GET all users (admin only)
export async function GET() {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const [users] = await pool.query(
      'SELECT user_id, username, full_name, email, role, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// POST create user (admin only)
export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { username, password, full_name, email, role } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'กรุณากรอก username และ password' }, { status: 400 });
    }

    const [existing] = await pool.query('SELECT user_id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' }, { status: 409 });
    }

    const hashedPassword = hashPassword(password);
    const [result] = await pool.query(
      'INSERT INTO users (username, password, full_name, email, role) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, full_name, email, role || 'staff']
    );

    return NextResponse.json({ message: 'สร้างผู้ใช้สำเร็จ', user_id: result.insertId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
