const fs = require('fs');
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const createTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      userid VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      region VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      is_verified BOOLEAN DEFAULT false,
      otp VARCHAR(10),
      otp_expires TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS gold_assets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      type VARCHAR(50),
      weight NUMERIC(10,2),
      purchase_price NUMERIC(12,2),
      purchase_date DATE
    );
    CREATE TABLE IF NOT EXISTS gold_values (
      id SERIAL PRIMARY KEY,
      date DATE UNIQUE NOT NULL,
      price_per_gram NUMERIC(12,2) NOT NULL
    );
  `);
  console.log('Tables created/verified');
};

async function initDb() {
  const sql = fs.readFileSync(__dirname + '/init_db.sql', 'utf8');
  await pool.query(sql);
  console.log('Database initialized');
  await pool.end();
}

initDb().catch(e => {
  console.error('DB init failed:', e);
  process.exit(1);
});

createTables().then(() => process.exit()).catch(console.error);
