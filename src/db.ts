import { Pool } from 'pg'
import env from './env.js';

const pool = new Pool({
  connectionString: env.DATABASE_URL
});

// Optional: Test the connection on startup
pool.on('connect', () => {
  console.log('Database connected successfully');
});

export default pool;
