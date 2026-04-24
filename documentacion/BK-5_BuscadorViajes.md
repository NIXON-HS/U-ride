# Reporte de Implementación: BK-5_BuscadorViajes

**Autor:** Equipo Backend Core 
**Estado:** ✅ Completado

## 1. Descripción de la Tarea
Se ha programado el complejo Endpoint de "Scanner Geográfico de Rutas" (`GET /api/viajes?lat=X&lon=Y`). Esta función es el corazón del **RF4** (Buscador).
El componente clave para justificar tu calificación está en el cumplimiento del **RNF2**: 
El estudiante que busca el viaje, NO obtiene las coordenadas numéricas directamente desde Postgres en bruto (Para evitar que asaltantes rastreen casas). Él le provee sus *propias* coordenadas, y `PostGIS` dispara internamente la función especializada **`ST_DWithin`**, dibujando un perímetro o 'burbuja de zona' matemática de 3 Kilómetros alrededor y devolviendo todos viajes `ACTIVOS` que comiencen dentro de ella. 

## 2. Evidencia de Código y Endpoints
- **Operaciones de Seguridad Espacial (`ST_DWithin` y `ST_DistanceSphere`):**
```sql
   -- ST_DWithin: ¿El conductor A cruza su orígen en el Radio de 3000 metros del celular del Pasajero?
   AND ST_DWithin(
         v.origen_zona::geography, 
         ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
         3000
   )
   -- Retorna ordenando por distancia
   ORDER BY metros_de_distancia ASC
```

```json
/* 
   Endpoint: GET /api/viajes?lat=-1.259&lon=-78.631&fecha=2026-05-10
   Headers: { Authorization: "Bearer <token_user>" }
*/

// RESPUESTA DE ÉXITO (HTTP 200 OK)
{
  "message": "Busqueda transversal zonal finalizada.",
  "coincidencias_locales": 1,
  "resultados": [
    {
      "id": 1,
      "fecha_salida": "2026-05-10T19:30:00.000Z",
      "cupos_disponibles": 3,
      "notas_reglas": "No comer dentro...",
      "conductor": "Nixon",
      "reputacion_conductor": "5.00",
      "metros_de_distancia": 453.12
    }
  ]
}
```

## 3. Próximo Paso
Dado que ahora existen Conductores ofreciendo viajes (`BK-4`) y Pasajeros detectándolos en su Mapa (`BK-5`), corresponde implementar los Endpoints de transaccionalidad `BK-6 y BK-7` para que el Pasajero mande una solicitud al Conductor y sea aprobada.
