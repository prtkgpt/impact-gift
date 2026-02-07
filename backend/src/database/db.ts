import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  // Only log slow queries (>100ms) or in development mode
  if (duration > 100 || process.env.NODE_ENV === 'development') {
    const logLevel = duration > 100 ? 'SLOW' : 'INFO';
    console.log(`[${logLevel}] Query executed in ${duration}ms`, {
      rows: res.rowCount,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    });
  }

  return res;
};

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

export default pool;
