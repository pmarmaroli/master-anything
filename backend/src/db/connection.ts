import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    const connString = process.env.AZURE_SQL_CONNECTION_STRING;
    if (!connString) {
      throw new Error('AZURE_SQL_CONNECTION_STRING is not set');
    }
    pool = await sql.connect(connString);
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}
