const pool = require('../config/database');

/**
 * RF10: Controlador de Denuncias y Comportamiento Indebido
 */
exports.createReport = async (req, res) => {
  try {
    const denuncianteId = req.user.id;
    const { denunciado_id, motivo } = req.body;
    
    // Captura del archivo físico si el estudiante adjuntó foto de pantalla/evidencia (Multer)
    const evidenciaUrl = req.file ? `/uploads/evidencias/${req.file.filename}` : null;

    if (!denunciado_id || !motivo || motivo.trim() === '') {
      return res.status(400).json({ error: 'Debes justificar el motivo del reporte obligatoriamente.' });
    }

    if (denuncianteId === parseInt(denunciado_id, 10)) {
      return res.status(400).json({ error: 'Lógica Inválida: No puedes auto-reportarte.' });
    }

    // Insertar Reporte en Base de Datos
    const insertSQL = `
      INSERT INTO reportes (denunciante_id, denunciado_id, motivo, evidencia_url, estado)
      VALUES ($1, $2, $3, $4, 'ABIERTO')
      RETURNING id, motivo, estado, creado_en
    `;
    
    const result = await pool.query(insertSQL, [denuncianteId, denunciado_id, motivo, evidenciaUrl]);

    // Opcional Analítico: Registrar evento silencioso RNF4
    await pool.query("INSERT INTO logs_eventos (usuario_id, tipo_evento, detalles) VALUES ($1, $2, $3)", 
         [denuncianteId, 'EMISIÓN_ALARMA_REPORTE', JSON.stringify({ reporte_id: result.rows[0].id })]);

    return res.status(201).json({
      message: 'Reporte registrado formalmente. Un moderador administrativo revisará tu evidencia.',
      ticket: result.rows[0]
    });

  } catch (error) {
    console.error('Error procesando reporte de conducta:', error);
    return res.status(500).json({ error: 'Fallo gravando el reporte en los servidores administrativos.' });
  }
};

/**
 * Obtener Infracciones del Usuario (Para notificarle si fue advertido o suspendido)
 */
exports.getInfracciones = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const sql = `
      SELECT id, motivo, estado, resolucion_admin, creado_en
      FROM reportes
      WHERE denunciado_id = $1 AND estado = 'RESUELTO' AND resolucion_admin IS NOT NULL
      ORDER BY creado_en DESC
    `;
    const result = await pool.query(sql, [usuarioId]);
    return res.status(200).json({ infracciones: result.rows });
  } catch (error) {
    return res.status(500).json({ error: 'Error obteniendo infracciones.' });
  }
};
