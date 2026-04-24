-- Escudo de compatibilidad (GEOMETRY eliminado por Haversine Nativo en Windows)

-- 1. Tabla de Usuarios (Estudiantes y Administradores)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'PASAJERO',
    activo BOOLEAN DEFAULT TRUE,
    carrera VARCHAR(100),
    cedula VARCHAR(20) UNIQUE,
    telefono VARCHAR(20),
    foto_url VARCHAR(255),
    zona_lat FLOAT,
    zona_lon FLOAT,
    reputacion_promedio DECIMAL(3,2) DEFAULT 5.00,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Vehículos (Conductor -> Vehículo 1:N)
CREATE TABLE vehiculos (
    id SERIAL PRIMARY KEY,
    conductor_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    placa VARCHAR(20) UNIQUE NOT NULL,
    marca VARCHAR(50) NOT NULL,
    color VARCHAR(30) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Viajes (RF3 y RF9)
CREATE TABLE viajes (
    id SERIAL PRIMARY KEY,
    conductor_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Matchmaking Haversine Nativo
    origen_lat FLOAT NOT NULL,
    origen_lon FLOAT NOT NULL,
    destino_lat FLOAT NOT NULL,
    destino_lon FLOAT NOT NULL,
    
    fecha_salida TIMESTAMP NOT NULL,
    cupos_disponibles INT NOT NULL CHECK (cupos_disponibles >= 0),
    
    -- Reglas Visibles RF9
    notas_reglas TEXT NOT NULL, 
    costo_contribucion DECIMAL(5,2) DEFAULT 0.00,
    estado VARCHAR(20) DEFAULT 'ACTIVO', -- ACTIVO, CERRADO, EN_CURSO
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Solicitudes y Matchmaking (Transaccional RF5, RF6, RF7)
CREATE TABLE solicitudes (
    id SERIAL PRIMARY KEY,
    viaje_id INT REFERENCES viajes(id) ON DELETE CASCADE,
    pasajero_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    estado VARCHAR(20) DEFAULT 'PENDIENTE', -- PENDIENTE, ACEPTADO, RECHAZADO
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (viaje_id, pasajero_id)
);

-- 5. Sistema Ciego de Evaluaciones (RF8)
CREATE TABLE evaluaciones (
    id SERIAL PRIMARY KEY,
    viaje_id INT REFERENCES viajes(id) ON DELETE CASCADE,
    evaluador_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    evaluado_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    calificacion INT CHECK (calificacion BETWEEN 1 AND 5),
    comentario TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (viaje_id, evaluador_id, evaluado_id)
);

-- 6. Sistema de Reportes Disciplinarios (RF10 y RF11)
CREATE TABLE reportes (
    id SERIAL PRIMARY KEY,
    denunciante_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    denunciado_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    viaje_id INT REFERENCES viajes(id) ON DELETE SET NULL,
    motivo TEXT NOT NULL,
    evidencia_url VARCHAR(255),
    estado VARCHAR(20) DEFAULT 'ABIERTO', -- ABIERTO, RESUELTO, DESESTIMADO
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. RNF4 - Trazabilidad Logística (Ciberseguridad)
CREATE TABLE logs_eventos (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo_evento VARCHAR(50) NOT NULL,
    detalles JSONB,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
