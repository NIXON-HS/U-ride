# Reporte de Implementación: BK-2_Login

**Autor:** Equipo Backend Auth
**Estado:** ✅ Completado

## 1. Descripción de la Tarea
Se construyó el Endpoint central para el Inicio de Sesión seguro. Cubre los Requerimientos no Fundamentales de Seguridad (`RNF1`) obligando al sistema a comparar el Password desencriptándolo mediante la librería `Bcrypt`.
En caso de que el login sea exitoso, el servidor Node.js responde emitiendo una llave temporal firmada criptográficamente (JSON Web Token o JWT), permitiendo al usuario continuar utilizando la plataforma como Pasajero o Conductor durante 24 horas sin volver a pedir usuario.

## 2. Evidencia de Código y Endpoints
- **Librería Instalada:** `jsonwebtoken`.
- **Lógica Central:**
```javascript
// Validar Password cifrada con la BD
const isValid = await bcrypt.compare(password, usuario.password_hash);
if (!isValid) return res.status(401).json({ error: 'Credenciales incorrectas' });

// Firmar credencial
const token = jwt.sign(
    { id: usuario.id, rol: usuario.rol }, 
    process.env.JWT_SECRET || 'llave_secreta_default', 
    { expiresIn: '24h' }
);
```

```json
// EJEMPLO DE RESPONSE (ÉXITO)
{
  "message": "Inicio de Sesión Exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nombre": "Nixon",
    "email": "nixon123@uta.edu.ec",
    "rol": "ESTUDIANTE"
  }
}
```

## 3. Próximo Paso
El desarrollador del Frontend/Móvil ya puede usar la ruta `POST http://localhost:5000/api/auth/login`. Al recibir este JSON, debe guardar el valor de `"token"` dentro del `AsyncStorage` (Mobile) o `localStorage` (Web) y enviarlo como una cabecera de autenticación (`Authorization: Bearer <t>`) en todo el resto de requerimientos del sistema.
