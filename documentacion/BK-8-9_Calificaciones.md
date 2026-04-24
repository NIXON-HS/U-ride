# Reporte de Implementación: BK-8-9_Calificaciones

**Autor:** Equipo Backend Control Quality
**Estado:** ✅ Completado

## 1. Descripción de la Tarea
Se ha activado el *Motor Evaluador del Sistema* cruzando exitosamente el Funcional **RF8** (Posibilidad de Evaluarse mutuamente) y la Regla "Comportamiento / Calificaciones Visible".
Las personas con el estado CONFIRMADO en un viaje usan la ruta `POST /api/calificaciones` enviando de 1 a 5 Estrellas al conductor (o de Conductor a Pasajeros, ya que es "doble ciego").

**Control de Recálculo (BK-9):** Al momento de enviar su voto, la base de datos se congela (`ACID TRANSACTION BEGIN`). Entra la calificación a la DB, e instantáneamente el servidor invoca la regla `ROUND(AVG(calificacion)::numeric, 2)`. Este cálculo se sobrescribe directamente en el Perfil Público del Evaluado, dejando su Reputation Score matemáticamente actualizado para su próximo viaje.


## 2. Evidencia de Código y Endpoints
- **Operaciones de Motor Promedio SQL (AVG):**
```javascript
  const engineSQL = `
    UPDATE usuarios 
    SET reputacion_promedio = (
        SELECT COALESCE(ROUND(AVG(calificacion)::numeric, 2), 5.00) 
        FROM evaluaciones 
        WHERE evaluado_id = $1
    )
    WHERE id = $1 RETURNING reputacion_promedio
  `;
```

```json
/* 
   Endpoint: POST /api/calificaciones
   Headers: { Authorization: "Bearer <token_del_pasajero>" }
   Body Type: JSON
*/
{
  "viaje_id": 1,
  "evaluado_id": 4, 
  "calificacion": 3,
  "comentario": "Llegó un poco tarde a la zona de subida."
}

// RESPUESTA DE ÉXITO (HTTP 201 Created)
{
  "message": "Evaluación asimilada con éxito en el ecosistema Cívico de U-Ride.",
  "nuevo_score_estudiante": "4.20"
}
```

## 3. Próximo Paso
Queda solo el extremo final del Módulo de Backend por terminar: Las Rutas de Denuncia Formal (Ticket Report - `BK-10`) y el Dashboard Web del Administrador (`BK-11`).
