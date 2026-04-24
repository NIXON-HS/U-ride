const pool = require('../config/database');

/**
 * RF5: Enviar Solicitud (Pasajero a Conductor)
 */
exports.createRequest = async (req, res) => {
  try {
    const pasajeroId = req.user.id;
    const { viaje_id } = req.body;

    // 0. Verificar si el pasajero está suspendido
    const activoRes = await pool.query('SELECT activo FROM usuarios WHERE id = $1', [pasajeroId]);
    if (activoRes.rows[0]?.activo === false) {
      return res.status(403).json({ error: 'Tu cuenta está suspendida. Revisa tus Notificaciones para más información.' });
    }

    // 1. Integridad: Verificar existencia y cupos
    const viajeSQL = "SELECT conductor_id, cupos_disponibles FROM viajes WHERE id = $1 AND estado = 'ACTIVO'";
    const viajeRes = await pool.query(viajeSQL, [viaje_id]);

    if (viajeRes.rows.length === 0 || viajeRes.rows[0].cupos_disponibles <= 0) {
      return res.status(400).json({ error: 'Operación denegada. Viaje inexistente, inactivo o lleno.' });
    }

    // 2. Lógica Comercial: Conducirse a uno mismo
    if (viajeRes.rows[0].conductor_id === pasajeroId) {
      return res.status(400).json({ error: 'Excepción de Lógica: Un conductor no puede solicitar su propio viaje.' });
    }

    // 3. Prevención de Spam: Única solicitud por viaje
    const dupSQL = "SELECT id FROM solicitudes WHERE viaje_id = $1 AND pasajero_id = $2";
    const dupRes = await pool.query(dupSQL, [viaje_id, pasajeroId]);
    if (dupRes.rows.length > 0) {
      return res.status(409).json({ error: 'Usted ya posee una solicitud tramitándose hacia este viaje.' });
    }

    // 4. Inserción
    const insertSQL = "INSERT INTO solicitudes (viaje_id, pasajero_id, estado) VALUES ($1, $2, 'PENDIENTE') RETURNING *";
    const newRequest = await pool.query(insertSQL, [viaje_id, pasajeroId]);

    return res.status(201).json({ message: 'Solicitud extendida al conductor', solicitud: newRequest.rows[0] });

  } catch(error) {
    console.error('Error insertando solicitud:', error);
    return res.status(500).json({ error: 'Error procesando emparejamiento con el Servidor' });
  }
};

/**
 * RF6 y RF7: Gestión de Solicitudes y Confirmación (Conductor modera)
 * Transacciones ACID implementadas.
 */
exports.updateRequestStatus = async (req, res) => {
  // Transacción ACID (Evitar Inconsistencia de Datos en peticiones simultáneas)
  const client = await pool.connect();

  try {
    const conductorId = req.user.id; 
    const solicitudId = req.params.id;
    const { estado } = req.body; // Un string ('ACEPTADO' o 'RECHAZADO')

    if (!['ACEPTADO', 'RECHAZADO'].includes(estado)) {
      return res.status(400).json({ error: 'Estado prohibido.'});
    }

    await client.query('BEGIN'); // ★ INICIA TRANSACCIÓN

    // 1. Extraer con FOR UPDATE Lock
    const selectJoinSQL = `
      SELECT s.id, s.estado as status_actual, v.id as viaje_id, v.conductor_id, v.cupos_disponibles 
      FROM solicitudes s
      JOIN viajes v ON s.viaje_id = v.id
      WHERE s.id = $1 FOR UPDATE
    `;
    const transRes = await client.query(selectJoinSQL, [solicitudId]);

    if (transRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket de solicitud no encontrado.' });
    }

    const { status_actual, viaje_id, conductor_id, cupos_disponibles } = transRes.rows[0];

    // 2. Cumplimiento de Regla: Solo el dueño del vehículo administra
    if (conductor_id !== conductorId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Denegado. Usted no posee los permisos administrativos de este vehículo.' });
    }

    // 3. Evitar manipulación de ya gestionados
    if (status_actual !== 'PENDIENTE') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La solicitud no es alterable, ya fue procesada anteriormente.' });
    }

    // 4. Lógica Funcional "Resta de Cupos"
    if (estado === 'ACEPTADO') {
      if (cupos_disponibles <= 0) {
         await client.query('ROLLBACK');
         return res.status(400).json({ error: 'Fueraborda: El habitáculo ya se encuentra en capacidad máxima.' });
      }
      
      // Disparador Transaccional (Actualizar Cupos Reales de Viaje)
      await client.query('UPDATE viajes SET cupos_disponibles = cupos_disponibles - 1 WHERE id = $1', [viaje_id]);
      
      // Trazabilidad (RNF4)
      await client.query("INSERT INTO logs_eventos (usuario_id, tipo_evento, detalles) VALUES ($1, $2, $3)", 
         [conductorId, 'ACEPTACION_CUPO', JSON.stringify({ viaje_id, solicitud_id: solicitudId })]);
    }

    // 5. Consolidación de Decisión y Finalización "Commit" (RF7)
    const resolucionSQL = 'UPDATE solicitudes SET estado = $1 WHERE id = $2 RETURNING *';
    const finalResult = await client.query(resolucionSQL, [estado, solicitudId]);

    await client.query('COMMIT'); // ★ APROBADA TODA LA CADENA

    return res.status(200).json({ 
        message: `La solicitud fue marcada bajo estatutos de: ${estado}`, 
        solicitud: finalResult.rows[0] 
    });
    
  } catch(error) {
    await client.query('ROLLBACK'); // ★ REVERSIÓN POR FALLO (Protege Descuadre de Cupos)
    console.error('Fallo en Transaccion ACID de Solicitudes:', error);
    return res.status(500).json({ error: 'Error transaccional consolidando el cupo.' });
  } finally {
    client.release();
  }
};

/**
 * RF6 Helper: Obtener Solicitudes Pendientes para el Inbox del Conductor
 */
exports.getDriverRequests = async (req, res) => {
  try {
     const conductorId = req.user.id;
     const sql = `
       SELECT s.id, s.estado, s.pasajero_id, u.nombre as pasajero_nombre, u.reputacion_promedio, v.fecha_salida 
       FROM solicitudes s
       JOIN viajes v ON s.viaje_id = v.id
       JOIN usuarios u ON s.pasajero_id = u.id
       WHERE v.conductor_id = $1 AND s.estado = 'PENDIENTE'
     `;
     const result = await pool.query(sql, [conductorId]);
     return res.status(200).json({ solicitudes: result.rows });
  } catch(error) {
     return res.status(500).json({ error: "Error recuperando el buzón del conductor." });
  }
};

/**
 * RF6 Helper: Obtener Solicitudes Enviadas por el Pasajero
 */
exports.getPassengerRequests = async (req, res) => {
  try {
     const pasajeroId = req.user.id;
     const sql = `
       SELECT s.id, s.estado, s.creado_en,
              v.fecha_salida, v.estado as estado_viaje,
              u.nombre as conductor_nombre, u.reputacion_promedio as conductor_reputacion, u.telefono as conductor_telefono
       FROM solicitudes s
       JOIN viajes v ON s.viaje_id = v.id
       JOIN usuarios u ON v.conductor_id = u.id
       WHERE s.pasajero_id = $1
       ORDER BY s.creado_en DESC
     `;
     const result = await pool.query(sql, [pasajeroId]);
     return res.status(200).json({ solicitudes: result.rows });
  } catch(error) {
     return res.status(500).json({ error: "Error recuperando las solicitudes del pasajero." });
  }
};
