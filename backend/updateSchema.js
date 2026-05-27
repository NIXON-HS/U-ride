const pool = require('./src/config/database');

async function update() {
  try {
    console.log("Starting database schema update for U-Ride payments...");
    await pool.query(`
      ALTER TABLE solicitudes 
      ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50),
      ADD COLUMN IF NOT EXISTS pago_estado VARCHAR(50) DEFAULT 'PENDIENTE',
      ADD COLUMN IF NOT EXISTS stripe_payment_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS monto_pagado DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS pago_fecha TIMESTAMP;

      ALTER TABLE viajes
      ADD COLUMN IF NOT EXISTS driver_lat FLOAT,
      ADD COLUMN IF NOT EXISTS driver_lon FLOAT;
    `);
    console.log("✅ Database schema updated successfully with payment and GPS columns!");
  } catch (err) {
    console.error("❌ Error updating database schema:", err);
  } finally {
    process.exit();
  }
}

update();
