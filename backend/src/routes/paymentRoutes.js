const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');

// [POST] Procesar aporte con Stripe (Tarjeta)
router.post('/pagos/stripe', authMiddleware, paymentController.processStripePayment);

// [POST] Declarar aporte offline (Efectivo o Transferencia)
router.post('/pagos/declarar-offline', authMiddleware, paymentController.declareOfflinePayment);

// [POST] Confirmar recepción del pago offline (Conductor)
router.post('/pagos/:solicitudId/confirmar-recepcion', authMiddleware, paymentController.confirmReceipt);

// [GET] Listar todos los cobros y ganancias del conductor
router.get('/pagos/conductor', authMiddleware, paymentController.getDriverPayments);

module.exports = router;
