const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const authMiddleware = require('../middlewares/authMiddleware');

// RF3: Publicación de un Viaje
// Esta ruta exige un token de sesión legítimo para poder publicar
router.post('/viajes', authMiddleware, rideController.createRide);

// RF4: Búsqueda dinámica de viajes espaciales
router.get('/viajes', authMiddleware, rideController.searchRides);

// Historial de viajes
router.get('/viajes/historial/mios', authMiddleware, rideController.getMyTrips);

// Participantes de un viaje
router.get('/viajes/:id/participantes', authMiddleware, rideController.getTripParticipants);

module.exports = router;
