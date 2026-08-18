import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

function createPool() {
  if (process.env.DATABASE_URL) {
    return mysql.createPool(process.env.DATABASE_URL);
  }

  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'goal_db',
    waitForConnections: true,
    connectionLimit: 10,
    // MariaDB / MySQL JSON columns return Buffer or string; parse in helpers
    dateStrings: true,
  });
}

export const pool = createPool();

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}
