import pool from '@/lib/db';
import { serializeOpenDays } from '@/lib/openDays';

/**
 * Get all places with search, filter, pagination
 */
export async function getPlaces({
  search = '',
  category = '',
  sort = 'newest',
  page = 1,
  limit = 12,
}) {
  const offset = (page - 1) * limit;

  let query = `
    SELECT p.*, c.name as category_name,
      (SELECT image_url FROM place_images WHERE place_id = p.place_id LIMIT 1) as image_url,
      (SELECT COUNT(*) FROM place_visits WHERE place_id = p.place_id) as visit_count
    FROM places p
    LEFT JOIN categories c ON p.category_id = c.category_id
    WHERE 1=1
  `;
  let countQuery = `SELECT COUNT(*) as total FROM places p WHERE 1=1`;
  const params = [];
  const countParams = [];

  if (search) {
    query += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.address LIKE ?)`;
    countQuery += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.address LIKE ?)`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
    countParams.push(searchTerm, searchTerm, searchTerm);
  }

  if (category) {
    query += ` AND p.category_id = ?`;
    countQuery += ` AND p.category_id = ?`;
    params.push(category);
    countParams.push(category);
  }

  if (sort === 'popular') {
    query += ` ORDER BY visit_count DESC`;
  } else if (sort === 'name') {
    query += ` ORDER BY p.name ASC`;
  } else {
    query += ` ORDER BY p.created_at DESC`;
  }

  query += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  // ยิงสอง query พร้อมกัน ไม่ต้องรอกันทีละตัว
  const [[places], [countResult]] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, countParams),
  ]);
  const total = countResult[0].total;

  return {
    places,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get single place by ID
 */
export async function getPlaceById(id) {
  const [[rows], [images]] = await Promise.all([
    pool.query(
      `SELECT p.*, c.name as category_name,
        (SELECT COUNT(*) FROM place_visits WHERE place_id = p.place_id) as visit_count
       FROM places p
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE p.place_id = ?`,
      [id]
    ),
    pool.query('SELECT * FROM place_images WHERE place_id = ?', [id]),
  ]);

  if (rows.length === 0) {
    return null;
  }

  return { ...rows[0], images };
}

/**
 * Create new place
 */
export async function createPlace(placeData) {
  const {
    category_id,
    name,
    description,
    history,
    address,
    latitude,
    longitude,
    open_time,
    close_time,
    phone,
    open_days,
  } = placeData;

  const [result] = await pool.query(
    `INSERT INTO places (category_id, name, description, history, address, latitude, longitude, open_time, close_time, phone, open_days)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      category_id,
      name,
      description,
      history,
      address,
      latitude,
      longitude,
      open_time,
      close_time,
      phone,
      serializeOpenDays(open_days),
    ]
  );

  return result.insertId;
}

/**
 * Update place by ID
 */
export async function updatePlace(id, placeData) {
  const {
    category_id,
    name,
    description,
    history,
    address,
    latitude,
    longitude,
    open_time,
    close_time,
    phone,
    open_days,
  } = placeData;

  await pool.query(
    `UPDATE places SET category_id=?, name=?, description=?, history=?, address=?, latitude=?, longitude=?, open_time=?, close_time=?, phone=?, open_days=?
     WHERE place_id=?`,
    [
      category_id,
      name,
      description,
      history,
      address,
      latitude,
      longitude,
      open_time,
      close_time,
      phone,
      serializeOpenDays(open_days),
      id,
    ]
  );
}

/**
 * Delete place by ID
 */
export async function deletePlace(id) {
  await pool.query('DELETE FROM places WHERE place_id = ?', [id]);
}

/**
 * Check if staff has permission to edit place
 */
export async function checkStaffPermission(userId, placeId) {
  const [perms] = await pool.query(
    'SELECT * FROM staff_permissions WHERE user_id = ? AND place_id = ?',
    [userId, placeId]
  );
  return perms.length > 0;
}
