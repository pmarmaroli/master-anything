import sql from 'mssql';
import { DefaultAzureCredential } from '@azure/identity';
import dotenv from 'dotenv';

dotenv.config();

let pool: sql.ConnectionPool | null = null;

function parseConnectionString(): sql.config {
  const connString = process.env.AZURE_SQL_CONNECTION_STRING;
  if (!connString) {
    throw new Error('AZURE_SQL_CONNECTION_STRING is not set');
  }

  // Parse key=value pairs from the connection string
  const parts: Record<string, string> = {};
  for (const part of connString.split(';')) {
    const eqIndex = part.indexOf('=');
    if (eqIndex > 0) {
      const key = part.substring(0, eqIndex).trim().toLowerCase();
      const value = part.substring(eqIndex + 1).trim().replace(/^"|"$/g, '');
      parts[key] = value;
    }
  }

  // Extract server and port from "tcp:server,port" format
  let server = parts['server'] || parts['data source'] || '';
  let port = 1433;
  server = server.replace(/^tcp:/i, '');
  if (server.includes(',')) {
    const [host, p] = server.split(',');
    server = host;
    port = parseInt(p, 10);
  }

  const database = parts['initial catalog'] || parts['database'] || '';
  const useAzureAD = (parts['authentication'] || '').toLowerCase().includes('active directory');

  const config: sql.config = {
    server,
    port,
    database,
    options: {
      encrypt: parts['encrypt']?.toLowerCase() !== 'false',
      trustServerCertificate: parts['trustservercertificate']?.toLowerCase() === 'true',
    },
  };

  if (useAzureAD) {
    const credential = new DefaultAzureCredential();
    config.authentication = {
      type: 'azure-active-directory-access-token',
      options: {
        token: '', // will be set before connecting
      },
    };
    // Store credential for token acquisition
    (config as any)._credential = credential;
  } else {
    config.user = parts['user id'] || parts['uid'] || '';
    config.password = parts['password'] || parts['pwd'] || '';
  }

  return config;
}

async function acquireToken(config: sql.config): Promise<sql.config> {
  const credential = (config as any)._credential as DefaultAzureCredential | undefined;
  if (credential && config.authentication?.type === 'azure-active-directory-access-token') {
    const tokenResponse = await credential.getToken('https://database.windows.net/.default');
    config.authentication.options!.token = tokenResponse.token;
  }
  return config;
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    const config = parseConnectionString();
    const configWithToken = await acquireToken(config);
    pool = await sql.connect(configWithToken);
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}
