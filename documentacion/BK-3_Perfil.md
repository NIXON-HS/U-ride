# Reporte de Implementación: BK-3_Perfil

**Autor:** Equipo Backend Usuarios
**Estado:** ✅ Completado

## 1. Descripción de la Tarea
Se ha completado la gestión segura del perfil cumpliendo íntegramente con el Requerimiento Funcional (**RF2**).
- Se habilitó la herramienta `Multer` para interceptar archivos tipo `.jpg/.png` en la memoria y volcarlos directamente sobre la carpeta `backend/uploads/perfiles`.
- Se protegió el acceso. Nadie puede actualizar el perfil si no trae su JWT (creación de Middleware).
- **Protección de Privacidad (RNF2):** Para proteger dónde viven exactamente los estudiantes, sus coordenadas (latitud/longitud) se convierten tras bambalinas usando el motor geométrico de PostgreSQL/PostGIS a un formato polígono.

## 2. Evidencia de Código y Endpoints

- **Middleware Protector:** `authMiddleware.js`
- **Operación PostGIS:**
```sql
  -- Convierte ejes X,Y de Javascript a SRID Nativo GPS 4326.
  ST_SetSRID(ST_MakePoint($1, $2), 4326)
```

```json
/* 
   Endpoint: PUT /api/profile
   Headers: { Authorization: "Bearer <token>" }
   Body Type: FormData (multipart/form-data)
   - carrera: "Ingeniería en Software"
   - telefono: "0991234567"
   - foto: (Archivo Binario)
   - latitud: -1.249
   - longitud: -78.616
*/

// RESPUESTA DE ÉXITO
{
  "message": "Perfil estudiantil actualizado correctamente",
  "perfil": {
    "id": 1,
    "nombre": "Nixon",
    "email_institucional": "nixon123@uta.edu.ec",
    "carrera": "Ingeniería en Software",
    "telefono": "0991234567",
    "foto_url": "/uploads/perfiles/1-16812312-32121.jpg"
  }
}
```

## 3. Próximo Paso
Dado que ahora las cuentas tienen Zonas Asignadas en PostGIS y un sistema Transaccional activo, se debe continuar con la piedra angular de la aplicación: La publicación (`BK-4`) de los Viajes.
