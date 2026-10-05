import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'lomsak-tourism-secret-key-2024';

/**
 * Hash a plaintext password using bcrypt
 * @param {string} password - The plaintext password to hash
 * @returns {string} The hashed password
 */
export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

/**
 * Compare a plaintext password with a hashed password
 * @param {string} password - The plaintext password
 * @param {string} hash - The hashed password to compare against
 * @returns {boolean} True if passwords match, false otherwise
 */
export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

/**
 * Generate a JWT token from a payload
 * @param {Object} payload - The data to encode in the token (user info)
 * @returns {string} The signed JWT token (expires in 7 days)
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify and decode a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {Object|null} The decoded payload if valid, null if invalid or expired
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Get the currently authenticated user from the request cookies
 * @returns {Promise<Object|null>} The user object from the JWT token, or null if not authenticated
 */
export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Middleware helper to require authentication and optionally check user roles
 * Use this in API routes to protect endpoints
 * @param {string[]} roles - Optional array of allowed roles (e.g., ['admin', 'staff'])
 * @returns {Promise<Object>} Returns { user } if authorized, or { error, status } if not
 * @example
 * const auth = await requireAuth(['admin']);
 * if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
 * const user = auth.user; // Authorized user
 */
export async function requireAuth(roles = []) {
  const user = await getAuthUser();
  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }
  if (roles.length > 0 && !roles.includes(user.role)) {
    return { error: 'Forbidden', status: 403 };
  }
  return { user };
}
