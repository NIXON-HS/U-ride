import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Platform, StatusBar, Modal, FlatList, Image, RefreshControl
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme/design';

export default function ReportScreen({ route, navigation }: any) {
  const [viajes, setViajes] = useState<any[]>([]);
  const [participantes, setParticipantes] = useState<any[]>([]);
  
  const [selectedViaje, setSelectedViaje] = useState<any>(null);
  const [selectedParticipante, setSelectedParticipante] = useState<any>(null);
  
  const [motivo, setMotivo] = useState('');
  const [evidenciaUri, setEvidenciaUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [modalViajes, setModalViajes] = useState(false);
  const [modalParticipantes, setModalParticipantes] = useState(false);

  useEffect(() => {
    fetchMisViajes();
  }, []);

  useEffect(() => {
    const viajeIdParam = route?.params?.viajeId;
    if (viajeIdParam) {
      const loadPreselectedTrip = async () => {
        try {
          const resp = await api.get(`/viajes/${viajeIdParam}`);
          const v = resp.data.viaje;
          setSelectedViaje(v);
          fetchParticipantes(viajeIdParam);
        } catch (err) {
          console.log('Error loading preselected trip:', err);
        }
      };
      loadPreselectedTrip();
    }
  }, [route?.params?.viajeId]);

  const fetchMisViajes = async () => {
    setLoadingData(true);
    try {
      const res = await api.get('/viajes/historial/mios');
      // Permitir reportar viajes en curso y finalizados/cerrados
      const all = res.data.viajes || [];
      setViajes(all.filter((v: any) => v.estado === 'CERRADO' || v.estado === 'EN_CURSO'));
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchParticipantes = async (viajeId: number) => {
    setLoadingData(true);
    setParticipantes([]);
    setSelectedParticipante(null);
    try {
      const res = await api.get(`/viajes/${viajeId}/participantes`);
      setParticipantes(res.data.participantes || []);
    } catch (err) {
      Alert.alert('Error', 'No se pudieron cargar los participantes del viaje.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSelectViaje = (viaje: any) => {
    setSelectedViaje(viaje);
    setModalViajes(false);
    fetchParticipantes(viaje.id);
  };

  const handleSelectParticipante = (participante: any) => {
    setSelectedParticipante(participante);
    setModalParticipantes(false);
  };

  const pickEvidence = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.6,
    });
    if (!result.canceled) {
      setEvidenciaUri(result.assets[0].uri);
    }
  };

  const handleReport = async () => {
    if (!selectedParticipante || !motivo.trim())
      return Alert.alert('Campos requeridos', 'Debes seleccionar al estudiante y explicar el motivo.');
    if (motivo.trim().length < 20)
      return Alert.alert('Motivo muy corto', 'Describe la conducta con al menos 20 caracteres.');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('denunciado_id', String(selectedParticipante.id));
      formData.append('motivo', motivo.trim());

      if (evidenciaUri) {
        const filename = evidenciaUri.split('/').pop() || 'evidencia.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('evidencia', { uri: evidenciaUri, name: filename, type } as any);
      }

      await api.post('/reportes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      Alert.alert('Reporte enviado', 'El equipo administrativo revisará tu denuncia pronto.');
      setSelectedViaje(null);
      setSelectedParticipante(null);
      setMotivo('');
      setEvidenciaUri(null);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo enviar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loadingData} onRefresh={fetchMisViajes} colors={[COLORS.primary]} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reportar Conducta</Text>
          <Text style={styles.headerSub}>Tu denuncia es confidencial</Text>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>Selecciona el viaje y la persona implicada. Esto ayudará a tomar medidas correctivas precisas.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>1. Selecciona el Viaje</Text>
          <TouchableOpacity 
            style={styles.selectorBtn} 
            onPress={() => setModalViajes(true)}
            disabled={loadingData}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="car-outline" size={20} color={selectedViaje ? COLORS.dark : COLORS.lightGray} />
              <Text style={[styles.selectorText, !selectedViaje && { color: COLORS.lightGray }]}>
                {selectedViaje 
                  ? `Viaje de ${selectedViaje.conductor} (${formatDate(selectedViaje.fecha_salida)})` 
                  : loadingData ? 'Cargando viajes...' : 'Toca para elegir un viaje'}
              </Text>
            </View>
            <Ionicons name="chevron-down-outline" size={18} color={COLORS.gray} />
          </TouchableOpacity>

          <Text style={styles.label}>2. Selecciona al Estudiante</Text>
          <TouchableOpacity 
            style={[styles.selectorBtn, !selectedViaje && styles.disabledBtn]} 
            onPress={() => setModalParticipantes(true)}
            disabled={!selectedViaje || loadingData}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="person-outline" size={20} color={selectedParticipante ? COLORS.dark : COLORS.lightGray} />
              <Text style={[styles.selectorText, !selectedParticipante && { color: COLORS.lightGray }]}>
                {selectedParticipante 
                  ? `${selectedParticipante.nombre} (${selectedParticipante.rol_viaje})` 
                  : (selectedViaje ? 'Toca para elegir al estudiante' : 'Primero elige un viaje')}
              </Text>
            </View>
            <Ionicons name="chevron-down-outline" size={18} color={COLORS.gray} />
          </TouchableOpacity>

          <Text style={styles.label}>3. Motivo del Reporte</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe detalladamente la conducta indebida que presenciaste..."
            placeholderTextColor={COLORS.lightGray}
            multiline={true}
            numberOfLines={5}
            value={motivo}
            onChangeText={setMotivo}
            editable={!!selectedParticipante}
          />
          <Text style={[styles.charCount, motivo.length >= 20 && styles.charCountOk]}>
            {motivo.length} / mín. 20 caracteres
          </Text>

          <Text style={styles.label}>4. Evidencia (Opcional)</Text>
          <TouchableOpacity style={styles.evidenceBtn} onPress={pickEvidence}>
             <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
             <Text style={styles.evidenceText}>{evidenciaUri ? 'Cambiar Evidencia' : 'Adjuntar Captura o Foto'}</Text>
          </TouchableOpacity>
          
          {evidenciaUri && (
            <View style={styles.previewContainer}>
               <Image source={{ uri: evidenciaUri }} style={styles.previewImage} />
               <TouchableOpacity style={styles.removeEvidence} onPress={() => setEvidenciaUri(null)}>
                 <Ionicons name="close-circle" size={28} color={COLORS.danger} />
               </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.reportBtn, (!selectedParticipante || motivo.length < 20) && styles.disabledBtn]} 
            onPress={handleReport} 
            disabled={loading || !selectedParticipante || motivo.length < 20}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <View style={styles.btnInner}>
                <Ionicons name="flag-outline" size={18} color={(!selectedParticipante || motivo.length < 20) ? COLORS.gray : "#fff"} />
                <Text style={[styles.reportBtnText, (!selectedParticipante || motivo.length < 20) && { color: COLORS.gray }]}>Enviar Reporte</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Viajes */}
      <Modal visible={modalViajes} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tus Viajes</Text>
              <TouchableOpacity onPress={() => setModalViajes(false)}>
                <Ionicons name="close-circle" size={26} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={viajes}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectViaje(item)}>
                  <Ionicons name="car-sport-outline" size={24} color={COLORS.primary} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.modalItemTitle}>Conductor: {item.conductor}</Text>
                    <Text style={styles.modalItemSub}>Fecha: {formatDate(item.fecha_salida)} - Estado: {item.estado}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.gray }}>No tienes viajes en tu historial.</Text>}
              refreshing={loadingData}
              onRefresh={fetchMisViajes}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Participantes */}
      <Modal visible={modalParticipantes} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Participantes</Text>
              <TouchableOpacity onPress={() => setModalParticipantes(false)}>
                <Ionicons name="close-circle" size={26} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={participantes}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectParticipante(item)}>
                  <Ionicons name="person-circle-outline" size={24} color={COLORS.secondary} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.modalItemTitle}>{item.nombre}</Text>
                    <Text style={styles.modalItemSub}>Rol: {item.rol_viaje}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.gray }}>No hay otros participantes en este viaje.</Text>}
              refreshing={loadingData}
              onRefresh={() => selectedViaje ? fetchParticipantes(selectedViaje.id) : null}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 10) : 0 },
  headerTitle: { fontFamily: FONTS.black, fontSize: 26, color: COLORS.dark },
  headerSub: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.gray, marginTop: 2 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EEF2FF', padding: 14, borderRadius: RADIUS.md, marginBottom: 20, borderWidth: 1, borderColor: '#C7D2FE' },
  infoText: { flex: 1, fontFamily: FONTS.medium, fontSize: 13, color: COLORS.primaryDk },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 20, ...SHADOW.sm },
  label: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.gray, marginBottom: 8, marginTop: 6 },
  
  selectorBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 16 },
  selectorText: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.dark },
  disabledBtn: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0', opacity: 0.7 },

  textArea: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, fontFamily: FONTS.regular, fontSize: 15, color: COLORS.dark, minHeight: 120, textAlignVertical: 'top', borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 6 },
  charCount: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.lightGray, textAlign: 'right', marginBottom: 14 },
  charCountOk: { color: COLORS.secondary },
  evidenceBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: '#EEF2FF', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#C7D2FE', borderStyle: 'dashed', marginBottom: 16 },
  evidenceText: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.primary },
  previewContainer: { width: '100%', height: 180, borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  previewImage: { width: '100%', height: '100%' },
  removeEvidence: { position: 'absolute', top: 10, right: 10, backgroundColor: '#fff', borderRadius: 14, elevation: 2 },
  reportBtn: { backgroundColor: COLORS.danger, borderRadius: RADIUS.md, padding: 15, alignItems: 'center', ...SHADOW.sm },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: FONTS.black, fontSize: 20, color: COLORS.dark },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalItemTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.dark },
  modalItemSub: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.gray, marginTop: 2 }
});

