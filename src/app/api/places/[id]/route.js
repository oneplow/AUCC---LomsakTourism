import { NextResponse } from 'next/server';
import { requireAuth, getAuthUser } from '@/lib/auth';
import * as placesService from '@/services/placesService';

// GET single place
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const place = await placesService.getPlaceById(id);

    if (!place) {
      return NextResponse.json({ error: 'ไม่พบสถานที่' }, { status: 404 });
    }

    return NextResponse.json({ place });
  } catch (error) {
    console.error('Get place error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// PUT update place
export async function PUT(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Staff can only edit assigned places
    if (user.role === 'staff') {
      const hasPermission = await placesService.checkStaffPermission(user.user_id, id);
      if (!hasPermission) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขสถานที่นี้' }, { status: 403 });
      }
    }

    const body = await request.json();
    await placesService.updatePlace(id, body);

    return NextResponse.json({ message: 'อัปเดตสถานที่สำเร็จ' });
  } catch (error) {
    console.error('Update place error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// DELETE place (admin only)
export async function DELETE(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    await placesService.deletePlace(id);

    return NextResponse.json({ message: 'ลบสถานที่สำเร็จ' });
  } catch (error) {
    console.error('Delete place error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
