import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Platform, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme/design';

export default function DriverScreen() {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [infracciones, setInfracciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const [reqRes, infraRes] = await Promise.all([
        api.get('/solicitudes/conductor'),
        api.get('/reportes/infracciones'),
      ]);
      setSolicitudes(reqRes.data.solicitudes || []);
      setInfracciones(infraRes.data.infracciones || []);
    } catch { /* sin conexión */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInbox(); }, []);

  const handleDecision = async (id: number, estado: 'ACEPTADO' | 'RECHAZADO') => {
    try {
      await api.put(`/solicitudes/${id}`, { estado });
      Alert.alert(
        estado === 'ACEPTADO' ? '✅ Cupo Confirmado' : '❌ Solicitud Rechazada',
        estado === 'ACEPTADO' ? 'El pasajero quedó registrado en tu viaje.' : 'La solicitud fue descartada.'
      );
      fetchInbox();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo procesar.');
    }
  };

  const RenderCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{item.pasajero_nombre?.charAt(0) ?? '?'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.pasajeroName}>{item.pasajero_nombre}</Text>
          <View style={styles.starsRow}>
            {[1,2,3,4,5].map(s => (
              <Ionicons key={s} name="star" size={12}
                color={s <= Math.round(item.reputacion_promedio) ? '#F59E0B' : COLORS.border} />
            ))}
            <Text style={styles.repText}> {item.reputacion_promedio}</Text>
          </View>
        </View>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>Pendiente</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleDecision(item.id, 'RECHAZADO')}>
          <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
          <Text style={styles.rejectText}>Rechazar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleDecision(item.id, 'ACEPTADO')}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
          <Text style={styles.acceptText}>Aceptar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const InfraccionCard = ({ item }: { item: any }) => {
    const isSuspension = item.resolucion_admin === 'SUSPENSION';
    const color = isSuspension ? COLORS.danger : '#D97706';
    const bgColor = isSuspension ? '#FEF2F2' : '#FFFBEB';
    return (
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: color, backgroundColor: bgColor }]}>
        <View style={styles.cardTop}>
          <View style={[styles.avatarCircle, { backgroundColor: color }]}>
            <Ionicons name={isSuspension ? 'ban-outline' : 'warning-outline'} size={22} color="#fff" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.pasajeroName, { color }]}>
              {isSuspension ? '🚫 Cuenta Suspendida' : '⚠️ Advertencia Formal'}
            </Text>
            <Text style={styles.repText}>Administración U-Ride</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: COLORS.dark }}>
          <Text style={{ fontFamily: FONTS.bold }}>Motivo: </Text>{item.motivo}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Bandeja de Solicitudes</Text>
          <Text style={styles.headerSub}>{solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''} pendiente{solicitudes.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchInbox}>
          <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={[...infracciones.map(i => ({ ...i, _tipo: 'infraccion' })), ...solicitudes.map(s => ({ ...s, _tipo: 'solicitud' }))]}
          keyExtractor={item => `${item._tipo}-${item.id}`}
          renderItem={({ item }) =>
            item._tipo === 'infraccion'
              ? <InfraccionCard item={item} />
              : <RenderCard item={item} />
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchInbox}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="mail-open-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyTitle}>Bandeja vacía</Text>
              <Text style={styles.emptySub}>No hay solicitudes pendientes en este momento</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 10) + 6 : 10, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.black, fontSize: 22, color: COLORS.dark },
  headerSub: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.gray, marginTop: 2 },
  refreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, marginBottom: 14, padding: 16, ...SHADOW.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: FONTS.bold, fontSize: 20, color: '#fff' },
  cardInfo: { flex: 1, marginLeft: 12 },
  pasajeroName: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.dark },
  starsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  repText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.gray },
  pendingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  pendingText: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#92400E' },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 14 },
  btnRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: RADIUS.md, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  rejectText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.danger },
  acceptBtn: { flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: RADIUS.md, backgroundColor: COLORS.secondary, ...SHADOW.sm },
  acceptText: { fontFamily: FONTS.bold, fontSize: 14, color: '#fff' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.gray, marginTop: 16 },
  emptySub: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.lightGray, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
});
