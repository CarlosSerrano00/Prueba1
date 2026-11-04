import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AuthButton,
  AuthField,
  AuthHeading,
  AuthLink,
  AuthNotice,
  AuthScreen,
  PasswordStrength,
} from '@/components/auth/AuthUI';
import { useSesion } from '@/context/sesion';
import { mensajeErrorFirebase } from '@/lib/errores-firebase';

export default function CrearCuentaScreen() {
  const { registrarse, firebaseConfigurado } = useSesion();
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function crearCuenta() {
    setError(null);
    if (nombre.trim().length < 3) {
      setError('El nombre debe tener al menos tres caracteres.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (clave.length < 8) {
      setError('La contraseña debe tener al menos ocho caracteres.');
      return;
    }
    if (clave !== confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setCargando(true);
    try {
      await registrarse(nombre, correo, clave);
    } catch (fallo) {
      setError(mensajeErrorFirebase(fallo));
    } finally {
      setCargando(false);
    }
  }

  return (
    <AuthScreen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AuthHeading
          title="Crear cuenta"
          subtitle="Registra tu correo y confírmalo para proteger el acceso a AquaRuta."
        />
        <View className="clay-raised gap-4 rounded-[30px] bg-aqua-surface p-6 shadow-lg shadow-indigo-300/50">
          {error ? <AuthNotice>{error}</AuthNotice> : null}
          <AuthField label="Nombre completo" value={nombre} onChangeText={setNombre} placeholder="Tu nombre" autoCapitalize="words" />
          <AuthField label="Correo electrónico" value={correo} onChangeText={setCorreo} placeholder="tu@correo.com" keyboardType="email-address" />
          <AuthField label="Contraseña" value={clave} onChangeText={setClave} placeholder="Mínimo ocho caracteres" secure />
          <PasswordStrength password={clave} />
          <AuthField label="Confirmar contraseña" value={confirmacion} onChangeText={setConfirmacion} placeholder="Repite tu contraseña" secure />
          {!firebaseConfigurado ? (
            <Text className="text-sm text-amber-800">Completa primero la configuración Firebase de .env.local.</Text>
          ) : null}
          <AuthButton label="Crear cuenta y enviar verificación" onPress={() => void crearCuenta()} loading={cargando} disabled={!firebaseConfigurado} />
          <AuthLink label="Volver al inicio de sesión" onPress={() => router.replace('/login')} />
        </View>
      </KeyboardAvoidingView>
    </AuthScreen>
  );
}
