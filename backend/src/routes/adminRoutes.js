const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// Seguridad Restricta: Nada Simulado
router.get('/admin/reportes', authMiddleware, adminMiddleware, adminController.getAllReports);
router.put('/admin/usuarios/:usuario_id/suspender', authMiddleware, adminMiddleware, adminController.suspendUser);
router.put('/admin/reportes/:reporte_id/resolver', authMiddleware, adminMiddleware, adminController.resolveReport);

module.exports = router;
