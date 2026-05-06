import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme/design';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState('request'); // 'request', 'reset', 'success'
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 📧 PASO 1: Solicitar Reset
  const handleRequestReset = async () => {
    if (!email.trim()) {
      Alert.alert('❌ Error', 'Por favor ingresa tu email');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      Alert.alert('✅ Éxito', res.data.message);
      setStep('reset');
      if (res.data.resetToken) {
        setResetToken(res.data.resetToken);
      }
    } catch (err: any) {
      Alert.alert(
        '❌ Error',
        err.response?.data?.error || 'Error al solicitar recuperación'
      );
    } finally {
      setLoading(false);
    }
  };

  // 🔐 PASO 2: Cambiar Contraseña
  const handleResetPassword = async () => {
    if (!resetToken.trim()) {
      Alert.alert('❌ Error', 'Por favor ingresa el código de recuperación');
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert('❌ Error', 'Por favor ingresa una nueva contraseña');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('❌ Error', 'Las contraseñas no coinciden');
      return;
    }

    // Validar fuerza de contraseña
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      Alert.alert(
        '❌ Contraseña débil',
        'Mínimo 8 caracteres, 1 mayúscula y 1 número'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token: resetToken,
        newPassword,
        confirmPassword,
      });
      Alert.alert('✅ Éxito', res.data.message);
      setStep('success');
    } catch (err: any) {
      Alert.alert(
        '❌ Error',
        err.response?.data?.error || 'Error al cambiar contraseña'
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ PASO 1: Solicitar Email
  if (step === 'request') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Ionicons
            name="mail"
            size={60}
            color={COLORS.primary}
            style={{ textAlign: 'center', marginBottom: 20 }}
          />

          <Text style={styles.title}>Recuperar Contraseña</Text>
          <Text style={styles.subtitle}>
            Ingresa tu email para recibir un enlace de recuperación
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="estudiante@uta.edu.ec"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                editable={!loading}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRequestReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="white" />
                <Text style={styles.buttonText}>Enviar Enlace</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // 🔐 PASO 2: Ingresar Token y Nueva Contraseña
  if (step === 'reset') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep('request')}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Ionicons
            name="lock-closed"
            size={60}
            color={COLORS.primary}
            style={{ textAlign: 'center', marginBottom: 20 }}
          />

          <Text style={styles.title}>Nueva Contraseña</Text>
          <Text style={styles.subtitle}>
            Ingresa el código que recibiste por email
          </Text>

          {/* Código de Recuperación */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Código de Recuperación</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="key" size={20} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="Pega el código aquí"
                value={resetToken}
                onChangeText={setResetToken}
                editable={!loading}
              />
            </View>
          </View>

          {/* Nueva Contraseña */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nueva Contraseña</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="Min 8 caracteres, 1 mayúscula, 1 número"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirmar Contraseña */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirmar Contraseña</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="Confirma tu contraseña"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="white" />
                <Text style={styles.buttonText}>Cambiar Contraseña</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ✅ PASO 3: Éxito
  if (step === 'success') {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={80} color="#10b981" />
          <Text style={styles.successTitle}>¡Éxito!</Text>
          <Text style={styles.successMessage}>
            Tu contraseña ha sido actualizada correctamente
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.buttonText}>← Ir a Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 20,
  },

  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 20,
    marginBottom: 20,
    paddingVertical: 10,
  },

  backText: {
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },

  card: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 25,
    borderRadius: RADIUS.lg,
    ...SHADOW.md,
  },

  successCard: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    width: '85%',
    ...SHADOW.md,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 20,
  },

  formGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },

  button: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginTop: 20,
    gap: 8,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginVertical: 15,
  },

  successMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
});
