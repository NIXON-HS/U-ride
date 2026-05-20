const pool = require('../config/database');

/**
 * RF8: Calificaciones y Reseñas
 * BK-9: Motor de Recálculo de Reputación 
 */
exports.createReview = async (req, res) => {
  const client = await pool.connect();
  try {
    const evaluadorId = req.user.id;
    const { viaje_id, evaluado_id, calificacion, comentario } = req.body;

    // 1. Validaciones Básicas
    if (!viaje_id || !evaluado_id || !calificacion) {
       return res.status(400).json({ error: 'Faltan parámetros obligatorios para emitir la evaluación.' });
    }

    if (calificacion < 1 || calificacion > 5) {
       return res.status(400).json({ error: 'Rango inaceptable. La evaluación debe ser estricta entre 1 y 5 estrellas.'});
    }

    if (evaluadorId === evaluado_id) {
       return res.status(400).json({ error: 'Violación de Criterio: No puedes autocalificar tu propio perfil.'});
    }

    // 2. Control de Replicación (Evitar Spam Eval)
    const dupCheck = await client.query(
      "SELECT id FROM evaluaciones WHERE viaje_id = $1 AND evaluador_id = $2 AND evaluado_id = $3", 
      [viaje_id, evaluadorId, evaluado_id]
    );

    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Ya has emitido tu evaluación oficial (Doble Ciego) a este tripulante en este viaje.' });
    }

    await client.query('BEGIN'); // ★ Transacción ACID (Evaluación + Recálculo del AVG global)

    // 3. Validar que el viaje exista y esté finalizado
    const viajeRes = await client.query('SELECT id, conductor_id, estado FROM viajes WHERE id = $1 FOR UPDATE', [viaje_id]);
    if (viajeRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'El viaje no existe.' });
    }
    const viaje = viajeRes.rows[0];
    if (viaje.estado !== 'CERRADO') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Solo se puede calificar tras finalizar el viaje.' });
    }

    // 4. Validar que el evaluador y evaluado participaron en el viaje
    const isEvaluatorDriver = viaje.conductor_id === evaluadorId;
    const isEvaluatorPassenger = !isEvaluatorDriver;

    if (isEvaluatorPassenger) {
      // evaluador debe tener una solicitud ACEPTADO en este viaje
      const partRes = await client.query('SELECT id FROM solicitudes WHERE viaje_id = $1 AND pasajero_id = $2 AND estado = $3', [viaje_id, evaluadorId, 'ACEPTADO']);
      if (partRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'No participaste como pasajero aceptado en este viaje.' });
      }
    } else {
      // evaluador es conductor: el evaluado debe ser un pasajero ACEPTADO en este viaje
      const partRes = await client.query('SELECT id FROM solicitudes WHERE viaje_id = $1 AND pasajero_id = $2 AND estado = $3', [viaje_id, evaluado_id, 'ACEPTADO']);
      if (partRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'El usuario evaluado no participó como pasajero aceptado en este viaje.' });
      }
    }

    // 5. Crear Reseña
    const insertSQL = `
      INSERT INTO evaluaciones (viaje_id, evaluador_id, evaluado_id, calificacion, comentario) 
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `;
    const insertRes = await client.query(insertSQL, [viaje_id, evaluadorId, evaluado_id, calificacion, comentario]);
    console.log(`[createReview] Evaluación insertada: ID ${insertRes.rows[0].id}, Evaluador ${evaluadorId}, Evaluado ${evaluado_id}, Viaje ${viaje_id}`);

    // 6. EL MOTOR DE REPUTACIÓN (BK-9)
    // Intercepta todos los viajes del evaluado, promedio aritmético de sus estrellas y actualiza su placa base. 
    // Round limit to 2 decimals. Default 5.00 COALESCE si no hay datos.
    const engineSQL = `
      UPDATE usuarios 
      SET reputacion_promedio = (
          SELECT COALESCE(ROUND(AVG(calificacion)::numeric, 2), 5.00) 
          FROM evaluaciones 
          WHERE evaluado_id = $1
      )
      WHERE id = $1
      RETURNING reputacion_promedio
    `;
    const ratingResult = await client.query(engineSQL, [evaluado_id]);

    // 7. Mantener la solicitud como ACEPTADO (no marcar para que ambos puedan calificar)
    // La tabla evaluaciones registra quién ya calificó a quién

    await client.query('COMMIT'); // ★ FIN TRANSACCIÓN

    return res.status(201).json({ 
      message: 'Evaluación asimilada con éxito en el ecosistema Cívico de U-Ride.',
      nuevo_score_estudiante: ratingResult.rows[0].reputacion_promedio
    });

  } catch(error) {
    await client.query('ROLLBACK');
    console.error('Error transaccional en Motor de Reputacion:', error);
    return res.status(500).json({ error: 'Fallo interno recalculando la variable de status reputacional.' });
  } finally {
    client.release();
  }
};
