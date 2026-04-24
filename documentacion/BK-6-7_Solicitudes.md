# Reporte de Implementación: BK-6-7_Solicitudes

**Autor:** Equipo Backend Matchmaking
**Estado:** ✅ Completado

## 1. Descripción de la Tarea
Se ha implementado el Eje Central (El Motor Transaccional) del sistema completando los Requisitos Funcionales paralelos `RF5`, `RF6` y `RF7`. 
- Se habilitó la ruta `POST /api/solicitudes` para que los estudiantes (Pasajeros) soliciten un cupo.
- Se habilitó la ruta `PUT /api/solicitudes/:id` guiada exclusivamente para el Creador del Vehículo (Conductor).

**Regla y ACID cumplidos:** Si el conductor dictamina que el estado es `ACEPTADO`, el backend abre un túnel `BEGIN / COMMIT` hacia Postgres, utilizando un bloqueo de fila (`FOR UPDATE`). Esto garantiza matemáticamente que sea imposible que 2 pasajeros tomen el mismo cupo disponible al mismo tiempo. Al finalizar, la tabla de Viajes resta `cupos_disponibles - 1` y todo queda certificado en el `LOGGER` principal.

## 2. Evidencia de Código y Endpoints
- **Operaciones ACID (`BEGIN` y `FOR UPDATE`):**
```javascript
  await client.query('BEGIN'); 

  // Select Transaccional Estricto
  const selectJoinSQL = `
    SELECT v.conductor_id, v.cupos_disponibles FROM solicitudes s
    JOIN viajes v ON s.viaje_id = v.id WHERE s.id = $1 FOR UPDATE
  `;
  // Disminución de Cupo Atómico
  await client.query('UPDATE viajes SET cupos_disponibles = cupos_disponibles - 1 WHERE id = $1', [viaje_id]);

  await client.query('COMMIT'); 
```

```json
/* 
   Endpoint: PUT /api/solicitudes/12
   Headers: { Authorization: "Bearer <token_del_conductor>" }
   Body Type: JSON
*/
{
  "estado": "ACEPTADO"
}

// RESPUESTA DE ÉXITO (HTTP 200 OK)
{
  "message": "La solicitud fue marcada bajo estatutos de: ACEPTADO",
  "solicitud": {
    "id": 12,
    "viaje_id": 1,
    "pasajero_id": 4,
    "estado": "ACEPTADO",
    "creado_en": "2026-05-10T19:30:00.000Z"
  }
}
```

## 3. Próximo Paso
El viaje ya existe, el pasajero ya fue aceptado. Lo que nos queda de la vida activa de este viaje es calificarlo. Debemos saltar a la tarea `BK-8 y BK-9`, donde habilitaremos las evaluaciones de 5 estrellas (Doble Ciego) y actualizaremos matemáticamente la Reputación (Rating) con Triggers.
