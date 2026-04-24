const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'uride'
});

// Comprobar conexión
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error conectando a PostgreSQL (U-Ride BD):', err.stack);
  }
  console.log('✅ Conectado exitosamente a PostgreSQL (U-Ride BD)');
  release();
});

module.exports = pool;
