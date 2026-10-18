import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET staff permissions
export async function GET(request) {
  try {
    const auth = await requireAuth(['admin', 'staff']);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    // staff ดูได้เฉพาะสิทธิ์ของตัวเอง ส่วน admin ระบุ user_id ใครก็ได้
    const userId = auth.user.role === 'admin' ? searchParams.get('user_id') : auth.user.user_id;

    // ?detail=1 → คืนข้อมูลสถานที่เต็มในคำขอเดียว (แทนการยิง /api/places/:id ทีละที่)
    if (searchParams.get('detail') === '1' && userId) {
      const [places] = await pool.query(
        `SELECT p.*, c.name AS category_name,
           (SELECT image_url FROM place_images WHERE place_id = p.place_id LIMIT 1) AS image_url,
           (SELECT COUNT(*) FROM place_visits WHERE place_id = p.place_id) AS visit_count
         FROM staff_permissions sp
         JOIN places p ON sp.place_id = p.place_id
         LEFT JOIN categories c ON p.category_id = c.category_id
         WHERE sp.user_id = ?
         ORDER BY sp.created_at DESC`,
        [userId]
      );
      return NextResponse.json({ user: auth.user, places });
    }

    let query = `
      SELECT sp.*, p.name as place_name, u.username, u.full_name
      FROM staff_permissions sp
      JOIN places p ON sp.place_id = p.place_id
      JOIN users u ON sp.user_id = u.user_id
    `;
    const params = [];

    if (userId) {
      query += ' WHERE sp.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY sp.created_at DESC';

    const [permissions] = await pool.query(query, params);
    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('GET /api/staff-permissions', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// POST assign permission
export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { user_id, place_id } = await request.json();
    if (!user_id || !place_id) {
      return NextResponse.json({ error: 'กรุณาระบุ user_id และ place_id' }, { status: 400 });
    }

    await pool.query('INSERT IGNORE INTO staff_permissions (user_id, place_id) VALUES (?, ?)', [
      user_id,
      place_id,
    ]);

    return NextResponse.json({ message: 'กำหนดสิทธิ์สำเร็จ' }, { status: 201 });
  } catch (error) {
    console.error('POST /api/staff-permissions', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// DELETE remove permission
export async function DELETE(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const permissionId = searchParams.get('id');

    if (!permissionId) {
      return NextResponse.json({ error: 'กรุณาระบุ permission_id' }, { status: 400 });
    }

    await pool.query('DELETE FROM staff_permissions WHERE permission_id = ?', [permissionId]);
    return NextResponse.json({ message: 'ลบสิทธิ์สำเร็จ' });
  } catch (error) {
    console.error('DELETE /api/staff-permissions', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
