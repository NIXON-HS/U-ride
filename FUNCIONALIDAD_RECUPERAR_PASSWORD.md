# 🔐 FUNCIONALIDAD: RECUPERAR CONTRASEÑA CON OUTLOOK

**Fecha:** May 6, 2026  
**Módulo:** RF12 - Recuperación de Contraseña  
**Email:** apuruncajas1832@uta.edu.ec  

---

## 📋 DESCRIPCIÓN

Sistema completo de recuperación de contraseña usando **Outlook/Office 365** que funciona en:
- ✅ **Backend** (Node.js + Express)
- ✅ **Frontend Web** (React + Vite)
- ✅ **App Móvil** (React Native + Expo)

---

## 🔧 CONFIGURACIÓN

### Backend (.env)

```env
OUTLOOK_EMAIL=apuruncajas1832@uta.edu.ec
OUTLOOK_PASSWORD=Alan2005_
OUTLOOK_SMTP_HOST=smtp.office365.com
FRONTEND_URL=http://localhost:5173
MOBILE_URL=exp://localhost:8081
```

### Dependencias Instaladas

```bash
# Backend
npm install nodemailer

# Frontend (ya tiene axios)
# Mobile (ya tiene axios)
```

---

## 📱 FLUJO DE USUARIO

### 1️⃣ **Solicitar Recuperación**

**Web:**
```
Login → "¿Olvidaste tu contraseña?" → Ingresar email → Enviar
```

**Mobile:**
```
Login → "¿Olvidaste tu contraseña?" → Ingresar email → Enviar
```

### 2️⃣ **Email de Recuperación**

El usuario recibe un email con:
- ✅ Enlace para Web: `http://localhost:5173/reset-password/{TOKEN}`
- ✅ Enlace para Mobile: `exp://localhost:8081/reset-password/{TOKEN}`
- ✅ Código directo para copiar/pegar

### 3️⃣ **Cambiar Contraseña**

El usuario:
- Ingresa el código/token recibido
- Ingresa nueva contraseña (mín 8 caracteres, 1 mayúscula, 1 número)
- Confirma contraseña
- ✅ **Contraseña actualizada exitosamente**

---

## 🔌 ENDPOINTS API

### POST `/api/auth/forgot-password`

**Solicitar enlace de recuperación**

```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@uta.edu.ec"
  }'
```

**Response (200):**
```json
{
  "message": "Si el email existe, recibirá un enlace de recuperación",
  "resetToken": "abc123xyz..." // Solo para testing
}
```

---

### POST `/api/auth/reset-password`

**Cambiar contraseña con token**

```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123xyz...",
    "newPassword": "NewPass123!",
    "confirmPassword": "NewPass123!"
  }'
```

**Response (200):**
```json
{
  "message": "Contraseña actualizada exitosamente"
}
```

**Errores:**
```json
{
  "error": "Token inválido o expirado"
}
```

---

### GET `/api/auth/validate-reset-token/:token`

**Validar token sin cambiar contraseña**

```bash
curl http://localhost:5000/api/auth/validate-reset-token/abc123xyz...
```

**Response (200):**
```json
{
  "valid": true,
  "message": "Token válido. Procede a cambiar tu contraseña"
}
```

---

## 🗄️ CAMBIOS EN BASE DE DATOS

Se agregaron 2 columnas a la tabla `usuarios`:

```sql
ALTER TABLE usuarios ADD COLUMN password_reset_token VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN password_reset_expiry TIMESTAMP;
```

**O ejecuta:**
```bash
cd backend
node setupDB.js
```

---

## 🌐 COMPONENTES CREADOS

### Frontend (Web)

**Archivo:** `frontend/src/ForgotPassword.jsx`

```jsx
import ForgotPasswordPage from './ForgotPassword';

// En App.jsx, agregar estado para mostrar:
<ForgotPasswordPage onBack={() => setShowForgot(false)} />
```

**Estilos:** `frontend/src/styles/ForgotPassword.css`

### Mobile (React Native)

**Archivo:** `mobile/src/screens/ForgotPasswordScreen.tsx`

```tsx
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';

// En navegación:
<Stack.Screen 
  name="ForgotPassword" 
  component={ForgotPasswordScreen} 
/>
```

### Backend

**Controlador:** `backend/src/controllers/passwordController.js`
- `requestPasswordReset()` - Solicitar reset
- `resetPassword()` - Cambiar contraseña
- `validateResetToken()` - Validar token

**Rutas:** `backend/src/routes/passwordRoutes.js`

---

## ⏰ TIEMPOS DE EXPIRACIÓN

- ✅ **Token de reset:** 1 hora
- ✅ **Email:** Reintentable (sin límite)
- ✅ **Sesión:** 24h (JWT)

---

## 🧪 TESTING

### Con Postman/cURL

**1. Solicitar reset:**
```bash
POST http://localhost:5000/api/auth/forgot-password
Content-Type: application/json

{
  "email": "admin@uta.edu.ec"
}
```

**2. Copiar token de la respuesta**

**3. Cambiar contraseña:**
```bash
POST http://localhost:5000/api/auth/reset-password
Content-Type: application/json

{
  "token": "TOKEN_AQUI",
  "newPassword": "NewPass123!",
  "confirmPassword": "NewPass123!"
}
```

---

## 📧 EMAIL ENVIADO

```html
<h2>Recuperación de Contraseña - U-Ride</h2>

Hola [Nombre],

Recibimos una solicitud para recuperar tu contraseña. 
Haz clic en el enlace de abajo:

[ENLACE WEB]
[ENLACE MOBILE]

Código directo: ABC123XYZ...

Este enlace expirará en 1 hora.
```

---

## 🔒 SEGURIDAD

✅ **Tokens hasheados** (SHA256)  
✅ **Contraseñas cifradas** (bcryptjs)  
✅ **Expiración automática** (1 hora)  
✅ **Rate limiting** (recomendado en producción)  
✅ **No revela si email existe** (previene user enumeration)  
✅ **Logs de eventos** (auditoría)  

---

## ⚠️ NOTAS IMPORTANTES

1. **Email Outlook Real:** 
   - Si Outlook requiere **contraseña de aplicación**, genérala desde:
   - https://account.microsoft.com/security-info/
   - Usa esa contraseña en lugar de la contraseña de cuenta

2. **Testing en Local:**
   - El token se devuelve en testing para facilitar pruebas
   - En producción, remover `resetToken` de la respuesta

3. **Integración en App:**
   - Web: Agregar botón "¿Olvidaste tu contraseña?" en login
   - Mobile: Agregar pantalla en navegación

---

## 📝 PRÓXIMOS PASOS

- [ ] Agregar rate limiting (máx 5 intentos/hora)
- [ ] Enviar tokens por SMS (alternativa)
- [ ] Validación de 2FA
- [ ] Historial de cambios de contraseña
- [ ] Alertas de recuperación sospechosa

---

**Generado por:** GitHub Copilot  
**Email:** apuruncajas1832@uta.edu.ec  
**Contraseña:** Alan2005_
