# Reporte de Implementación: BK-1_Registro

**Autor:** Equipo Backend Auth
**Estado:** ✅ Completado

## 1. Descripción de la Tarea
Se creó exitosamente el endpoint funcional para el Registro Institucional (`POST /api/auth/register`), cumpliendo estrictamente con el **RF1** (Log In Estudiantil) y el **RNF1** (Seguridad).
Se programó un validador que detecta strings y fuerza rechazar cualquier intento de creación si el correo ingresado no termina correspondientemente con el dominio `@uta.edu.ec` de la Universidad Técnica de Ambato.

## 2. Evidencia de Código y Endpoints
- **Librerías instaladas:** `bcryptjs` (cifrado) y `jsonwebtoken` (para uso futuro).
- **Controlador principal:**
```javascript
// Validación de Dominio (REGLA ACADÉMICA UTA)
if (!email.trim().endsWith('@uta.edu.ec')) {
  return res.status(403).json({ 
     error: 'Pertenencia Institucional Inválida. El correo debe terminar en @uta.edu.ec' 
  });
}
```

```json
// EJEMPLO DE RESPONSE (ÉXITO)
{
  "message": "Estudiante registrado correctamente en U-Ride",
  "usuario": {
    "id": 1,
    "nombre": "Nixon",
    "email_institucional": "nixon123@uta.edu.ec",
    "rol": "ESTUDIANTE"
  }
}
```

## 3. Próximo Paso
Se requiere ejecutar `npm run dev` y hacer una llamada POST usando "Talend API Tester" o "Postman" para verificar la conexión activa a Postgres.
