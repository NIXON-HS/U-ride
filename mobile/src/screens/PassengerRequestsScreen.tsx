import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, Platform, StatusBar, Linking, TouchableOpacity
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme/design';

export default function PassengerRequestsScreen() {
  const nav = useNavigation();
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [infracciones, setInfracciones] = useState<any[]>([]);
  const [toRate, setToRate] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const [reqRes, infraRes, rateRes] = await Promise.all([
        api.get('/solicitudes/pasajero'),
        api.get('/reportes/infracciones'),
        api.get('/solicitudes/para-calificar/pasajero')
      ]);
      setSolicitudes(reqRes.data.solicitudes || []);
      setInfracciones(infraRes.data.infracciones || []);
      setToRate(rateRes.data.solicitudes || []);
    } catch { /* sin conexión */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInbox(); }, []);

  const handleCancel = (id: number) => {
    if (!id) return;
    // Confirm
    const proceed = async () => {
      try {
        await api.delete(`/solicitudes/${id}`);
        fetchInbox();
      } catch (err: any) { /* ignore */ }
    };
    // Simple confirmation using window Alert
    // Use global Alert
    const { Alert } = require('react-native');
    Alert.alert('Cancelar solicitud', '¿Deseas cancelar tu solicitud?', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cancelar', onPress: proceed }
    ]);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateChip = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()} ${d.toLocaleDateString('es-ES', { month: 'short' })}`;
  };

  const RenderCard = ({ item }: { item: any }) => {
    let statusColor = COLORS.warning;
    let statusIcon = 'time-outline' as any;
    
    if (item.estado === 'ACEPTADO' || item.estado === 'CALIFICADO') {
      statusColor = COLORS.secondary;
      statusIcon = 'checkmark-circle';
    } else if (item.estado === 'RECHAZADO') {
      statusColor = COLORS.danger;
      statusIcon = 'close-circle';
    }

    return (
      <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{item.conductor_nombre?.charAt(0) ?? '?'}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.conductorName}>{item.conductor_nombre}</Text>
              <View style={styles.starsRow}>
                {[1,2,3,4,5].map(s => (
                  <Ionicons key={s} name="star" size={12}
                    color={s <= Math.round(item.conductor_reputacion) ? '#F59E0B' : COLORS.border} />
                ))}
                <Text style={styles.repText}> {item.conductor_reputacion}</Text>
              </View>
            </View>
            {item.estado === 'PENDIENTE' ? (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>Pendiente</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}> 
                <Ionicons name={statusIcon} size={14} color={statusColor} />
                <Text style={[styles.statusText, { color: statusColor }]}>{item.estado}</Text>
              </View>
            )}
          </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailChip}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
            <Text style={styles.detailChipText}>{formatDateChip(item.fecha_salida)}</Text>
          </View>
          <View style={styles.detailChip}>
            <Ionicons name="time-outline" size={14} color="#D97706" />
            <Text style={styles.detailChipText}>{formatTime(item.fecha_salida)}</Text>
          </View>
          {item.estado_viaje !== 'ACTIVO' && (
            <View style={[styles.detailChip, { backgroundColor: '#FEF2F2' }]}>
              <Text style={[styles.detailChipText, { color: COLORS.danger }]}>Viaje {item.estado_viaje}</Text>
            </View>
          )}
        </View>

        {(item.estado === 'ACEPTADO' || item.estado === 'CALIFICADO') && item.conductor_telefono && (
          <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${item.conductor_telefono}`)}>
            <Ionicons name="call" size={16} color="#fff" />
            <Text style={styles.contactText}>Llamar al Conductor: {item.conductor_telefono}</Text>
          </TouchableOpacity>
        )}

        {item.estado === 'PENDIENTE' && (
          <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#FEF2F2', marginTop: 10 }]} onPress={() => handleCancel(item.id)}>
            <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            <Text style={[styles.contactText, { color: COLORS.danger, marginLeft: 8 }]}>Cancelar solicitud</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

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
            <Text style={[styles.conductorName, { color }]}> 
              {isSuspension ? '🚫 Cuenta Suspendida' : '⚠️ Advertencia Formal'}
            </Text>
            <Text style={styles.repText}>Administración U-Ride</Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 10 }} />
        <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: COLORS.dark }}>
          <Text style={{ fontFamily: FONTS.bold }}>Motivo del reporte: </Text>{item.motivo}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Bandeja de Solicitudes</Text>
          <Text style={styles.headerSub}>{(() => {
            const pending = solicitudes.filter(s => s.estado === 'PENDIENTE').length;
            return `${pending} solicitud${pending !== 1 ? 'es' : ''} pendiente${pending !== 1 ? 's' : ''}`;
          })()}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <FlatList
            data={[
              ...infracciones.map(i => ({ ...i, _tipo: 'infraccion' })),
              ...solicitudes
                .filter(s => {
                  const ids = new Set(toRate.map((r: any) => r.viaje_id));
                  return !ids.has(s.viaje_id);
                })
                .map(s => ({ ...s, _tipo: 'solicitud' }))
            ]}
            keyExtractor={item => `${item._tipo}-${item.id}`}
            renderItem={({ item }) =>
              item._tipo === 'infraccion'
                ? <InfraccionCard item={item} />
                : <RenderCard item={item} />
            }
            contentContainerStyle={styles.list}
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

          {toRate.length > 0 && (
            <View style={{ padding: 16 }}>
              <Text style={{ fontFamily: FONTS.black, fontSize: 18, marginBottom: 10 }}>Solicitudes para calificar</Text>
              <FlatList
                data={toRate}
                keyExtractor={item => `rate-${item.id}`}
                renderItem={({ item }) => (
                  <View style={[styles.card, { marginBottom: 12 }]}> 
                    <View style={styles.cardTop}>
                      <View style={styles.avatarCircle}><Text style={styles.avatarText}>{item.conductor_nombre?.charAt(0) ?? '?'}</Text></View>
                      <View style={styles.cardInfo}><Text style={styles.conductorName}>{item.conductor_nombre}</Text><Text style={styles.repText}>Solicitado el {new Date(item.fecha_salida).toLocaleDateString()}</Text></View>
                      <View style={[styles.pendingBadge, { backgroundColor: '#ECFDF5' }]}><Text style={[styles.pendingText, { color: COLORS.secondary }]}>Cerrado</Text></View>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                      <TouchableOpacity style={[styles.acceptBtn, { paddingHorizontal: 18 }]} onPress={() => nav.navigate('Rate', { viaje_id: item.viaje_id, evaluado_id: item.conductor_id, nombre_evaluado: item.conductor_nombre, onRated: fetchInbox })}>
                        <Ionicons name="star" size={16} color="#fff" />
                        <Text style={[styles.acceptText, { marginLeft: 8 }]}>Calificar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: COLORS.border, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 10) + 6 : 10 },
  headerTitle: { fontFamily: FONTS.black, fontSize: 24, color: COLORS.dark },
  headerSub: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.gray, marginTop: 4 },
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 16, marginBottom: 14, ...SHADOW.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: FONTS.bold, fontSize: 18, color: '#fff' },
  cardInfo: { flex: 1, marginLeft: 12 },
  conductorName: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.dark },
  starsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  repText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.gray },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full },
  statusText: { fontFamily: FONTS.bold, fontSize: 12 },
  cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, paddingBottom: 6 },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  detailChipText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.dark },
  contactBtn: { marginTop: 12, backgroundColor: COLORS.secondary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: RADIUS.md, gap: 8 },
  contactText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 14 },
  pendingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  pendingText: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#92400E' },
  acceptBtn: { flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: RADIUS.md, backgroundColor: COLORS.secondary, ...SHADOW.sm },
  acceptText: { fontFamily: FONTS.bold, fontSize: 14, color: '#fff' },
  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.gray, marginTop: 16 },
  emptySubText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.lightGray, marginTop: 6, textAlign: 'center' },
});
