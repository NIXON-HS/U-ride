const pool = require('../config/database');

/**
 * RF11: Panel de Control del Administrador
 */

// 1. Obtener listado de todos los Reportes
exports.getAllReports = async (req, res) => {
  try {
    const querySQL = `
      SELECT r.id, r.motivo, r.evidencia_url, r.estado, r.creado_en, r.resolucion_admin,
             denunciante.nombre AS autor_denuncia, 
             denunciado.nombre AS persona_denunciada, denunciado.id AS persona_denunciada_id
      FROM reportes r
      JOIN usuarios denunciante ON r.denunciante_id = denunciante.id
      JOIN usuarios denunciado ON r.denunciado_id = denunciado.id
      ORDER BY r.estado ASC, r.creado_en DESC
    `;
    const result = await pool.query(querySQL);
    return res.status(200).json({ reportes: result.rows });
  } catch (error) {
    return res.status(500).json({ error: 'Error del servidor obteniendo reportes.' });
  }
};

// 2. Suspender a un usuario (Marcado Logico como Falso)
exports.suspendUser = async (req, res) => {
  try {
    const { usuario_id } = req.params;
    
    // Cambiar la bandera Booleana 'activo' a false
    const suspendSQL = 'UPDATE usuarios SET activo = FALSE WHERE id = $1 RETURNING id, nombre, activo';
    const result = await pool.query(suspendSQL, [usuario_id]);

    if (result.rows.length === 0) {
       return res.status(404).json({ error: 'Estudiante no ubicado en la base de datos.' });
    }

    // RNF4: Transacción Log Administrativa Estricta
    await pool.query("INSERT INTO logs_eventos (usuario_id, tipo_evento, detalles) VALUES ($1, $2, $3)", 
         [req.user.id, 'SUSPENSION_ADMINISTRATIVA', JSON.stringify({ suspendido_id: usuario_id })]);

    return res.status(200).json({ 
       message: 'Cuenta bloqueada correctamente.',
       data: result.rows[0]
    });

  } catch (error) {
    return res.status(500).json({ error: 'Error forzando la suspensión del usuario.' });
  }
};

// 3. Resolución de Reporte (Cerrar el Ticket)
exports.resolveReport = async (req, res) => {
  try {
    const { reporte_id } = req.params;
    const { nuevo_estado, resolucion_admin } = req.body; // 'RESUELTO' o 'DESESTIMADO', 'ADVERTENCIA' o 'SUSPENSION'

    const resolveSQL = 'UPDATE reportes SET estado = $1, resolucion_admin = $2 WHERE id = $3 RETURNING id, estado, resolucion_admin';
    const result = await pool.query(resolveSQL, [nuevo_estado, resolucion_admin || null, reporte_id]);

    return res.status(200).json({ message: 'Ticket actualizado.', ticket: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Error clausurando el reporte.' });
  }
};
