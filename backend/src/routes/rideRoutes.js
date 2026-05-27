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

// Detalle y gestión de un viaje
router.get('/viajes/:id', authMiddleware, rideController.getRideById);
router.put('/viajes/:id', authMiddleware, rideController.updateRide);
router.delete('/viajes/:id', authMiddleware, rideController.deleteRide);
router.patch('/viajes/:id/iniciar', authMiddleware, rideController.startRide);
router.patch('/viajes/:id/finalizar', authMiddleware, rideController.finishRide);
router.put('/viajes/:id/ubicacion', authMiddleware, rideController.updateRideLocation);

// Participantes de un viaje
router.get('/viajes/:id/participantes', authMiddleware, rideController.getTripParticipants);

module.exports = router;
