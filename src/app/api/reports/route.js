import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth, getAuthUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'top_visited';

    if (type === 'top_visited') {
      let query = `
        SELECT p.place_id, p.name, c.name as category_name, COUNT(pv.visit_id) as visit_count
        FROM places p
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN place_visits pv ON p.place_id = pv.place_id
      `;
      const params = [];

      if (user.role === 'staff') {
        query += ` JOIN staff_permissions sp ON p.place_id = sp.place_id AND sp.user_id = ?`;
        params.push(user.user_id);
      }

      query += ` GROUP BY p.place_id ORDER BY visit_count DESC LIMIT 10`;

      const [rows] = await pool.query(query, params);
      return NextResponse.json({ data: rows });
    }

    if (type === 'trip_usage') {
      const [rows] = await pool.query(
        'SELECT COUNT(*) as total_trips, MAX(created_at) as last_trip FROM trip_plans'
      );
      return NextResponse.json({ data: rows[0] });
    }

    if (type === 'popular_categories') {
      const [rows] = await pool.query(`
        SELECT c.category_id, c.name, COUNT(pv.visit_id) as visit_count
        FROM categories c
        LEFT JOIN places p ON c.category_id = p.category_id
        LEFT JOIN place_visits pv ON p.place_id = pv.place_id
        GROUP BY c.category_id
        ORDER BY visit_count DESC
      `);
      return NextResponse.json({ data: rows });
    }

    if (type === 'daily_visits' || type === 'monthly_visits') {
      const now = new Date();
      const year = Number(searchParams.get('year')) || now.getFullYear();
      const month = Number(searchParams.get('month')) || now.getMonth() + 1;
      const staffJoin = user.role === 'staff' ? ' JOIN staff_permissions sp ON pv.place_id = sp.place_id AND sp.user_id = ?' : '';
      const staffParams = user.role === 'staff' ? [user.user_id] : [];

      if (type === 'daily_visits') {
        const [rows] = await pool.query(`
          SELECT DAY(pv.visited_at) AS day, COUNT(*) AS total, COUNT(DISTINCT pv.place_id) AS unique_places
          FROM place_visits pv${staffJoin}
          WHERE YEAR(pv.visited_at) = ? AND MONTH(pv.visited_at) = ?
          GROUP BY day
          ORDER BY day
        `, [...staffParams, year, month]);
        const [tripRows] = await pool.query(`
          SELECT DAY(created_at) AS day, COUNT(*) AS total
          FROM trip_plans
          WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
          GROUP BY day
          ORDER BY day
        `, [year, month]);
        return NextResponse.json({ data: rows, trips: tripRows, year, month });
      }

      const [rows] = await pool.query(`
        SELECT MONTH(pv.visited_at) AS month, COUNT(*) AS total
        FROM place_visits pv${staffJoin}
        WHERE YEAR(pv.visited_at) = ?
        GROUP BY month
        ORDER BY month
      `, [...staffParams, year]);
      const [tripRows] = await pool.query(`
        SELECT MONTH(created_at) AS month, COUNT(*) AS total
        FROM trip_plans
        WHERE YEAR(created_at) = ?
        GROUP BY month
        ORDER BY month
      `, [year]);
      return NextResponse.json({ data: rows, trips: tripRows, year });
    }

    if (type === 'summary') {
      const [placesCount] = await pool.query('SELECT COUNT(*) as count FROM places');
      const [visitsCount] = await pool.query('SELECT COUNT(*) as count FROM place_visits');
      const [tripsCount] = await pool.query('SELECT COUNT(*) as count FROM trip_plans');
      const [usersCount] = await pool.query('SELECT COUNT(*) as count FROM users');
      const [categoriesCount] = await pool.query('SELECT COUNT(*) as count FROM categories');

      return NextResponse.json({
        data: {
          places: placesCount[0].count,
          visits: visitsCount[0].count,
          trips: tripsCount[0].count,
          users: usersCount[0].count,
          categories: categoriesCount[0].count,
        }
      });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
