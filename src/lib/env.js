/**
 * Environment Variables Validation
 * ตรวจสอบและ validate ค่า environment variables ที่จำเป็นก่อน app เริ่มทำงาน
 */

const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];

const optionalEnvVars = {
  DB_PORT: '3306',
  DB_PASSWORD: '',
  GEMINI_API_KEY: '',
};

/**
 * ตรวจสอบและ validate environment variables
 */
function validateEnv() {
  const missing = [];

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        `Please check your .env file and ensure all required variables are set.\n` +
        `See .env.example for reference.`
    );
  }
}

/**
 * ดึงค่า environment variable พร้อม fallback
 */
function getEnvVar(name, defaultValue = undefined) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value;
}

// Validate เมื่อ module ถูก import
validateEnv();

/**
 * Validated environment object
 */
export const env = {
  // Database
  DB_HOST: getEnvVar('DB_HOST'),
  DB_PORT: parseInt(getEnvVar('DB_PORT', optionalEnvVars.DB_PORT), 10),
  DB_USER: getEnvVar('DB_USER'),
  DB_PASSWORD: getEnvVar('DB_PASSWORD', optionalEnvVars.DB_PASSWORD),
  DB_NAME: getEnvVar('DB_NAME'),

  // Authentication
  JWT_SECRET: getEnvVar('JWT_SECRET'),

  // Optional APIs
  GEMINI_API_KEY: getEnvVar('GEMINI_API_KEY', optionalEnvVars.GEMINI_API_KEY),
};

export default env;
