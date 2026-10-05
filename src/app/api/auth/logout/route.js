import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function POST() {
  try {
    const response = NextResponse.json({ message: 'ออกจากระบบสำเร็จ' });
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
