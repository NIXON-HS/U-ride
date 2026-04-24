import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme/design';

interface Props { value: Date; onChange: (date: Date) => void; }

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export default function DateTimePickerCustom({ value, onChange }: Props) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<'date' | 'time'>('date');
  const [year,   setYear]   = useState(value.getFullYear());
  const [month,  setMonth]  = useState(value.getMonth());
  const [day,    setDay]    = useState(value.getDate());
  const [hour,   setHour]   = useState(value.getHours());
  const [minute, setMinute] = useState(value.getMinutes());

  const now = new Date();
  const years   = range(now.getFullYear(), now.getFullYear() + 2);
  const days    = range(1, new Date(year, month + 1, 0).getDate());
  const hours   = range(0, 23);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const confirmDate = () => setStep('time');
  const confirmTime = () => {
    const d = new Date(year, month, day, hour, minute);
    onChange(d);
    setVisible(false);
    setStep('date');
  };

  const fechaLegible = value.toLocaleDateString('es-EC', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
  const horaLegible  = `${String(value.getHours()).padStart(2,'0')}:${String(value.getMinutes()).padStart(2,'0')}`;

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => { setStep('date'); setVisible(true); }}>
        <View style={styles.triggerLeft}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.triggerDate}>{fechaLegible}</Text>
            <Text style={styles.triggerTime}>🕐 {horaLegible}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.lightGray} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />

            {step === 'date' ? (
              <>
                <View style={styles.sheetHeader}>
                  <Ionicons name="calendar" size={22} color={COLORS.primary} />
                  <Text style={styles.sheetTitle}>Selecciona la Fecha</Text>
                </View>
                <View style={styles.columns}>
                  <Column label="Día" items={days.map(String)} selected={String(day)} onSelect={v => setDay(parseInt(v))} />
                  <Column label="Mes" items={MESES} selected={MESES[month]} onSelect={v => setMonth(MESES.indexOf(v))} wide />
                  <Column label="Año" items={years.map(String)} selected={String(year)} onSelect={v => setYear(parseInt(v))} />
                </View>
                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setVisible(false)}>
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={confirmDate}>
                    <Text style={styles.confirmText}>Elegir Hora</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.sheetHeader}>
                  <Ionicons name="time" size={22} color={COLORS.primary} />
                  <Text style={styles.sheetTitle}>Selecciona la Hora</Text>
                </View>
                <Text style={styles.datePreview}>{day} {MESES[month]} {year}</Text>
                <View style={styles.columns}>
                  <Column label="Hora" items={hours.map(h => String(h).padStart(2,'0'))} selected={String(hour).padStart(2,'0')} onSelect={v => setHour(parseInt(v))} />
                  <Text style={styles.colon}>:</Text>
                  <Column label="Min" items={minutes.map(m => String(m).padStart(2,'0'))} selected={String(minute).padStart(2,'0')} onSelect={v => setMinute(parseInt(v))} />
                </View>
                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('date')}>
                    <Ionicons name="arrow-back" size={16} color={COLORS.gray} />
                    <Text style={styles.cancelText}>Fecha</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={confirmTime}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.confirmText}>Confirmar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

function Column({ label, items, selected, onSelect, wide }: {
  label: string; items: string[]; selected: string;
  onSelect: (v: string) => void; wide?: boolean;
}) {
  return (
    <View style={[styles.col, wide && styles.colWide]}>
      <Text style={styles.colLabel}>{label}</Text>
      <ScrollView style={styles.colScroll} showsVerticalScrollIndicator={false}>
        {items.map(item => (
          <TouchableOpacity key={item} style={[styles.colItem, selected === item && styles.colItemActive]} onPress={() => onSelect(item)}>
            <Text style={[styles.colItemText, selected === item && styles.colItemTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#EEF2FF', padding: 14, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: '#C7D2FE', marginBottom: 4 },
  triggerLeft: { flexDirection: 'row', alignItems: 'center' },
  triggerDate: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.primaryDk },
  triggerTime: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.primary, marginTop: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  sheetTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.dark },
  datePreview: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.gray, marginBottom: 12 },
  columns: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 190, marginVertical: 10 },
  col: { width: 68, marginHorizontal: 4 },
  colWide: { width: 112 },
  colLabel: { fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.lightGray, textAlign: 'center', marginBottom: 6 },
  colScroll: { maxHeight: 178 },
  colItem: { paddingVertical: 10, borderRadius: RADIUS.sm, marginBottom: 2, alignItems: 'center' },
  colItemActive: { backgroundColor: COLORS.primary },
  colItemText: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.gray },
  colItemTextActive: { fontFamily: FONTS.bold, color: '#fff' },
  colon: { fontFamily: FONTS.black, fontSize: 28, color: COLORS.dark, marginHorizontal: 4 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  cancelText: { fontFamily: FONTS.semiBold, color: COLORS.gray },
  confirmBtn: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, ...SHADOW.md },
  confirmText: { fontFamily: FONTS.bold, color: '#fff' },
});
