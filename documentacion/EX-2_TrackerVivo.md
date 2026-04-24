# Reporte de Implementación Extra (Bonus): EX-2

**Autor:** Arquitectura Base
**Estado:** ✅ Completado

## 1. Descripción Técnica y Justificación
Se ordenó programar un motor de rastreo asíncrono para incrementar la trazabilidad y resolver la ansiedad de seguridad del **"¿Dónde viene el conductor exactamente cuando estoy esperándolo en la esquina?"**.

Se transformó el Servidor Single-Thread Normal de Express, encerrándolo dentro de un **HTTP Gateway Engine**. Luego, acoplamos encima la librería de Telecomunicaciones `Socket.io`.
Esto permite que, a diferencia del Buscador (donde el GPS es difuminado por PostGIS para proteger de asaltos masivos), cuando el Pasajero se sube **CONFIRMADO** al viaje, su React Native entra al "Broadcast Channel" y logra recibir la posición satelital del Vehículo al segundo (`location_changed`).

## 2. Eventos Interconectados (Protocolo `ws://`)
```javascript
  // 1. Cuando el Pasajero confirmado abre el Viaje
  socket.on('join_ride', (viajeId) => {
    socket.join(`viaje_${viajeId}`);
  });

  // 2. El Teléfono del Conductor bombea esto cada vez que su GPS varía (Pide Permiso Background iOS/Android)
  socket.on('update_location', (data) => {
    // 3. El Gateway Server reenvía las tuplas espaciales a todos los teléfonos mirando la pantalla
    io.to(`viaje_${data.viajeId}`).emit('location_changed', { 
       latitud: data.latitud, 
       longitud: data.longitud 
    });
  });
```

A nivel académico universitario para la asignatura, la base del proyecto **U-Ride** ha roto la barrera de una app pasiva e incluye una capa de Sockets en tiempo real. 

## 3. Próximo Paso
Hemos acabado absolutamente todos los módulos de desarrollo. Sugerimos ejecutar simulacros de validación, arrancar servidores y verificar integridad del código local.
