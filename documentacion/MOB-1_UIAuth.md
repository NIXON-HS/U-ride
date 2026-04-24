# Reporte de Implementación Frontend: MOB-1

**Autor:** Equipo Frontend Mobile 
**Estado:** ✅ Completado

## 1. Descripción de la Tarea
Se inició la segunda gran fase del proyecto (El entorno Mobile o Interfaces). Resolvimos la tarea `MOB-1` logrando cumplir con el **Requerimiento No Funcional de Usabilidad (RNF3)** construyendo pantallas "reactivas" que responden velozmente y sin cuelgues, de diseño minimalista.

Implementamos el "Cerebro" de Memoria (`Zustand` con persistencia en `AsyncStorage`). Ahora, un estudiante ingresa su cuenta y nuestro `Store` global absorbe la respuesta de la API `POST /auth/login` (Backend Fase 1). Una vez capturado el "Token" JWT, reenvía inmediatamente y de manera automática al usuario a la página de Bienvenida.

## 2. Evidencia de Librerías y Arquitectura
- **Axios Global (`api.ts`):** Codificamos interceptores. Esto significa que los desarrolladores ya no tienen que poner "Bearer Token..." nunca más en sus funciones. `Axios` inyecta automáticamente la llave a todos los Requests.
- **Navegación Protectora:** Si cierras la APP y la vuelves a abrir, el `App.tsx` te llevará de golpe al Home porque tu token sigue en la bóveda, logrando una retención y experiencia estudiantil rápida (Sin volver a hacer logins inútiles por caducidad en corto plazo).

```tsx
// Lógica Extraída (Pantalla LoginScreen)
const handleLogin = async () => {
  // Pre Carga UI Local (Evita tráfico basura en la red HTTP)
  if (!email.trim().endsWith('@uta.edu.ec')) {
    Alert.alert('Fallo', 'Debes usar tu cuenta de correo asignada por la universidad.');
    return;
  }
}
```

## 3. Próximo Paso
Con el Login conectado exitosamente hacia NodeJS, ahora podemos crear la Vista del Dashboard Princinpal donde se usará `MOB-2` y `MOB-3` para leer y cargar los Viajes en Pantalla y renderizar Mapa o Celdas de Perfiles.
