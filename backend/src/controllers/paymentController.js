/**
 * Controlador Simulado de Pagos - Conector de API Stripe Test (Extra 1)
 */
exports.processPayment = async (req, res) => {
    try {
       const { pasajero_id, conductor_id, monto_contribucion, token_stripe } = req.body;
       
       if(!token_stripe || !monto_contribucion) {
           return res.status(400).json({ error: "Faltan métodos de Tarjeta o Moto a Cobrar." });
       }
       
       // Simulando las tarjetas de prueba oficiales de Stripe:
       if(token_stripe === "tok_chargeDeclined") {
           return res.status(402).json({ error: "Fondos insuficientes en la cuenta bancaria del estudiante." });
       }
  
       if(token_stripe === "tok_visa") {
            return res.status(200).json({ 
                mensaje: "Aporte de gasolina procesado exitosamente mediante Stripe Test Mode.",
                recibo: `tx_${Math.floor(Math.random() * 99999999)}`,
                monto_cobrado: monto_contribucion,
                moneda: "USD"
            });
       }

       return res.status(400).json({ error: "Token de tarjeta inválido o expirado." });
       
    } catch (err) {
       return res.status(500).json({ error: "El gateway de pagos está sufriendo problemas de conexión." });
    }
  };
