const pool = require('../config/database');

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
        SELECT v.id, v.fecha_salida, v.cupos_disponibles, v.notas_reglas, v.costo_contribucion, v.estado,
               u.nombre as conductor, u.reputacion_promedio as reputacion_conductor,
               v.origen_lat, v.origen_lon,
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
             (6371000 * acos(cos(radians($1)) * cos(radians(v.origen_lat)) * cos(radians(v.origen_lon) - radians($2)) + sin(radians($1)) * sin(radians(v.origen_lat)))) as metros_de_distancia
      FROM viajes v
      INNER JOIN usuarios u ON v.conductor_id = u.id
      WHERE v.estado = 'ACTIVO' AND v.cupos_disponibles > 0
        AND (6371000 * acos(cos(radians($1)) * cos(radians(v.origen_lat)) * cos(radians(v.origen_lon) - radians($2)) + sin(radians($1)) * sin(radians(v.origen_lat)))) <= $3
    `;

    const values = [lat, lon, radioMetros];

    // Si filtraron por Fecha
    if (fecha) {
      baseQuery += ` AND DATE(v.fecha_salida) = DATE($4)`;
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
        SELECT v.id, v.fecha_salida, v.origen_lat, v.destino_lat, v.estado, u.nombre as conductor
        FROM viajes v
        JOIN usuarios u ON v.conductor_id = u.id
        WHERE v.conductor_id = $1
        ORDER BY v.fecha_salida DESC
      `;
    } else {
      query = `
        SELECT v.id, v.fecha_salida, v.origen_lat, v.destino_lat, v.estado, u.nombre as conductor
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

