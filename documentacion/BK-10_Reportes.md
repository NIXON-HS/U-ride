# Reporte de Implementación: BK-10_Reportes

**Autor:** Equipo de Calidad y Ciberseguridad U-Ride
**Estado:** ✅ Completado

## 1. Descripción de la Tarea
Se ha activado formalmente el sistema de Tickets (**RF10**). 
Con esto, los estudiantes (Pasajeros o Conductores) quedan totalmente habilitados para reportar conductas graves de otros miembros del ecosistema sin necesidad de cruzar por sistemas externos.

Se logró habilitar un receptor Dual (Texto y Binario) instalando un pipeline a través de **Multer**. Cuando un estudiante pulsa *"Enviar Queja"* en el celular y adjunta una captura de pantalla, NodeJS captura el stream binario y lo salva automáticamente dentro de la carpeta segura `backend/uploads/evidencias/ticket-{id}-{rand}.jpg`, evitando saturar a la base de datos PostgreSQL, e insertando solamente la *dirección de ruta* para que el Administrador pueda revisarla más tarde.

## 2. Evidencia de Código y Endpoints
- **Mapeo de Rutas y Límite de Peso (Anti-DDoS):**
```javascript
const uploadEvidence = multer({ 
    storage: storage,
    limits: { fileSize: 8000000 }, // Tope Obligatorio a 8 MB
});

router.post('/reportes', authMiddleware, uploadEvidence.single('evidencia'), createReport);
```

```json
/* 
   Endpoint: POST /api/reportes
   Headers: { Authorization: "Bearer <token>" }
   Body Type: FormData (multipart/form-data)
   - denunciado_id: 3
   - motivo: "El conductor exigía doble pago por fuera de la app."
   - evidencia: (Captura de pantalla Binaria Opcional)
*/

// RESPUESTA DE ÉXITO (HTTP 201 Created)
{
  "message": "Reporte registrado formalmente. Un moderador administrativo revisará tu evidencia.",
  "ticket": {
    "id": 1,
    "motivo": "El conductor exigía doble pago por fuera de la app.",
    "estado": "ABIERTO",
    "creado_en": "2026-05-11T12:00:23.000Z"
  }
}
```

## 3. Próximo Paso
Dado que ahora existen `Tickets ABIERTOS` en PostgreSQL, requerimos finalizar el entorno backend programando el Panel Administrativo (**BK-11**) para que el moderador entre a esta tabla, lea los motivos y tenga el poder de suspender infractores permanentemente.
