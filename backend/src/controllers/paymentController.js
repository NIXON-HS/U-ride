const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_for_development');
const pool = require('../config/database');

/**
 * Procesar pago con Tarjeta utilizando Stripe (API Oficial)
 */
exports.processStripePayment = async (req, res) => {
  try {
    const { solicitudId, cardNumber, expMonth, expYear, cvc } = req.body;
    const pasajeroId = req.user.id;

    if (!solicitudId || !cardNumber || !expMonth || !expYear || !cvc) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios de la tarjeta o solicitud.' });
    }

    // 1. Obtener la solicitud y verificar el viaje
    const solSQL = `
      SELECT s.id, s.pasajero_id, s.estado as solicitud_estado, s.pago_estado, v.costo_contribucion, v.id as viaje_id
      FROM solicitudes s
      JOIN viajes v ON s.viaje_id = v.id
      WHERE s.id = $1
    `;
    const solRes = await pool.query(solSQL, [solicitudId]);

    if (solRes.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const sol = solRes.rows[0];

    if (sol.pasajero_id !== pasajeroId) {
      return res.status(403).json({ error: 'No tienes autorización para pagar esta solicitud.' });
    }

    if (sol.solicitud_estado !== 'ACEPTADO') {
      return res.status(400).json({ error: 'La solicitud debe ser ACEPTADA por el conductor antes de pagar.' });
    }

    if (sol.pago_estado === 'COMPLETADO') {
      return res.status(400).json({ error: 'Esta solicitud ya ha sido pagada.' });
    }

    const costo = parseFloat(sol.costo_contribucion);
    if (costo <= 0) {
      // Si el costo es cero, se marca como completado gratis
      await pool.query(
        `UPDATE solicitudes 
         SET metodo_pago = 'TARJETA', pago_estado = 'COMPLETADO', monto_pagado = 0, pago_fecha = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [solicitudId]
      );
      return res.status(200).json({ message: 'Pago sin costo completado.' });
    }

    // 2. Determinar el token de prueba apropiado para Stripe
    const cleanCard = cardNumber.replace(/\s+/g, '');
    let stripeToken = 'tok_visa'; // Token Visa por defecto para éxito

    // Mapear números específicos de prueba a declinaciones o tipos de tarjeta de Stripe
    if (cleanCard === '4000000000000027' || cleanCard === '4242424242420027') {
      stripeToken = 'tok_chargeDeclined';
    } else if (cleanCard.startsWith('34') || cleanCard.startsWith('37')) {
      stripeToken = 'tok_amex';
    } else if (cleanCard.startsWith('5') || cleanCard.startsWith('2')) {
      stripeToken = 'tok_mastercard';
    } else if (cleanCard.startsWith('6')) {
      stripeToken = 'tok_discover';
    } else if (cleanCard.startsWith('35')) {
      stripeToken = 'tok_jcb';
    } else if (cleanCard.startsWith('30') || cleanCard.startsWith('36') || cleanCard.startsWith('38')) {
      stripeToken = 'tok_diners';
    }

    // 3. Crear el cargo con Stripe usando el token correspondiente
    const charge = await stripe.charges.create({
      amount: Math.round(costo * 100), // Stripe maneja centavos
      currency: 'usd',
      source: stripeToken,
      description: `Aporte de gasolina U-Ride - Solicitud ${solicitudId}`,
      metadata: { solicitud_id: String(solicitudId), pasajero_id: String(pasajeroId) }
    });

    if (charge.status === 'succeeded') {
      // 4. Actualizar estado del pago en la base de datos
      await pool.query(
        `UPDATE solicitudes 
         SET metodo_pago = 'TARJETA', 
             pago_estado = 'COMPLETADO', 
             stripe_payment_id = $1, 
             monto_pagado = $2, 
             pago_fecha = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        [charge.id, costo, solicitudId]
      );

      // Registrar log de evento
      await pool.query(
        `INSERT INTO logs_eventos (usuario_id, tipo_evento, detalles) VALUES ($1, $2, $3)`,
        [pasajeroId, 'PAGO_STRIPE_COMPLETADO', JSON.stringify({ solicitud_id: solicitudId, payment_intent: charge.id, monto: costo })]
      );

      return res.status(200).json({
        message: 'Aporte de gasolina procesado exitosamente mediante Stripe.',
        stripe_id: charge.id,
        monto: costo
      });
    } else {
      return res.status(400).json({ error: `La transacción falló con estado: ${charge.status}` });
    }

  } catch (error) {
    console.error('Error procesando pago Stripe:', error);
    return res.status(500).json({ error: error.message || 'Error al procesar el pago con Stripe.' });
  }
};

/**
 * Declarar pago en Efectivo o Transferencia (Pasajero)
 */
exports.declareOfflinePayment = async (req, res) => {
  try {
    const { solicitudId, metodo } = req.body; // 'EFECTIVO' o 'TRANSFERENCIA'
    const pasajeroId = req.user.id;

    if (!solicitudId || !['EFECTIVO', 'TRANSFERENCIA'].includes(metodo)) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios o el método es incorrecto.' });
    }

    const solSQL = `
      SELECT s.id, s.pasajero_id, s.estado as solicitud_estado, s.pago_estado, v.costo_contribucion
      FROM solicitudes s
      JOIN viajes v ON s.viaje_id = v.id
      WHERE s.id = $1
    `;
    const solRes = await pool.query(solSQL, [solicitudId]);

    if (solRes.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const sol = solRes.rows[0];

    if (sol.pasajero_id !== pasajeroId) {
      return res.status(403).json({ error: 'No tienes autorización para pagar esta solicitud.' });
    }

    if (sol.solicitud_estado !== 'ACEPTADO') {
      return res.status(400).json({ error: 'La solicitud debe ser ACEPTADA antes de realizar el aporte.' });
    }

    if (sol.pago_estado === 'COMPLETADO') {
      return res.status(400).json({ error: 'Esta solicitud ya ha sido cobrada.' });
    }

    const costo = parseFloat(sol.costo_contribucion);

    // Actualizar estado del pago a 'PENDIENTE_APROBACION' (el conductor debe validar)
    await pool.query(
      `UPDATE solicitudes 
       SET metodo_pago = $1, 
           pago_estado = 'PENDIENTE_APROBACION', 
           monto_pagado = $2 
       WHERE id = $3`,
      [metodo, costo, solicitudId]
    );

    await pool.query(
      `INSERT INTO logs_eventos (usuario_id, tipo_evento, detalles) VALUES ($1, $2, $3)`,
      [pasajeroId, 'DECLARACION_PAGO_OFFLINE', JSON.stringify({ solicitud_id: solicitudId, metodo, monto: costo })]
    );

    return res.status(200).json({
      message: `Tu pago en ${metodo.toLowerCase()} ha sido declarado. El conductor debe validar la recepción.`
    });

  } catch (error) {
    console.error('Error declarando pago offline:', error);
    return res.status(500).json({ error: 'Error al registrar el pago offline.' });
  }
};

/**
 * Confirmar recepción de pago en Efectivo o Transferencia (Conductor)
 */
exports.confirmReceipt = async (req, res) => {
  try {
    const { solicitudId } = req.params;
    const conductorId = req.user.id;

    const solSQL = `
      SELECT s.id, s.pago_estado, s.metodo_pago, v.conductor_id, v.costo_contribucion
      FROM solicitudes s
      JOIN viajes v ON s.viaje_id = v.id
      WHERE s.id = $1
    `;
    const solRes = await pool.query(solSQL, [solicitudId]);

    if (solRes.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const sol = solRes.rows[0];

    if (sol.conductor_id !== conductorId && req.user.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'Solo el conductor del viaje puede confirmar el cobro.' });
    }

    if (sol.pago_estado === 'COMPLETADO') {
      return res.status(400).json({ error: 'Este pago ya figura como COMPLETADO.' });
    }

    // Confirmar pago en la base de datos
    await pool.query(
      `UPDATE solicitudes 
       SET pago_estado = 'COMPLETADO', 
           pago_fecha = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [solicitudId]
    );

    await pool.query(
      `INSERT INTO logs_eventos (usuario_id, tipo_evento, detalles) VALUES ($1, $2, $3)`,
      [conductorId, 'CONFIRMACION_COBRO_CONDUCTOR', JSON.stringify({ solicitud_id: solicitudId, metodo: sol.metodo_pago })]
    );

    return res.status(200).json({ message: 'Cobro confirmado correctamente. El aporte se registró como COMPLETADO.' });

  } catch (error) {
    console.error('Error confirmando recepción:', error);
    return res.status(500).json({ error: 'Error al confirmar la recepción del pago.' });
  }
};

/**
 * Obtener todos los pagos recibidos / pendientes (Conductor)
 */
exports.getDriverPayments = async (req, res) => {
  try {
    const conductorId = req.user.id;

    // Obtener cobros de pasajeros asignados a sus viajes
    const sql = `
      SELECT s.id as solicitud_id, s.metodo_pago, s.pago_estado, s.monto_pagado, s.pago_fecha,
             u.nombre as pasajero_nombre, v.id as viaje_id, v.fecha_salida, v.costo_contribucion
      FROM solicitudes s
      JOIN viajes v ON s.viaje_id = v.id
      JOIN usuarios u ON s.pasajero_id = u.id
      WHERE v.conductor_id = $1 AND s.estado = 'ACEPTADO'
      ORDER BY v.fecha_salida DESC
    `;
    const result = await pool.query(sql, [conductorId]);

    // Calcular ganancias totales (solo de completados)
    const totalEarnings = result.rows
      .filter(r => r.pago_estado === 'COMPLETADO')
      .reduce((sum, r) => sum + parseFloat(r.monto_pagado || 0), 0);

    return res.status(200).json({
      pagos: result.rows,
      ganancias_totales: totalEarnings
    });

  } catch (error) {
    console.error('Error obteniendo pagos conductor:', error);
    return res.status(500).json({ error: 'Error al recuperar el historial de cobros.' });
  }
};
