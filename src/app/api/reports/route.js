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
      // staff เห็นเฉพาะยอดของสถานที่ที่ตัวเองดูแล
      const isStaff = user.role === 'staff';
      const [rows] = await pool.query(
        `
        SELECT c.category_id, c.name, COUNT(pv.visit_id) as visit_count
        FROM categories c
        LEFT JOIN places p ON c.category_id = p.category_id
        ${isStaff ? 'LEFT JOIN staff_permissions sp ON p.place_id = sp.place_id AND sp.user_id = ?' : ''}
        LEFT JOIN place_visits pv ON p.place_id = pv.place_id${isStaff ? ' AND sp.permission_id IS NOT NULL' : ''}
        GROUP BY c.category_id
        ORDER BY visit_count DESC
      `,
        isStaff ? [user.user_id] : []
      );
      return NextResponse.json({ data: rows });
    }

    // ข้อมูลหน้าแดชบอร์ดทั้งหมดในคำขอเดียว (staff = เฉพาะสถานที่ที่ดูแล)
    // ใช้ CURDATE() ของฐานข้อมูลเป็น "วันนี้" ให้ตรงกับเวลาที่บันทึก visited_at
    if (type === 'dashboard') {
      const isStaff = user.role === 'staff';
      const join = isStaff
        ? ' JOIN staff_permissions sp ON pv.place_id = sp.place_id AND sp.user_id = ?'
        : '';
      const jp = isStaff ? [user.user_id] : [];
      const MONTH_START = "DATE_FORMAT(CURDATE(), '%Y-%m-01')";

      const queries = [
        // 0: ตัวเลขเทียบช่วงก่อนหน้า
        pool.query(
          `SELECT
             DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today_date,
             COALESCE(SUM(pv.visited_at >= CURDATE()), 0) AS today,
             COALESCE(SUM(pv.visited_at >= CURDATE() - INTERVAL 1 DAY AND pv.visited_at < CURDATE()), 0) AS yesterday,
             COALESCE(SUM(pv.visited_at >= CURDATE() - INTERVAL 6 DAY), 0) AS last7,
             COALESCE(SUM(pv.visited_at >= CURDATE() - INTERVAL 13 DAY AND pv.visited_at < CURDATE() - INTERVAL 6 DAY), 0) AS prev7,
             COALESCE(SUM(pv.visited_at >= ${MONTH_START}), 0) AS month,
             COALESCE(SUM(pv.visited_at >= ${MONTH_START} - INTERVAL 1 MONTH
               AND pv.visited_at < CURDATE() - INTERVAL 1 MONTH + INTERVAL 1 DAY
               AND pv.visited_at < ${MONTH_START}), 0) AS prev_month,
             COUNT(pv.visit_id) AS total
           FROM place_visits pv${join}`,
          jp
        ),
        // 1: ผู้เข้าชมรายวัน 30 วันล่าสุด
        pool.query(
          `SELECT DATE_FORMAT(pv.visited_at, '%Y-%m-%d') AS d, COUNT(*) AS total
           FROM place_visits pv${join}
           WHERE pv.visited_at >= CURDATE() - INTERVAL 29 DAY
           GROUP BY d`,
          jp
        ),
        // 2: สถานที่ยอดนิยม 3 อันดับ (30 วันล่าสุด)
        pool.query(
          `SELECT p.place_id, p.name, c.name AS category_name,
             (SELECT image_url FROM place_images WHERE place_id = p.place_id LIMIT 1) AS image_url,
             COUNT(pv.visit_id) AS visits
           FROM place_visits pv${join}
           JOIN places p ON p.place_id = pv.place_id
           LEFT JOIN categories c ON c.category_id = p.category_id
           WHERE pv.visited_at >= CURDATE() - INTERVAL 29 DAY
           GROUP BY p.place_id, p.name, c.name
           ORDER BY visits DESC
           LIMIT 3`,
          jp
        ),
        // 3: จำนวนสถานที่ (staff = ที่ดูแล)
        isStaff
          ? pool.query('SELECT COUNT(*) AS places FROM staff_permissions WHERE user_id = ?', [
              user.user_id,
            ])
          : pool.query(
              `SELECT (SELECT COUNT(*) FROM places) AS places,
                 (SELECT COUNT(*) FROM categories) AS categories,
                 (SELECT COUNT(*) FROM users) AS users`
            ),
        // 4: ชื่อผู้ใช้ล่าสุด
        pool.query('SELECT full_name FROM users WHERE user_id = ?', [user.user_id]),
      ];
      if (!isStaff) {
        // 5: แผนทริป AI (เฉพาะ admin)
        queries.push(
          pool.query(
            `SELECT
               COALESCE(SUM(created_at >= CURDATE() - INTERVAL 6 DAY), 0) AS last7,
               COALESCE(SUM(created_at >= CURDATE() - INTERVAL 13 DAY AND created_at < CURDATE() - INTERVAL 6 DAY), 0) AS prev7,
               COUNT(*) AS total
             FROM trip_plans`
          ),
          // 6: แผนทริปรายวัน 30 วันล่าสุด
          pool.query(
            `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS d, COUNT(*) AS total
             FROM trip_plans
             WHERE created_at >= CURDATE() - INTERVAL 29 DAY
             GROUP BY d`
          )
        );
      }

      const results = await Promise.all(queries);
      const [[visits], [daily], [top], [counts], [me], trips, tripDaily] = results;
      return NextResponse.json({
        role: user.role,
        full_name: me[0]?.full_name || user.full_name,
        visits: visits[0],
        daily,
        top,
        counts: counts[0],
        trips: trips ? trips[0][0] : null,
        tripDaily: tripDaily ? tripDaily[0] : [],
      });
    }

    // ยอดเข้าชมแยกรายสถานที่: ทั้งหมด / ทั้งปี / เดือนที่เลือก (staff = เฉพาะที่ดูแล)
    if (type === 'place_breakdown') {
      const now = new Date();
      const year = Number(searchParams.get('year')) || now.getFullYear();
      const month = Number(searchParams.get('month')) || now.getMonth() + 1;
      const isStaff = user.role === 'staff';
      const [rows] = await pool.query(
        `
        SELECT p.place_id, p.name, c.name AS category_name,
          COUNT(pv.visit_id) AS total_visits,
          COALESCE(SUM(YEAR(pv.visited_at) = ?), 0) AS year_visits,
          COALESCE(SUM(YEAR(pv.visited_at) = ? AND MONTH(pv.visited_at) = ?), 0) AS month_visits,
          MAX(pv.visited_at) AS last_visit
        FROM places p
        ${isStaff ? 'JOIN staff_permissions sp ON p.place_id = sp.place_id AND sp.user_id = ?' : ''}
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN place_visits pv ON p.place_id = pv.place_id
        GROUP BY p.place_id, p.name, c.name
        ORDER BY month_visits DESC, total_visits DESC
      `,
        [year, year, month, ...(isStaff ? [user.user_id] : [])]
      );
      return NextResponse.json({ data: rows, year, month });
    }

    if (type === 'daily_visits' || type === 'monthly_visits') {
      const now = new Date();
      const year = Number(searchParams.get('year')) || now.getFullYear();
      const month = Number(searchParams.get('month')) || now.getMonth() + 1;
      const staffJoin =
        user.role === 'staff'
          ? ' JOIN staff_permissions sp ON pv.place_id = sp.place_id AND sp.user_id = ?'
          : '';
      const staffParams = user.role === 'staff' ? [user.user_id] : [];

      if (type === 'daily_visits') {
        const [rows] = await pool.query(
          `
          SELECT DAY(pv.visited_at) AS day, COUNT(*) AS total, COUNT(DISTINCT pv.place_id) AS unique_places
          FROM place_visits pv${staffJoin}
          WHERE YEAR(pv.visited_at) = ? AND MONTH(pv.visited_at) = ?
          GROUP BY day
          ORDER BY day
        `,
          [...staffParams, year, month]
        );
        // แผนทริป AI ไม่ผูกกับสถานที่ใดโดยตรง จึงไม่ส่งให้ staff
        const [tripRows] = user.role === 'staff' ? [[]] : await pool.query(
          `
          SELECT DAY(created_at) AS day, COUNT(*) AS total
          FROM trip_plans
          WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
          GROUP BY day
          ORDER BY day
        `,
          [year, month]
        );
        return NextResponse.json({ data: rows, trips: tripRows, year, month });
      }

      const [rows] = await pool.query(
        `
        SELECT MONTH(pv.visited_at) AS month, COUNT(*) AS total
        FROM place_visits pv${staffJoin}
        WHERE YEAR(pv.visited_at) = ?
        GROUP BY month
        ORDER BY month
      `,
        [...staffParams, year]
      );
      const [tripRows] = user.role === 'staff' ? [[]] : await pool.query(
        `
        SELECT MONTH(created_at) AS month, COUNT(*) AS total
        FROM trip_plans
        WHERE YEAR(created_at) = ?
        GROUP BY month
        ORDER BY month
      `,
        [year]
      );
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
        },
      });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
