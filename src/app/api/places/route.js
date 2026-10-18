import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import * as placesService from '@/services/placesService';
import { revalidatePublicPages } from '@/lib/revalidatePublic';

// GET all places (public) with search, filter, pagination
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    const result = await placesService.getPlaces({ search, category, sort, page, limit });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get places error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// POST create new place (admin only)
export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อสถานที่' }, { status: 400 });
    }

    const placeId = await placesService.createPlace(body);
    revalidatePublicPages();

    return NextResponse.json({ message: 'เพิ่มสถานที่สำเร็จ', place_id: placeId }, { status: 201 });
  } catch (error) {
    console.error('Create place error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
