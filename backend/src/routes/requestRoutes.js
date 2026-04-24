const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const authMiddleware = require('../middlewares/authMiddleware');

// RF5: [POST] Pasajeros envían una solicitud de cupo a un viaje (Se marca Pendiente)
router.post('/solicitudes', authMiddleware, requestController.createRequest);

// RF6 y RF7: [PUT] Conductores Aceptan o Rechazan dictaminando el cupo del Pasajero (Transacción ACID)
router.put('/solicitudes/:id', authMiddleware, requestController.updateRequestStatus);

// [GET] Carga de Bandeja Tinder-Like para que el Conductor vea quienes quieren sumarse 
router.get('/solicitudes/conductor', authMiddleware, requestController.getDriverRequests);

// [GET] Carga de Bandeja para el Pasajero (Para que vea el estado de sus solicitudes)
router.get('/solicitudes/pasajero', authMiddleware, requestController.getPassengerRequests);

module.exports = router;
