import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET images for a place
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const [images] = await pool.query(
      'SELECT * FROM place_images WHERE place_id = ? ORDER BY created_at DESC',
      [id]
    );
    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// POST add image
export async function POST(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Staff permission check
    if (user.role === 'staff') {
      const [perms] = await pool.query(
        'SELECT * FROM staff_permissions WHERE user_id = ? AND place_id = ?',
        [user.user_id, id]
      );
      if (perms.length === 0) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขสถานที่นี้' }, { status: 403 });
      }
    }

    const { image_url } = await request.json();

    if (!image_url) {
      return NextResponse.json({ error: 'กรุณาระบุ URL รูปภาพ' }, { status: 400 });
    }

    const [result] = await pool.query(
      'INSERT INTO place_images (place_id, image_url) VALUES (?, ?)',
      [id, image_url]
    );

    return NextResponse.json(
      { message: 'เพิ่มรูปภาพสำเร็จ', image_id: result.insertId },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// DELETE remove image
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('image_id');

    if (!imageId) {
      return NextResponse.json({ error: 'กรุณาระบุ image_id' }, { status: 400 });
    }

    // Staff permission check
    if (user.role === 'staff') {
      const [perms] = await pool.query(
        'SELECT * FROM staff_permissions WHERE user_id = ? AND place_id = ?',
        [user.user_id, id]
      );
      if (perms.length === 0) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขสถานที่นี้' }, { status: 403 });
      }
    }

    await pool.query('DELETE FROM place_images WHERE image_id = ? AND place_id = ?', [imageId, id]);
    return NextResponse.json({ message: 'ลบรูปภาพสำเร็จ' });
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
