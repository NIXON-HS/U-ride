const pool = require('../config/database');

const isOwnerOrAdmin = (ride, user) => {
  if (!ride || !user) return false;
  return ride.conductor_id === user.id || user.rol === 'ADMINISTRADOR';
};

/**
 * RF3: Publicación de Viaje (Conductor)
 * Intersecta con PostGIS Origines/Destinos.
 */
exports.createRide = async (req, res) => {
  try {
    // ID obtenido desde el Payload del JSON Web Token
    const conductorId = req.user.id; 
    const { 
      origenLat, origenLon, 
      destinoLat, destinoLon, 
      fecha_salida, cupos_disponibles, 
      notas_reglas, costo_contribucion 
    } = req.body;

    // 1. Validaciones Geográficas (RNF2) y Temporales Totales
    if (!origenLat || !origenLon || !destinoLat || !destinoLon || !fecha_salida || cupos_disponibles === undefined) {
      return res.status(400).json({ 
        error: 'Las coordenadas, fecha y capacidad son obligatorias para publicar' 
      });
    }

    const checkSQL = 'SELECT activo FROM usuarios WHERE id = $1';
    const checkRes = await pool.query(checkSQL, [conductorId]);
    if (checkRes.rows[0].activo === false) {
      return res.status(403).json({ error: 'Tu cuenta está suspendida. Revisa tus Notificaciones para más información.' });
    }

    if (cupos_disponibles <= 0) {
      return res.status(400).json({ error: 'Debes tener la capacidad de al menos (1) pasajero para el Carpool.' });
    }

    // 2. Validación de Seguridad Estricta Institucional (RF9)
    if (!notas_reglas || notas_reglas.trim() === '') {
      return res.status(400).json({ 
        error: 'La seguridad es primero. Imponer Reglas Visibles / Notas del Viaje (Ej: No comida) es Obligatorio (RF9).' 
      });
    }

    // 3. Crear Viaje aplicando Motor de Inserción Nativa
    const insertSQL = `
      INSERT INTO viajes (
        conductor_id, origen_lat, origen_lon, destino_lat, destino_lon, 
        fecha_salida, cupos_disponibles, notas_reglas, costo_contribucion
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING id, conductor_id, fecha_salida, cupos_disponibles, estado
    `;
    
    // Asimilación de Latitudes Reales
    const values = [
      conductorId,
      origenLat, origenLon,
      destinoLat, destinoLon,
      fecha_salida,
      cupos_disponibles,
      notas_reglas.trim(),
      costo_contribucion || 0.00
    ];

    const result = await pool.query(insertSQL, values);
    const nuevoViaje = result.rows[0];

    // 4. Registro Asíncrono de Trazabilidad Central (RNF4)
    const loggerSQL = "INSERT INTO logs_eventos (usuario_id, tipo_evento, detalles) VALUES ($1, $2, $3)";
    await pool.query(loggerSQL, [conductorId, 'PUBLICACION_VIAJE', JSON.stringify({ viaje_id: nuevoViaje.id })]);

    return res.status(201).json({
      message: 'Tu viaje se ha publicado en el Tablero de Movilidad exitosamente.',
      viaje: nuevoViaje
    });

  } catch (error) {
    console.error('Error publicando viaje BD:', error);
    return res.status(500).json({ error: 'Fallo procesando la asignación del carpooling.' });
  }
};

/**
 * RF4 & RNF2: Búsqueda y Filtrado Geográfico (Pasajero)
 * Motor PostGIS para cruce de Coordenadas bajo Aislamiento
 */
exports.searchRides = async (req, res) => {
  try {
    const { lat, lon, radio, fecha } = req.query;

    // Obtener rol actualizado directo de la base de datos (por si el JWT está desactualizado)
    const userRes = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [req.user.id]);
    const currentRol = userRes.rows[0]?.rol || req.user.rol;

    // Si es CONDUCTOR, ignorar filtros espaciales y devolver SOLO sus viajes
    if (currentRol === 'CONDUCTOR') {
      const driverSQL = `
        SELECT v.id, v.conductor_id, v.fecha_salida, v.cupos_disponibles, v.notas_reglas, v.costo_contribucion, v.estado,
               u.nombre as conductor, u.reputacion_promedio as reputacion_conductor,
               v.origen_lat, v.origen_lon, v.destino_lat, v.destino_lon,
               COALESCE((
                 6371000 * acos(
                   LEAST(1.0, cos(radians(v.origen_lat)) * cos(radians(v.destino_lat)) *
                   cos(radians(v.destino_lon) - radians(v.origen_lon)) +
                   sin(radians(v.origen_lat)) * sin(radians(v.destino_lat)))
                 )
               ), 0) as metros_de_distancia
        FROM viajes v
        INNER JOIN usuarios u ON v.conductor_id = u.id
        WHERE v.conductor_id = $1
        ORDER BY v.fecha_salida DESC
      `;
      const result = await pool.query(driverSQL, [req.user.id]);
      return res.status(200).json({
        message: 'Tus viajes como conductor.',
        coincidencias_locales: result.rows.length,
        resultados: result.rows
      });
    }

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Parámetros obligatorios faltantes para buscar viajes cercanos en la Zona.' });
    }

    // Por defecto radio de 3000 Metros (3KM) - RNF2 Protegiendo puntos exactos
    const radioMetros = radio || 3000;

    // Motor Haversine Matemático: 6371000m es el radio exacto del Planeta Tierra. Calculamos Distancia Absoluta.
    let baseQuery = `
      SELECT v.id, v.fecha_salida, v.cupos_disponibles, v.notas_reglas, v.costo_contribucion,
             u.nombre as conductor, u.reputacion_promedio as reputacion_conductor,
             v.origen_lat, v.origen_lon,
             (6371000 * acos(cos(radians($1)) * cos(radians(v.origen_lat)) * cos(radians(v.origen_lon) - radians($2)) + sin(radians($1)) * sin(radians(v.origen_lat)))) as metros_de_distancia,
             EXISTS(SELECT 1 FROM solicitudes s WHERE s.viaje_id = v.id AND s.pasajero_id = $4) as ya_solicitado
      FROM viajes v
      INNER JOIN usuarios u ON v.conductor_id = u.id
      WHERE v.estado = 'ACTIVO' AND v.cupos_disponibles > 0
        AND (6371000 * acos(cos(radians($1)) * cos(radians(v.origen_lat)) * cos(radians(v.origen_lon) - radians($2)) + sin(radians($1)) * sin(radians(v.origen_lat)))) <= $3
    `;

    const values = [lat, lon, radioMetros, req.user.id];

    // Si filtraron por Fecha
    if (fecha) {
      baseQuery += ` AND DATE(v.fecha_salida) = DATE($5)`;
      values.push(fecha);
    }

    baseQuery += ` ORDER BY metros_de_distancia ASC LIMIT 25;`;

    const result = await pool.query(baseQuery, values);

    return res.status(200).json({
      message: 'Busqueda transversal zonal finalizada.',
      coincidencias_locales: result.rows.length,
      resultados: result.rows
    });

  } catch (error) {
    console.error('Error Crítico Buscador PostGIS:', error);
    return res.status(500).json({ error: 'Error del servidor analizando las zonas espaciales.' });
  }
};

/**
 * Historial de viajes del usuario para reportes
 */
exports.getMyTrips = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener rol actualizado de la BD
    const userRes = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [userId]);
    const rol = userRes.rows[0]?.rol || req.user.rol;
    
    let query = '';
    
    if (rol === 'CONDUCTOR') {
      query = `
        SELECT v.id, v.conductor_id, v.fecha_salida, v.origen_lat, v.origen_lon, v.destino_lat, v.destino_lon,
               v.cupos_disponibles, v.notas_reglas, v.costo_contribucion, v.estado, u.nombre as conductor
        FROM viajes v
        JOIN usuarios u ON v.conductor_id = u.id
        WHERE v.conductor_id = $1
        ORDER BY v.fecha_salida DESC
      `;
    } else {
      query = `
        SELECT v.id, v.conductor_id, v.fecha_salida, v.origen_lat, v.origen_lon, v.destino_lat, v.destino_lon,
               v.cupos_disponibles, v.notas_reglas, v.costo_contribucion, v.estado, u.nombre as conductor
        FROM viajes v
        JOIN usuarios u ON v.conductor_id = u.id
        JOIN solicitudes s ON s.viaje_id = v.id
        WHERE s.pasajero_id = $1 AND s.estado = 'ACEPTADO'
        ORDER BY v.fecha_salida DESC
      `;
    }

    const result = await pool.query(query, [userId]);
    
    return res.status(200).json({ viajes: result.rows });
  } catch (error) {
    return res.status(500).json({ error: 'Error obteniendo tus viajes.' });
  }
};

/**
 * Ver detalle de un viaje.
 */
exports.getRideById = async (req, res) => {
  try {
    const viajeId = req.params.id;

    const query = `
      SELECT v.id, v.conductor_id, v.fecha_salida, v.origen_lat, v.origen_lon, v.destino_lat, v.destino_lon,
             v.driver_lat, v.driver_lon,
             v.cupos_disponibles, v.notas_reglas, v.costo_contribucion, v.estado,
             u.nombre as conductor, u.reputacion_promedio as reputacion_conductor
      FROM viajes v
      JOIN usuarios u ON v.conductor_id = u.id
      WHERE v.id = $1
    `;

    const result = await pool.query(query, [viajeId]);
    const viaje = result.rows[0];

    if (!viaje) {
      return res.status(404).json({ error: 'El viaje no existe.' });
    }

    const isAdmin = req.user.rol === 'ADMINISTRADOR';
    const isOwner = viaje.conductor_id === req.user.id;

    let isAcceptedPassenger = false;
    if (!isAdmin && !isOwner) {
      const passengerRes = await pool.query(
        'SELECT 1 FROM solicitudes WHERE viaje_id = $1 AND pasajero_id = $2 AND estado = $3 LIMIT 1',
        [viajeId, req.user.id, 'ACEPTADO']
      );
      isAcceptedPassenger = passengerRes.rowCount > 0;
    }

    if (!isAdmin && !isOwner && !isAcceptedPassenger) {
      return res.status(403).json({ error: 'No tienes permisos para ver este viaje.' });
    }

    return res.status(200).json({ viaje });
  } catch (error) {
    return res.status(500).json({ error: 'Error obteniendo el viaje.' });
  }
};

/**
 * Editar un viaje publicado.
 */
exports.updateRide = async (req, res) => {
  try {
    const viajeId = req.params.id;
    const { origenLat, origenLon, destinoLat, destinoLon, fecha_salida, cupos_disponibles, notas_reglas, costo_contribucion } = req.body;

    const tripRes = await pool.query('SELECT conductor_id, estado FROM viajes WHERE id = $1', [viajeId]);
    const viaje = tripRes.rows[0];

    if (!viaje) {
      return res.status(404).json({ error: 'El viaje no existe.' });
    }

    if (viaje.conductor_id !== req.user.id && req.user.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'Solo el conductor puede editar este viaje.' });
    }

    if (viaje.estado !== 'ACTIVO') {
      return res.status(409).json({ error: 'Solo puedes editar un viaje activo.' });
    }

    const fields = [];
    const values = [];

    const addField = (column, value) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (origenLat !== undefined) addField('origen_lat', origenLat);
    if (origenLon !== undefined) addField('origen_lon', origenLon);
    if (destinoLat !== undefined) addField('destino_lat', destinoLat);
    if (destinoLon !== undefined) addField('destino_lon', destinoLon);
    if (fecha_salida !== undefined) addField('fecha_salida', fecha_salida);
    if (cupos_disponibles !== undefined) {
      if (Number(cupos_disponibles) < 0) {
        return res.status(400).json({ error: 'La capacidad no puede ser negativa.' });
      }
      addField('cupos_disponibles', cupos_disponibles);
    }
    if (notas_reglas !== undefined) {
      if (!String(notas_reglas).trim()) {
        return res.status(400).json({ error: 'Las reglas del viaje no pueden quedar vacías.' });
      }
      addField('notas_reglas', String(notas_reglas).trim());
    }
    if (costo_contribucion !== undefined) addField('costo_contribucion', costo_contribucion || 0);

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Debes enviar al menos un campo para actualizar.' });
    }

    values.push(viajeId);
    const updateSQL = `
      UPDATE viajes
      SET ${fields.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, conductor_id, fecha_salida, origen_lat, origen_lon, destino_lat, destino_lon,
                cupos_disponibles, notas_reglas, costo_contribucion, estado
    `;

    const result = await pool.query(updateSQL, values);
    const viajeActualizado = result.rows[0];

    await pool.query(
      'INSERT INTO logs_eventos (usuario_id, tipo_evento, detalles) VALUES ($1, $2, $3)',
      [req.user.id, 'ACTUALIZACION_VIAJE', JSON.stringify({ viaje_id: viajeId })]
    );

    return res.status(200).json({
      message: 'Viaje actualizado correctamente.',
      viaje: viajeActualizado
    });
  } catch (error) {
    console.error('Error actualizando viaje:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el viaje.' });
  }
};

/**
 * Iniciar un viaje publicado.
 */
exports.startRide = async (req, res) => {
  try {
    const viajeId = req.params.id;
    const { ignorarPago } = req.body;

    const tripRes = await pool.query('SELECT conductor_id, estado FROM viajes WHERE id = $1', [viajeId]);
    const viaje = tripRes.rows[0];

    if (!viaje) {
      return res.status(404).json({ error: 'El viaje no existe.' });
    }

    if (viaje.conductor_id !== req.user.id && req.user.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'Solo el conductor puede iniciar este viaje.' });
    }

    if (viaje.estado !== 'ACTIVO') {
      return res.status(409).json({ error: 'Solo puedes iniciar un viaje activo.' });
    }

    // Si no se indica forzar el inicio ignorando el pago, validar deudores
    if (!ignorarPago) {
      const unpaidRes = await pool.query(
        `SELECT u.nombre 
         FROM solicitudes s
         JOIN usuarios u ON s.pasajero_id = u.id
         WHERE s.viaje_id = $1 AND s.estado = 'ACEPTADO' AND s.pago_estado != 'COMPLETADO'`,
        [viajeId]
      );
      if (unpaidRes.rowCount > 0) {
        return res.status(200).json({
          requiereConfirmacionPago: true,
          pasajerosSinPago: unpaidRes.rows.map(r => r.nombre)
        });
      }
    }

    const result = await pool.query(
      `UPDATE viajes
       SET estado = 'EN_CURSO'
       WHERE id = $1
       RETURNING id, conductor_id, fecha_salida, cupos_disponibles, estado`,
      [viajeId]
    );

    await pool.query(
      'INSERT INTO logs_eventos (usuario_id, tipo_evento, detalles) VALUES ($1, $2, $3)',
      [req.user.id, 'INICIO_VIAJE', JSON.stringify({ viaje_id: viajeId })]
    );

    return res.status(200).json({
      message: 'Viaje iniciado correctamente.',
      viaje: result.rows[0]
    });
  } catch (error) {
    console.error('Error iniciando viaje:', error);
    return res.status(500).json({ error: 'No se pudo iniciar el viaje.' });
  }
};

/**
 * Eliminar un viaje publicado.
 */
exports.deleteRide = async (req, res) => {
  try {
    const viajeId = req.params.id;
    const tripRes = await pool.query('SELECT conductor_id, estado FROM viajes WHERE id = $1', [viajeId]);
    const viaje = tripRes.rows[0];

    if (!viaje) {
      return res.status(404).json({ error: 'El viaje no existe.' });
    }

    if (viaje.conductor_id !== req.user.id && req.user.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'Solo el conductor puede eliminar este viaje.' });
    }

    if (viaje.estado !== 'ACTIVO') {
      return res.status(409).json({ error: 'Solo puedes eliminar un viaje activo que aún no ha iniciado.' });
    }

    await pool.query('DELETE FROM viajes WHERE id = $1', [viajeId]);

    await pool.query(
      'INSERT INTO logs_eventos (usuario_id, tipo_evento, detalles) VALUES ($1, $2, $3)',
      [req.user.id, 'ELIMINACION_VIAJE', JSON.stringify({ viaje_id: viajeId })]
    );

    return res.status(200).json({ message: 'Viaje eliminado correctamente.' });
  } catch (error) {
    console.error('Error eliminando viaje:', error);
    return res.status(500).json({ error: 'No se pudo eliminar el viaje.' });
  }
};

/**
 * Obtener participantes de un viaje específico para reportar
 */
exports.getTripParticipants = async (req, res) => {
  try {
    const viajeId = req.params.id;
    const userId = req.user.id;

    const query = `
      SELECT u.id, u.nombre, 'CONDUCTOR' as rol_viaje
      FROM usuarios u
      JOIN viajes v ON v.conductor_id = u.id
      WHERE v.id = $1 AND u.id != $2
      UNION
      SELECT u.id, u.nombre, 'PASAJERO' as rol_viaje
      FROM usuarios u
      JOIN solicitudes s ON s.pasajero_id = u.id
      WHERE s.viaje_id = $1 AND s.estado = 'ACEPTADO' AND u.id != $2
    `;
    const result = await pool.query(query, [viajeId, userId]);

    return res.status(200).json({ participantes: result.rows });
  } catch (error) {
    return res.status(500).json({ error: 'Error obteniendo participantes.' });
  }
};

/**
 * Finalizar un viaje en curso.
 */
exports.finishRide = async (req, res) => {
  try {
    const viajeId = req.params.id;
    const tripRes = await pool.query('SELECT conductor_id, estado FROM viajes WHERE id = $1', [viajeId]);
    const viaje = tripRes.rows[0];

    if (!viaje) {
      return res.status(404).json({ error: 'El viaje no existe.' });
    }

    if (viaje.conductor_id !== req.user.id && req.user.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'Solo el conductor puede finalizar este viaje.' });
    }

    if (viaje.estado !== 'EN_CURSO') {
      return res.status(409).json({ error: 'Solo puedes finalizar un viaje que esté en curso.' });
    }

    const result = await pool.query(
      `UPDATE viajes
       SET estado = 'CERRADO'
       WHERE id = $1
       RETURNING id, conductor_id, fecha_salida, cupos_disponibles, estado`,
      [viajeId]
    );

    await pool.query(
      'INSERT INTO logs_eventos (usuario_id, tipo_evento, detalles) VALUES ($1, $2, $3)',
      [req.user.id, 'FINALIZACION_VIAJE', JSON.stringify({ viaje_id: viajeId })]
    );

    return res.status(200).json({ message: 'Viaje finalizado correctamente.', viaje: result.rows[0] });
  } catch (error) {
    console.error('Error finalizando viaje:', error);
    return res.status(500).json({ error: 'No se pudo finalizar el viaje.' });
  }
};

/**
 * Actualizar ubicación actual del conductor (GPS Tracking)
 */
exports.updateRideLocation = async (req, res) => {
  try {
    const viajeId = req.params.id;
    const { latitud, longitud } = req.body;

    if (latitud === undefined || longitud === undefined) {
      return res.status(400).json({ error: 'Latitud y longitud son requeridas.' });
    }

    // Verificar que el viaje existe y el usuario es el conductor
    const tripRes = await pool.query('SELECT conductor_id, estado FROM viajes WHERE id = $1', [viajeId]);
    const viaje = tripRes.rows[0];

    if (!viaje) {
      return res.status(404).json({ error: 'El viaje no existe.' });
    }

    if (viaje.conductor_id !== req.user.id && req.user.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'Solo el conductor del viaje puede reportar ubicación.' });
    }

    if (viaje.estado !== 'EN_CURSO') {
      return res.status(409).json({ error: 'Solo puedes reportar ubicación en un viaje que esté en curso.' });
    }

    await pool.query(
      `UPDATE viajes
       SET driver_lat = $1, driver_lon = $2
       WHERE id = $3`,
      [latitud, longitud, viajeId]
    );

    return res.status(200).json({ message: 'Ubicación de trayecto actualizada.' });

  } catch (error) {
    console.error('Error actualizando ubicación GPS del viaje:', error);
    return res.status(500).json({ error: 'No se pudo actualizar la ubicación del viaje.' });
  }
};

