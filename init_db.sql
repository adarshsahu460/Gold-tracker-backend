-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  userid VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  region VARCHAR(50) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  otp VARCHAR(10),
  otp_expires TIMESTAMP
);

-- Gold assets table
CREATE TABLE IF NOT EXISTS gold_assets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  weight NUMERIC(10,2) NOT NULL,
  purchase_price NUMERIC(10,2) NOT NULL,
  purchase_date DATE NOT NULL
);

-- Gold values table
CREATE TABLE IF NOT EXISTS gold_values (
  date DATE PRIMARY KEY,
  price_per_gram NUMERIC(10,2) NOT NULL
);
