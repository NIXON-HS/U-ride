import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Platform, StatusBar, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuthStore } from '../store/userStore';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme/design';

export default function ProfileScreen() {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const loginAction = useAuthStore(state => state.login);
  const logout = useAuthStore(state => state.logout);

  const [carrera, setCarrera] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState<'PASAJERO' | 'CONDUCTOR'>('PASAJERO');
  const [reputacion, setReputacion] = useState('5.0');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);
  const [direccion, setDireccion] = useState<string | null>(null);
  const [stats, setStats] = useState({ viajesConductor: 0, viajesPasajero: 0 });
  const [loading, setLoading] = useState(false);

  const API_URL = api.defaults.baseURL?.replace('/api', '') || 'http://192.168.1.119:3000';

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setFotoUri(result.assets[0].uri);
    }
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso', 'Necesitamos acceso a la ubicación para establecer tu zona.');
      return;
    }
    setLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude;
      const lon = location.coords.longitude;
      setLatitud(lat);
      setLongitud(lon);
      
      const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (geocode && geocode.length > 0) {
        const addr = geocode[0];
        const calle = addr.street || addr.name || addr.district || 'Calle Desconocida';
        const ciudad = addr.city || addr.subregion || addr.region || '';
        setDireccion(`${calle}, ${ciudad}`);
      }

      Alert.alert('¡Capturada!', 'Zona de referencia actualizada. Recuerda Guardar los Cambios.');
    } catch {
      Alert.alert('Error', 'No se pudo obtener la ubicación.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/perfil')
      .then(res => {
        const p = res.data.perfil;
        setCarrera(p.carrera || '');
        setTelefono(p.telefono || '');
        setRol(p.rol === 'CONDUCTOR' ? 'CONDUCTOR' : 'PASAJERO');
        setFotoUrl(p.foto_url || null);
        if (p.zona_lat && p.zona_lon) {
          const lat = parseFloat(p.zona_lat);
          const lon = parseFloat(p.zona_lon);
          setLatitud(lat);
          setLongitud(lon);
          Location.reverseGeocodeAsync({ latitude: lat, longitude: lon })
            .then(res => {
              if (res[0]) {
                const addr = res[0];
                const calle = addr.street || addr.name || addr.district || 'Calle Desconocida';
                const ciudad = addr.city || addr.subregion || addr.region || '';
                setDireccion(`${calle}, ${ciudad}`);
              }
            })
            .catch(() => {});
        }
        setReputacion(p.reputacion_promedio ? parseFloat(p.reputacion_promedio).toFixed(1) : '5.0');
        setStats({
          viajesConductor: parseInt(p.viajes_conductor) || 0,
          viajesPasajero: parseInt(p.viajes_pasajero) || 0,
        });
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('carrera', carrera);
      formData.append('telefono', telefono);
      formData.append('rol', rol);
      if (latitud && longitud) {
        formData.append('latitud', String(latitud));
        formData.append('longitud', String(longitud));
      }
      if (fotoUri && fotoUri.startsWith('file://')) {
        const filename = fotoUri.split('/').pop() || 'foto.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('foto', { uri: fotoUri, name: filename, type } as any);
      }

      const res = await api.put('/perfil', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (user && token) await loginAction(token, { ...user, rol });
      if (res.data.perfil) {
        const p = res.data.perfil;
        setFotoUrl(p.foto_url || null);
        setFotoUri(null);
        setStats({
          viajesConductor: parseInt(p.viajes_conductor) || 0,
          viajesPasajero: parseInt(p.viajes_pasajero) || 0,
        });
      }
      Alert.alert('Perfil actualizado', 'Los cambios se guardaron correctamente.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo guardar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatar} onPress={pickImage} activeOpacity={0.8}>
            {fotoUri || fotoUrl ? (
              <Image source={{ uri: fotoUri || `${API_URL}${fotoUrl}` }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{user?.nombre?.charAt(0).toUpperCase() ?? 'U'}</Text>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.nombre}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={[styles.badge, rol === 'CONDUCTOR' ? styles.badgeConductor : styles.badgePasajero]}>
            <Ionicons name={rol === 'CONDUCTOR' ? 'car-sport' : 'person'} size={13} color={rol === 'CONDUCTOR' ? COLORS.secondary : COLORS.primary} />
            <Text style={[styles.badgeText, { color: rol === 'CONDUCTOR' ? COLORS.secondary : COLORS.primary }]}>{rol}</Text>
          </View>
        </View>

        {/* Campos */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mis Datos</Text>

          <Text style={styles.label}>Carrera / Facultad</Text>
          <View style={styles.inputRow}>
            <Ionicons name="school-outline" size={18} color={COLORS.primary} />
            <TextInput style={styles.input} placeholder="Ingeniería en Sistemas" placeholderTextColor={COLORS.lightGray} value={carrera} onChangeText={setCarrera} />
          </View>

          <Text style={styles.label}>Teléfono (opcional)</Text>
          <View style={styles.inputRow}>
            <Ionicons name="call-outline" size={18} color={COLORS.primary} />
            <TextInput style={styles.input} placeholder="0999999999" placeholderTextColor={COLORS.lightGray} keyboardType="phone-pad" value={telefono} onChangeText={setTelefono} />
          </View>

          <Text style={styles.label}>Zona / Barrio de Referencia</Text>
          <TouchableOpacity style={styles.locationBtn} onPress={getLocation}>
            <Ionicons name={latitud ? "location" : "location-outline"} size={18} color={latitud ? COLORS.secondary : COLORS.primary} />
            <Text style={[styles.locationBtnText, latitud ? { color: COLORS.secondary } : null]} numberOfLines={1} ellipsizeMode="tail">
              {direccion ? direccion : (latitud ? 'Zona Capturada (Tocar para actualizar)' : 'Capturar GPS Actual')}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Mi Rol</Text>
          <View style={styles.rolRow}>
            <TouchableOpacity
              style={[styles.rolBtn, rol === 'PASAJERO' && { backgroundColor: '#EEF2FF', borderColor: COLORS.primary }]}
              onPress={() => setRol('PASAJERO')}
            >
              <Ionicons name="person-outline" size={18} color={rol === 'PASAJERO' ? COLORS.primary : COLORS.lightGray} />
              <Text style={[styles.rolBtnText, { color: rol === 'PASAJERO' ? COLORS.primary : COLORS.lightGray }]}>Pasajero</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rolBtn, rol === 'CONDUCTOR' && { backgroundColor: '#ECFDF5', borderColor: COLORS.secondary }]}
              onPress={() => setRol('CONDUCTOR')}
            >
              <Ionicons name="car-sport-outline" size={18} color={rol === 'CONDUCTOR' ? COLORS.secondary : COLORS.lightGray} />
              <Text style={[styles.rolBtnText, { color: rol === 'CONDUCTOR' ? COLORS.secondary : COLORS.lightGray }]}>Conductor</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <View style={styles.btnInner}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Guardar Cambios</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Estadísticas */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="star" size={22} color="#F59E0B" />
            <Text style={styles.statValue}>{reputacion}</Text>
            <Text style={styles.statLabel}>Reputación</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="car-outline" size={22} color={COLORS.primary} />
            <Text style={styles.statValue}>{rol === 'CONDUCTOR' ? stats.viajesConductor : stats.viajesPasajero}</Text>
            <Text style={styles.statLabel}>Viajes</Text>
          </View>
        </View>

        {/* Cerrar sesión */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 10) : 0 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12, ...SHADOW.md },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarText: { fontFamily: FONTS.black, fontSize: 38, color: '#fff' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.secondary, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  name: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.dark },
  email: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.gray, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, paddingHorizontal: 14, paddingVertical: 5, borderRadius: RADIUS.full },
  badgeConductor: { backgroundColor: '#ECFDF5' },
  badgePasajero: { backgroundColor: '#EEF2FF' },
  badgeText: { fontFamily: FONTS.semiBold, fontSize: 13 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 20, marginBottom: 16, ...SHADOW.sm },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.dark, marginBottom: 16 },
  label: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.gray, marginBottom: 6, marginTop: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: 14, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 4 },
  input: { flex: 1, fontFamily: FONTS.regular, fontSize: 15, color: COLORS.dark, paddingVertical: 13 },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 4 },
  locationBtnText: { flex: 1, fontFamily: FONTS.medium, fontSize: 14, color: COLORS.dark },
  rolRow: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 20 },
  rolBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 13, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border },
  rolBtnText: { fontFamily: FONTS.semiBold, fontSize: 14 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 15, alignItems: 'center', ...SHADOW.md },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, alignItems: 'center', gap: 4, ...SHADOW.sm },
  statValue: { fontFamily: FONTS.black, fontSize: 24, color: COLORS.dark },
  statLabel: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.gray },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', padding: 15, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#FECACA' },
  logoutText: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.danger },
});
