# 📋 MANUAL TÉCNICO Y MATRIZ DE REQUISITOS - U-RIDE

Este documento integra las **instrucciones técnicas de desarrollo** unidas con la matriz de los **Requerimientos (RF y RNF)**.
> **⚠️ REGLA GENERAL DEL PROYECTO PARA TODOS LOS DESARROLLADORES:** Cada una de las siguientes tareas, sin excepción, **debe ser documentada en un archivo `.md`** (dentro de una carpeta `/docs` o `/wiki`) una vez finalizada, explicando el código realizado, las funciones usadas y capturas de pantalla de la comprobación.

---

## 🗄️ FASE 1: DESARROLLO DEL BACKEND (Lógica Central)

### Módulo 1: Autenticación y Administración de Perfiles
- [x] **BD-1: Esquema SQL y Base de Trazabilidad**
  - **📌 Cubre:** Roles, **RNF4** (Trazabilidad).
  - **Dónde y Cómo:** En `backend/src/models/schema.sql`. Crear tablas `usuarios`, `viajes`, `solicitudes`, `reportes` y `logs_eventos` (RNF4).
  - **📝 Documentación Obligatoria:** Documentar el Diagrama Entidad Religión y los comandos SQL creados en `docs/BD-1_Esquema.md`.
- [x] **BK-1: Lógica del Registro Institucional**
  - **📌 Cubre:** **RF1** y Regla (Solo verificados).
  - **Dónde y Cómo:** En `backend/src/controllers/authController.js`. Antes del `INSERT`, bloquear si `!email.endsWith('@institucion.edu')`. Cifrar clave.
  - **📝 Documentación Obligatoria:** Documentar los Request/Response del endpoint en `docs/BK-1_Registro.md`.
- [x] **BK-2: Inicio de Sesión Seguro**
  - **📌 Cubre:** **RNF1** (Seguridad cifrada).
  - **Dónde y Cómo:** En `authController.js`. Comparar `bcrypt.compare` y emitir `JWT` con el rol.
  - **📝 Documentación Obligatoria:** Documentar la estructura del Payload del JWT en `docs/BK-2_Login.md`.
- [x] **BK-3: Gestión de Perfil de Usuario**
  - **📌 Cubre:** **RF2**.
  - **Dónde y Cómo:** En `userController.js`. `PUT /profile`. Configurar subida de fotos y Zona de referencia.
  - **📝 Documentación Obligatoria:** Documentar la ruta, la librería multer y la regla PostGIS en `docs/BK-3_Perfil.md`.

### Módulo 2: Core de Viajes Compartidos y Matchmaking
- [x] **BK-4: Publicar un Viaje (Conductor)**
  - **📌 Cubre:** **RF3** y **RF9** (Reglas Mínimas Visibles).
  - **Dónde y Cómo:** En `rideController.js`. Endpoint `POST /viajes`. Forzar escritura en `notas_reglas` (RF9).
  - **📝 Documentación Obligatoria:** Documentar el esquema del JSON a enviarse desde el Front en `docs/BK-4_CrearViaje.md`.
- [x] **BK-5: Filtrador Geográfico Inverso (Pasajero)**
  - **📌 Cubre:** **RF4** y **RNF2** (Ubicación por Zona).
  - **Dónde y Cómo:** En `rideController.js`. `GET /viajes?zona=X`. Query espacial para proteger ubicaciones exactas (RNF2).
  - **📝 Documentación Obligatoria:** Documentar cómo funciona la consulta SQL de filtrado en `docs/BK-5_BuscadorViajes.md`.
- [x] **BK-6 & BK-7: Enviar, Aceptar y Confirmar**
  - **📌 Cubre:** **RF5**, **RF6**, **RF7** y Regla (Conductor controla).
  - **Dónde y Cómo:** En `requestController.js`. Transacciones para pasar solicitudes a `PENDIENTE` y luego a `CONFIRMADO` (disparando `cupos = cupos - 1`).
  - **📝 Documentación Obligatoria:** Documentar la regla de resta de cupos y confirmación transaccional en `docs/BK-6-7_Solicitudes.md`.

### Módulo 3: Interacciones Cívicas y Administración
- [x] **BK-8 & BK-9: Evaluaciones y Motor de Reputación**
  - **📌 Cubre:** **RF8** (Doble ciego) y Regla (Reputación Visible).
  - **Dónde y Cómo:** En `reviewController.js`. Crear `POST /calificaciones`. Recalcular el promedio en tabla usuarios al enviar.
  - **📝 Documentación Obligatoria:** Documentar paso a paso la matemática del promedio del score en `docs/BK-8-9_Calificaciones.md`.
- [x] **BK-10: Subir Reporte / Queja**
  - **📌 Cubre:** **RF10**.
  - **Dónde y Cómo:** En `reportController.js`. Manejar upload de imágenes y registro en BD.
  - **📝 Documentación Obligatoria:** Documentar cómo se guarda la evidencia opcional del estudiante en `docs/BK-10_Reportes.md`.
- [x] **BK-11: Portal Backend del Administrador**
  - **📌 Cubre:** **RF11** y Roles (Administrador).
  - **Dónde y Cómo:** En `adminController.js`. Endpoints para suspender IDs y actualizar parámetros.
  - **📝 Documentación Obligatoria:** Documentar las limitaciones de acceso por rol `Admin` en `docs/BK-11_PanelAdmin.md`.

---

## 📱 FASE 2: DESARROLLO MOBILE (Experiencia Nativa)

- [x] **MOB-1: Autenticación, Usabilidad Sencilla**
  - **📌 Cubre:** **RNF3** (Interfaz limpia).
  - **Cómo implementarlo:** Login Reactivo. Guardar token en memoria.
  - **📝 Documentación Obligatoria:** Documentar la librería UI seleccionada y componentes en `docs/MOB-1_UIAuth.md`.
- [x] **MOB-2: Flujo y Cartillas de Viaje**
  - **📌 Cubre:** Visibilidad total presolicitud (**RF9**).
  - **Cómo implementarlo:** Feed navegable. Modal emergente obligatorio mostrando reglas del viaje.
  - **📝 Documentación Obligatoria:** Anexar capturas de UI del Modal de Reglas y Tarjetas en `docs/MOB-2_PantallasViaje.md`.
- [x] **MOB-3: Buzón de Control del Conductor**
  - **📌 Cubre:** **RF6** y **RF7**.
  - **Cómo implementarlo:** Panel para rechazar o validar (check/X).
  - **📝 Documentación Obligatoria:** Documentar capturas y consumos Axios a `BK-6` en `docs/MOB-3_PanelTinder.md`.

---

## 💻 FASE 3: FRONTEND WEB (Tablero Administrativo)

- [x] **FE-1: Dashboard del Moderador Web**
  - **📌 Cubre:** Operaciones del administrador (**RF11**).
  - **Cómo implementarlo:** Grillas de React mostrando infractores con botones de [Bloqueo].
  - **📝 Documentación Obligatoria:** Documentar los Hooks (ej. useEffect) usados en React para mostrar a los infractores en `docs/FE-1_DashAdmin.md`.

---

## 🚀 FASE 4: FUNCIONES COMPLEJAS / EXTRAS

- [x] **EX-1: Módulo de Pases / Pagos (Stripe)**
  - **📌 Cubre:** Regla (Procesar pagos).
  - **Cómo implementarlo:** API Test de Stripe.
  - **📝 Documentación Obligatoria:** Especificar configuraciones y llaves Test del payment gateway en `docs/EX-1_Pagos.md`.
- [x] **EX-2: Tracker de Interfaz Espacial Activa**
  - **📌 Cubre:** Extra (GPS Tracking en vivo).
  - **Cómo implementarlo:** Sockets.io para rastreo bidireccional.
  - **📝 Documentación Obligatoria:** Documentar evento de conexión de Sockets en `docs/EX-2_TrackerVivo.md`.
