import { getPool, closePool } from '../../db/connection';

// This test requires a real database connection — skip in CI without credentials
const describeIfDb = process.env.AZURE_SQL_CONNECTION_STRING ? describe : describe.skip;

describeIfDb('Database Connection', () => {
  afterAll(async () => {
    await closePool();
  });

  it('should connect to Azure SQL', async () => {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 AS value');
    expect(result.recordset[0].value).toBe(1);
  });
});
