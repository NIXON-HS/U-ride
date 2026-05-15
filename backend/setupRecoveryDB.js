const pool = require('./src/config/database');

async function setup() {
  try {
    console.log('Creando tabla recuperaciones_contrasena...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recuperaciones_contrasena (
        email VARCHAR(100) PRIMARY KEY,
        codigo VARCHAR(10) NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Tabla creada correctamente.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

setup();
