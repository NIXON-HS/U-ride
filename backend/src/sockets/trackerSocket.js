module.exports = (io) => {
  // Cuando un dispositivo React Native o Web se conecta
  io.on('connection', (socket) => {
    console.log(`[Socket.io] Nuevo dispositivo sincronizado: ${socket.id}`);

    // RF-Extra: Unirse al 'Walkie-Talkie' o Cuarto Cifrado de un Viaje en Específico
    socket.on('join_ride', (viajeId) => {
      socket.join(`viaje_${viajeId}`);
      console.log(`Dispositivo ID ${socket.id} unido al Canal de Tracking: viaje_${viajeId}`);
    });

    // Emisión en tiempo real desde el Conductor hacia el Gateway
    socket.on('update_location', (data) => {
      const { viajeId, latitud, longitud } = data;
      
      // El servidor propaga (Broadcasting) las coordenadas EXACTAS (Ya no ocultas)
      // a todos los pasajeros de este viaje en específico para que vean moverse el Auto en el Mapa.
      io.to(`viaje_${viajeId}`).emit('location_changed', { latitud, longitud });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Conexión Perdida: ${socket.id}`);
    });
  });
};
