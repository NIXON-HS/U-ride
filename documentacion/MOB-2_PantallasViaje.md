# Reporte de Vistas y Componentes: MOB-2

**Autor:** Equipo de React Native Architecture
**Estado:** ✅ Completado

## 1. Descripción Técnica y Diseño
El requerimiento funcional clave **RF9** estipulaba que *"las reglas fijadas por el Conductor deben ser Visibles en todo momento al solicitar el transporte para evitar incidentes graves durante el viaje"*. 

Para solucionar este requerimiento legal a nivel UI, construimos una jerarquía doble en React Native:
1. **La Cartilla (Feed Zonal):** Se muestra una lista elegante (`FlatList`) separando cada coche cercano por "Metros de distancia (PostGIS)". No muestra el botón 'Solicitar Viaje' de manera abierta. Obliga al estudiante a presionar **"Ver Reglas y Unirse"**.
2. **El Modal de Bloqueo (Modal Overlay):** Cuando el estudiante presiona la cartilla, la pantalla se opaca (RGBA Background), emerge un cuadro blanco con un Warning obligándolo a leer el `notas_reglas` amarillo intenso. El usuario **solo** puede enviar la solicitud una vez ha presionado con intención el botón de aprobación cruzada de reglas. 

## 2. Flujo Exitoso del Botón
```typescript
// HomeScreen.tsx - Función Interceptora
  const handleRequestRide = async () => {
    try {
       // Disparo a BK-6 (Transacción ACID Backend)
       await api.post('/solicitudes', { viaje_id: selectedViaje.id });
       Alert.alert('Éxito', '¡Solicitud formalizada! Espera a que el conductor acepte.');
       setModalVisible(false);
    } catch(err: any) {
       // Recepción Gráfica de Rechazo por Falta de Cupos Múltiples (Resuelve bugs UI)
       Alert.alert('Match fallido', err.response?.data?.error || 'No se pudo enviar la solicitud.');
    }
  };
```

## 3. Próximo Paso
Dado que ahora el Pasajero puede logearse (`MOB-1`), y tiene el Home configurado pidiendo cupos y leyendo las reglas(`MOB-2`), todo el ciclo principal del pasajero está blindado en React Native. 

Falta el ciclo móvil del conductor, la cual sería la tarea **MOB-3: La Interfaz de Publicar Ruta**.
