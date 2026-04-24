# Reporte de Implementación: BD-1_Esquema

**Autor:** Equipo de Base de Datos Base
**Estado:** ✅ Completado

## 1. Descripción de la Tarea
Se ha estructurado y codificado el Script Transaccional (SQL) completo que alojará la información transaccional de todo el ecosistema U-Ride. Se incorporó `PostGIS` para cumplir el **RNF2** de zonas aproximadas y una tabla de `logs_eventos` dedicada puramente al **RNF4** de trazabilidad de los viajes.

## 2. Evidencia de Código (DDL Generado)
El script completo fue creado satisfactoriamente en `backend/src/models/schema.sql`. La base relacional incorpora reglas semánticas como el `CHECK` de reputación entre 1 a 5 y validación anti-fraude de "cupos >= 0".

A continuación, una porción de las tablas más importantes creadas:

```sql
-- 1. Tabla de Usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email_institucional VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    zona_hogar GEOMETRY(Point, 4326),
    rol VARCHAR(20) DEFAULT 'ESTUDIANTE' CHECK (rol IN ('ESTUDIANTE', 'ADMINISTRADOR')),
    reputacion_promedio NUMERIC(3,2) DEFAULT 5.00
);

-- 2. Manejador de Trazabilidad (RNF4)
CREATE TABLE logs_eventos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    tipo_evento VARCHAR(50) NOT NULL,
    detalles JSONB,
    fecha_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 3. Próximo Paso
Se requiere ingresar a una terminal conectada al cliente `PostgreSQL` de tu máquina y ejecutar el comando `psql -U postgres -d uride -f src/models/schema.sql` para que las tablas "existan" virtualmente en tu servidor local.
