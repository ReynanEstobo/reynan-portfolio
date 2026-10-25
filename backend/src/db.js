import pg from 'pg';

const { Pool } = pg;
const needsSsl = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('sslmode=require');
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: needsSsl ? { rejectUnauthorized: false } : false });

export async function query(text, params) {
  return pool.query(text, params);
}

