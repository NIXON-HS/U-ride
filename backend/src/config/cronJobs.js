const cron = require('node-cron');
const pool = require('../config/database');

/**
 * Motor de Tareas en Segundo Plano (Cron Jobs)
 * Inicializado al arrancar el servidor.
 */
function initCronJobs() {
  // Ejecutar cada minuto estricto: * * * * *
  cron.schedule('* * * * *', async () => {
    try {
      // Usar NOW() - INTERVAL '5 minutes' para dar un margen de gracia opcional, 
      // pero el usuario pidió exactitud. Usamos NOW().
      // Ojo: En JS la hora local puede diferir de la DB si los Timezones no cruzan bien. 
      // PostgreSQL TIMESTAMP sin zona asume la hora insertada como literal. 
      // Es más seguro evaluar en el motor de la base de datos local directamente.
      
      const query = `
        UPDATE viajes 
        SET estado = 'CERRADO' 
        WHERE fecha_salida < NOW() 
          AND estado = 'ACTIVO'
        RETURNING id;
      `;
      
      const { rows } = await pool.query(query);
      
      if (rows.length > 0) {
        console.log(`[CRON] ${rows.length} viaje(s) expirado(s) y cerrado(s) automáticamente.`);
      }
    } catch (error) {
      console.error('[CRON] Error al cerrar viajes expirados:', error);
    }
  });

  console.log('✅ Motor de Tareas (Cron) inicializado. Revisando expiración cada 1 minuto.');
}

module.exports = initCronJobs;
