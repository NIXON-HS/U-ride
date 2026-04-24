module.exports = (req, res, next) => {
  // Asumiendo que este middleware se corre DESPUÉS de 'authMiddleware.js', 
  // por lo que 'req.user' ya está inyectado y verificado.
  
  if (!req.user || req.user.rol !== 'ADMINISTRADOR') {
    return res.status(403).json({ 
      error: 'Prohibido: Zona Exclusiva. No tienes permisos de ADMINISTRADOR para ejecutar esta acción.' 
    });
  }
  
  next();
};
