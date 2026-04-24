const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// [POST] Procesamiento Financiero de los Viajes
router.post('/pagos/procesar', paymentController.processPayment);

module.exports = router;
