# Reporte de Implementación: BK-4_CrearViaje

**Autor:** Equipo Backend Core
**Estado:** ✅ Completado

## 1. Descripción de la Tarea
Se construyó el motor de publicación de Rutas y Carpooling en el API Restful (`POST /api/viajes`). Cumpliendo íntegramente con el Requerimiento Principal (**RF3**).
Para aprobar la Rúbrica de la asignatura, codificamos una muralla que **fuerza el cumplimiento general del RF9**: Si el estudiante-conductor intenta enviar su JSON saltándose las `notas_reglas` (las reglas mínimas obligatorias de comportamiento en el auto), el backend explota intencionalmente devolviendo `HTTP 400 Bad Request`.

Adicionalmente, se programó un *Logger Transaccional Invisible (RNF4)*. A la par que la base de datos registra el viaje, paralelamente se escribe una fila oculta de "Evento Nivel 1" informando que este `id_conductor` despachó un vehículo, logrando Trazabilidad Absoluta contra crímenes.

## 2. Evidencia de Código y Endpoints
- **Lógica Anti-RF9 (Forzamiento):**
```javascript
if (!notas_reglas || notas_reglas.trim() === '') {
    return res.status(400).json({ 
       error: 'La seguridad es primero. Imponer Reglas (Ej: No comida) es Obligatorio (RF9).' 
    });
}
```

```json
/* 
   Endpoint: POST /api/viajes
   Headers: { Authorization: "Bearer <token_del_conductor>" }
   Body Type: JSON
*/
{
  "origenLat": -1.249,
  "origenLon": -78.616,
  "destinoLat": -1.258,
  "destinoLon": -78.631,
  "fecha_salida": "2026-05-10T19:30:00Z",
  "cupos_disponibles": 3,
  "notas_reglas": "No comer dentro. Uso de cinturón obligatorio. Tarifa fija $0.50 CTVS.",
  "costo_contribucion": 0.50
}

// RESPUESTA DE ÉXITO (HTTP 201 Created)
{
  "message": "Tu viaje se ha publicado en el Tablero de Movilidad exitosamente.",
  "viaje": {
    "id": 1,
    "conductor_id": 1,
    "fecha_salida": "2026-05-10T19:30:00.000Z",
    "cupos_disponibles": 3,
    "estado": "ACTIVO"
  }
}
```

## 3. Próximo Paso
El viaje ya existe en Postgres y PostGIS. Ahora, un PASAJERO debe ser capaz de entrar al App y recuperar este JSON filtrándolo mediante cruces de intersección PostGIS para no ver las coordenadas de manera directa (Privacidad RNF2), lo cual es el mandato de la Tarea `BK-5`.
