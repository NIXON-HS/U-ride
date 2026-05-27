import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput, ScrollView, Platform, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuthStore } from '../store/userStore';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme/design';

export default function PaymentScreen() {
  const user = useAuthStore(state => state.user);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [earnings, setEarnings] = useState(0);

  // Modal for payment process (Passenger side)
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [payMethod, setPayMethod] = useState<'STRIPE' | 'EFECTIVO' | 'TRANSFERENCIA'>('STRIPE');
  const [payLoading, setPayLoading] = useState(false);

  // Stripe Card Input States
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');

  const isPassenger = user?.rol === 'PASAJERO';

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isPassenger) {
        // Fetch passenger accepted trips (from solicitudes list)
        const resp = await api.get('/solicitudes/pasajero');
        const acceptedSolicitudes = (resp.data.solicitudes || []).filter(
          (s: any) => s.estado === 'ACEPTADO'
        );
        setPayments(acceptedSolicitudes);
      } else {
        // Fetch driver earnings & cobros list
        const resp = await api.get('/pagos/conductor');
        setPayments(resp.data.pagos || []);
        setEarnings(parseFloat(resp.data.ganancias_totales) || 0);
      }
    } catch (err: any) {
      console.log('Error fetching payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isPassenger]);

  const openPaymentModal = (req: any) => {
    setSelectedRequest(req);
    setCardNumber('');
    setExpMonth('');
    setExpYear('');
    setCvc('');
    setPayMethod('STRIPE');
    setPayModalVisible(true);
  };

  const handleCardNumberChange = (text: string) => {
    const cleanText = text.replace(/\D/g, '');
    const matches = cleanText.match(/\d{1,4}/g);
    const formatted = matches ? matches.join(' ') : '';
    setCardNumber(formatted);
  };

  const handleStripePay = async () => {
    if (!cardNumber || !expMonth || !expYear || !cvc) {
      Alert.alert('Datos incompletos', 'Por favor llena todos los campos de tu tarjeta.');
      return;
    }
    setPayLoading(true);
    try {
      const resp = await api.post('/pagos/stripe', {
        solicitudId: selectedRequest.id,
        cardNumber: cardNumber.replace(/\s+/g, ''),
        expMonth,
        expYear,
        cvc
      });
      Alert.alert('✅ ¡Pago Completado!', `Se han cobrado $${resp.data.monto} mediante Stripe correctamente.`);
      setPayModalVisible(false);
      fetchData();
    } catch (err: any) {
      Alert.alert('❌ Error en el pago', err.response?.data?.error || 'No se pudo procesar el pago.');
    } finally {
      setPayLoading(false);
    }
  };

  const handleOfflinePay = async (method: 'EFECTIVO' | 'TRANSFERENCIA') => {
    setPayLoading(true);
    try {
      await api.post('/pagos/declarar-offline', {
        solicitudId: selectedRequest.id,
        metodo: method
      });
      Alert.alert(
        '📨 Pago Declarado',
        `Has notificado al conductor que pagarás mediante ${method === 'EFECTIVO' ? 'Efectivo' : 'Transferencia'}. Espera su confirmación.`
      );
      setPayModalVisible(false);
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo declarar el pago.');
    } finally {
      setPayLoading(false);
    }
  };

  const handleConfirmReceipt = async (solicitudId: number, name: string) => {
    Alert.alert(
      'Confirmar Cobro',
      `¿Confirmas que has recibido el aporte de gasolina de ${name}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, confirmar',
          onPress: async () => {
            setLoading(true);
            try {
              await api.post(`/pagos/${solicitudId}/confirmar-recepcion`);
              Alert.alert('✅ Cobro Confirmado', 'El estado del aporte se ha registrado como COMPLETADO.');
              fetchData();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'No se pudo confirmar.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderPaymentBadge = (pagoEstado: string, metodoPago: string) => {
    let color = COLORS.warning;
    let label = 'Pendiente de Pago';
    let icon = 'ellipse-outline';

    if (pagoEstado === 'COMPLETADO') {
      color = COLORS.secondary;
      icon = 'checkmark-circle';
      if (metodoPago === 'TARJETA') label = 'Tarjeta (Stripe)';
      else if (metodoPago === 'EFECTIVO') label = 'Efectivo';
      else if (metodoPago === 'TRANSFERENCIA') label = 'Transferencia';
      else label = 'Pagado';
    } else if (pagoEstado === 'PENDIENTE_APROBACION') {
      color = COLORS.primary;
      icon = 'time';
      label = `Por verificar (${metodoPago === 'EFECTIVO' ? 'Efectivo' : 'Transferencia'})`;
    }

    return (
      <View style={[styles.badge, { backgroundColor: color + '15', borderColor: color }]}>
        <Ionicons name={icon as any} size={13} color={color} />
        <Text style={[styles.badgeText, { color }]}>{label}</Text>
      </View>
    );
  };

  const PassengerCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{item.conductor_nombre?.charAt(0) ?? '?'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.driverName}>{item.conductor_nombre}</Text>
          <Text style={styles.tripDate}>
            <Ionicons name="calendar-outline" size={13} /> {formatDate(item.fecha_salida)} a las {formatTime(item.fecha_salida)}
          </Text>
        </View>
        <View style={styles.costBadge}>
          <Text style={styles.costText}>${item.costo_contribucion}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        {renderPaymentBadge(item.pago_estado, item.metodo_pago)}
        
        {(!item.pago_estado || item.pago_estado === 'PENDIENTE') && (
          <TouchableOpacity style={styles.payBtn} onPress={() => openPaymentModal(item)}>
            <Ionicons name="wallet-outline" size={16} color="#fff" />
            <Text style={styles.payBtnText}>Pagar Aporte</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const DriverCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatarCircle, { backgroundColor: COLORS.secondary }]}>
          <Text style={styles.avatarText}>{item.pasajero_nombre?.charAt(0) ?? '?'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.driverName}>{item.pasajero_nombre}</Text>
          <Text style={styles.tripDate}>
            <Ionicons name="time-outline" size={13} /> {formatDate(item.fecha_salida)} · Viaje #{item.viaje_id}
          </Text>
        </View>
        <View style={styles.costBadge}>
          <Text style={styles.costText}>${item.costo_contribucion}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        {renderPaymentBadge(item.pago_estado, item.metodo_pago)}

        {item.pago_estado === 'PENDIENTE_APROBACION' && (
          <TouchableOpacity style={styles.confirmBtn} onPress={() => handleConfirmReceipt(item.solicitud_id, item.pasajero_nombre)}>
            <Ionicons name="checkbox-outline" size={16} color="#fff" />
            <Text style={styles.confirmBtnText}>Confirmar Recepción</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Gestión de Pagos</Text>
          <Text style={styles.headerSub}>
            {isPassenger ? 'Aportes por tus viajes como pasajero' : 'Cobros y balances de tu auto'}
          </Text>
        </View>
      </View>

      {/* Driver Earnings Summary Panel */}
      {!isPassenger && (
        <View style={styles.earningsPanel}>
          <View style={styles.earningsInfo}>
            <Text style={styles.earningsLabel}>Total Recaudado</Text>
            <Text style={styles.earningsAmount}>${earnings.toFixed(2)}</Text>
          </View>
          <View style={styles.earningsIconBox}>
            <Ionicons name="trending-up-outline" size={32} color="#fff" />
          </View>
        </View>
      )}

      {/* List of Payments */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => (isPassenger ? `p-${item.id}` : `d-${item.solicitud_id}`)}
          renderItem={({ item }) => (isPassenger ? <PassengerCard item={item} /> : <DriverCard item={item} />)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshing={loading}
          onRefresh={fetchData}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="cash-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyTitle}>Sin transacciones</Text>
              <Text style={styles.emptySub}>
                {isPassenger
                  ? 'No tienes viajes aceptados listos para pagar en este momento.'
                  : 'Aún no se registran aportes de pasajeros en tus viajes.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Passenger Payment Modal Sheet */}
      <Modal visible={payModalVisible} transparent animationType="slide" onRequestClose={() => setPayModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <Ionicons name="wallet" size={26} color={COLORS.primary} />
              <Text style={styles.modalTitle}>Aporte de Gasolina</Text>
            </View>
            <Text style={styles.modalSub}>
              Monto a contribuir: <Text style={{ fontFamily: FONTS.bold, color: COLORS.secondary }}>${selectedRequest?.costo_contribucion}</Text>
            </Text>

            {/* Payment Method Selector Tab */}
            <View style={styles.tabsRow}>
              <TouchableOpacity style={[styles.tab, payMethod === 'STRIPE' && styles.tabActive]} onPress={() => setPayMethod('STRIPE')}>
                <Ionicons name="card" size={16} color={payMethod === 'STRIPE' ? '#fff' : COLORS.gray} />
                <Text style={[styles.tabText, payMethod === 'STRIPE' && styles.tabTextActive]}>Tarjeta</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.tab, payMethod === 'EFECTIVO' && styles.tabActive]} onPress={() => setPayMethod('EFECTIVO')}>
                <Ionicons name="cash" size={16} color={payMethod === 'EFECTIVO' ? '#fff' : COLORS.gray} />
                <Text style={[styles.tabText, payMethod === 'EFECTIVO' && styles.tabTextActive]}>Efectivo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.tab, payMethod === 'TRANSFERENCIA' && styles.tabActive]} onPress={() => setPayMethod('TRANSFERENCIA')}>
                <Ionicons name="swap-horizontal" size={16} color={payMethod === 'TRANSFERENCIA' ? '#fff' : COLORS.gray} />
                <Text style={[styles.tabText, payMethod === 'TRANSFERENCIA' && styles.tabTextActive]}>Transfer</Text>
              </TouchableOpacity>
            </View>

            {/* Tab Contents */}
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {payMethod === 'STRIPE' && (
                <View style={styles.stripeForm}>
                  <Text style={styles.stripeTitle}>Formulario de Tarjeta (Stripe Modo Test)</Text>
                  
                  <View style={styles.inputBox}>
                    <Ionicons name="card-outline" size={18} color={COLORS.primary} />
                    <TextInput
                      style={styles.input}
                      placeholder="Número de Tarjeta (e.g. 4242 4242 4242 4242)"
                      placeholderTextColor={COLORS.lightGray}
                      keyboardType="numeric"
                      value={cardNumber}
                      onChangeText={handleCardNumberChange}
                      maxLength={19}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={[styles.inputBox, { flex: 1 }]}>
                      <TextInput
                        style={styles.input}
                        placeholder="Mes (MM)"
                        placeholderTextColor={COLORS.lightGray}
                        keyboardType="numeric"
                        value={expMonth}
                        onChangeText={setExpMonth}
                        maxLength={2}
                      />
                    </View>
                    <View style={[styles.inputBox, { flex: 1 }]}>
                      <TextInput
                        style={styles.input}
                        placeholder="Año (YY)"
                        placeholderTextColor={COLORS.lightGray}
                        keyboardType="numeric"
                        value={expYear}
                        onChangeText={setExpYear}
                        maxLength={2}
                      />
                    </View>
                    <View style={[styles.inputBox, { flex: 1 }]}>
                      <TextInput
                        style={styles.input}
                        placeholder="CVC"
                        placeholderTextColor={COLORS.lightGray}
                        keyboardType="numeric"
                        value={cvc}
                        onChangeText={setCvc}
                        secureTextEntry
                        maxLength={4}
                      />
                    </View>
                  </View>

                  <Text style={styles.testNote}>
                    * Puedes usar la tarjeta de pruebas de Stripe <Text style={{ fontFamily: FONTS.bold }}>4242 4242 4242 4242</Text>
                  </Text>
                </View>
              )}

              {payMethod === 'EFECTIVO' && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={24} color={COLORS.warning} />
                  <Text style={styles.infoText}>
                    Paga de forma física a tu conductor <Text style={{ fontFamily: FONTS.bold }}>{selectedRequest?.conductor_nombre}</Text> cuando ingreses al vehículo.
                  </Text>
                  <Text style={styles.infoSub}>
                    Haz clic abajo para declarar el pago. Tu conductor recibirá una notificación para confirmarlo.
                  </Text>
                </View>
              )}

              {payMethod === 'TRANSFERENCIA' && (
                <View style={styles.infoBox}>
                  <Ionicons name="business-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.infoText}>
                    Datos Bancarios del Conductor:
                  </Text>
                  <View style={styles.bankDetails}>
                    <Text style={styles.bankLine}>🏦 Banco: Banco del Pichincha (Ahorros)</Text>
                    <Text style={styles.bankLine}>👤 Beneficiario: {selectedRequest?.conductor_nombre}</Text>
                    <Text style={styles.bankLine}>📄 Correo: contacto@uta.edu.ec</Text>
                    <Text style={styles.bankLine}>🔢 Cuenta: 2204569871</Text>
                  </View>
                  <Text style={styles.infoSub}>
                    Una vez realizada la transferencia bancaria en la app de tu banco, haz clic abajo para declarar tu pago.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Submit Action Buttons */}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPayModalVisible(false)} disabled={payLoading}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              {payMethod === 'STRIPE' ? (
                <TouchableOpacity style={styles.modalPayBtn} onPress={handleStripePay} disabled={payLoading}>
                  {payLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={16} color="#fff" />
                      <Text style={styles.modalPayText}>Pagar con Stripe</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.modalPayBtn, { backgroundColor: COLORS.secondary }]}
                  onPress={() => handleOfflinePay(payMethod)}
                  disabled={payLoading}
                >
                  {payLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="mail" size={16} color="#fff" />
                      <Text style={styles.modalPayText}>Declarar Pago</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 10) + 6 : 10,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: COLORS.border
  },
  headerTitle: { fontFamily: FONTS.black, fontSize: 22, color: COLORS.dark },
  headerSub: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.gray, marginTop: 2 },
  refreshIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  earningsPanel: {
    margin: 16,
    padding: 20,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOW.md
  },
  earningsInfo: { gap: 4 },
  earningsLabel: { fontFamily: FONTS.medium, fontSize: 13, color: '#EEF2FF', textTransform: 'uppercase' },
  earningsAmount: { fontFamily: FONTS.black, fontSize: 32, color: '#fff' },
  earningsIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 14,
    ...SHADOW.sm
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: { fontFamily: FONTS.bold, fontSize: 18, color: '#fff' },
  cardInfo: { flex: 1, marginLeft: 12 },
  driverName: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.dark },
  tripDate: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.gray, marginTop: 2 },
  costBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  costText: { fontFamily: FONTS.bold, color: COLORS.secondary, fontSize: 14 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1
  },
  badgeText: { fontFamily: FONTS.semiBold, fontSize: 11 },
  payBtn: {
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    gap: 6
  },
  payBtnText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 13 },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    gap: 6
  },
  confirmBtnText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 13 },
  emptyBox: { alignItems: 'center', marginTop: 80, paddingHorizontal: 30 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.gray, marginTop: 16 },
  emptySub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.lightGray, marginTop: 6, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 32 },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitle: { fontFamily: FONTS.black, fontSize: 20, color: COLORS.dark },
  modalSub: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.gray, marginTop: 6, marginBottom: 20 },
  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gray },
  tabTextActive: { color: '#fff' },
  stripeForm: { gap: 12 },
  stripeTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.dark },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border
  },
  input: { flex: 1, fontFamily: FONTS.regular, fontSize: 14, color: COLORS.dark, paddingVertical: 11 },
  testNote: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.gray, marginTop: 2 },
  infoBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: COLORS.warning,
    borderRadius: RADIUS.md,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  infoText: { fontFamily: FONTS.bold, fontSize: 14, color: '#78350F', textAlign: 'center' },
  infoSub: { fontFamily: FONTS.regular, fontSize: 12, color: '#B45309', textAlign: 'center', lineHeight: 18 },
  bankDetails: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: RADIUS.sm,
    padding: 12,
    width: '100%',
    marginVertical: 4,
    gap: 6
  },
  bankLine: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.dark },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 24 },
  modalCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: RADIUS.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCancelText: { fontFamily: FONTS.bold, color: COLORS.danger },
  modalPayBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    gap: 8,
    ...SHADOW.sm
  },
  modalPayText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 14 }
});
