const { Pool } = require('pg');

let dbWrapperInstance;

async function getDb() {
  if (dbWrapperInstance) return dbWrapperInstance;
  
  let pool;
  if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Supabase requirement
      });
  } else {
      pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'postgres',
        port: process.env.DB_PORT || 5432
      });
  }

  // Convert MySQL '?' to PostgreSQL '$1', '$2', etc.
  const convertQuery = (sql) => {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
  };

  // Create a wrapper to emulate our SQLite/MySQL signature
  const dbWrapper = {
      pool,
      
      get: async (sql, params = []) => {
          const res = await pool.query(convertQuery(sql), params);
          return res.rows.length > 0 ? res.rows[0] : null;
      },
      
      all: async (sql, params = []) => {
          const res = await pool.query(convertQuery(sql), params);
          return res.rows;
      },
      
      run: async (sql, params = []) => {
          const res = await pool.query(convertQuery(sql), params);
          return res;
      }
  };

  dbWrapperInstance = dbWrapper;
  return dbWrapperInstance;
}

module.exports = { getDb };
