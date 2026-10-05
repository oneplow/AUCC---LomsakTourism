/**
 * MySQL Database Connection Pool
 * 
 * This module creates and exports a MySQL connection pool using mysql2/promise.
 * The pool is stored globally to persist across hot-reloads during development.
 * 
 * Configuration:
 * - host: DB_HOST environment variable (default: localhost)
 * - port: DB_PORT environment variable (default: 3306)
 * - user: DB_USER environment variable (default: root)
 * - password: DB_PASSWORD environment variable (default: empty)
 * - database: DB_NAME environment variable (default: lomsak_tourism)
 * - connectionLimit: Maximum 10 simultaneous connections
 * - waitForConnections: Queue requests when all connections are busy
 * - queueLimit: Unlimited queue size
 * - enableKeepAlive: Maintain connections to prevent timeouts
 * 
 * @example
 * import pool from '@/lib/db';
 * 
 * const [rows] = await pool.query('SELECT * FROM places WHERE place_id = ?', [id]);
 */
import mysql from 'mysql2/promise';

let pool;

// Use global to persist connection pool across hot-reloads in development
if (!globalThis.__pool) {
  globalThis.__pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lomsak_tourism',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });
}

pool = globalThis.__pool;

export default pool;
