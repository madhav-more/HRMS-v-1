import pg from 'pg';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
});

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    logger.info(`✅ PostgreSQL connected: ${config.db.host}:${config.db.port}/${config.db.database}`);
    client.release();
  } catch (error) {
    logger.error(`❌ PostgreSQL connection error: ${error.message}`);
    process.exit(1);
  }
};

export const query = (text, params) => pool.query(text, params);
