import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInUp,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  AuthButton,
  AuthField,
  AuthHeading,
  AuthLink,
  AuthNotice,
  AuthScreen,
} from '@/components/auth/AuthUI';
import { useSesion } from '@/context/sesion';
import { mensajeErrorFirebase } from '@/lib/errores-firebase';

function esErrorDeCredenciales(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    [
      'auth/invalid-credential',
      'auth/invalid-login-credentials',
      'auth/wrong-password',
      'auth/user-not-found',
    ].includes(String((error as { code?: unknown }).code))
  );
}

function animarSacudida(valor: SharedValue<number>) {
  valor.value = withSequence(
    withTiming(-9, { duration: 45 }),
    withTiming(9, { duration: 45 }),
    withTiming(-6, { duration: 45 }),
    withTiming(6, { duration: 45 }),
    withTiming(0, { duration: 45 }),
  );
}

export default function LoginScreen() {
  const { iniciarSesion, firebaseConfigurado } = useSesion();
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const sacudida = useSharedValue(0);
  const reducirMovimiento = useReducedMotion();
  const estiloSacudida = useAnimatedStyle(() => ({
    transform: [{ translateX: sacudida.value }],
  }));

  async function ingresar() {
    setError(null);
    if (!correo.trim() || !clave) {
      setError('Completa el correo electrónico y la contraseña.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    setCargando(true);
    try {
      await iniciarSesion(correo, clave);
    } catch (fallo) {
      setError(mensajeErrorFirebase(fallo));
      if (esErrorDeCredenciales(fallo) && !reducirMovimiento) {
        animarSacudida(sacudida);
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <AuthScreen>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AuthHeading
          title="Bienvenido"
          subtitle="Inicia sesión con tu correo. Tus registros de campo seguirán disponibles sin conexión."
        />
        <Animated.View
          entering={
            reducirMovimiento
              ? undefined
              : FadeInUp.delay(100).duration(360).reduceMotion(ReduceMotion.System)
          }
          style={estiloSacudida}
          className="clay-raised gap-5 rounded-[30px] bg-aqua-surface p-6 shadow-lg shadow-indigo-300/50"
        >
          {error ? <AuthNotice>{error}</AuthNotice> : null}
          {!firebaseConfigurado ? (
            <AuthNotice>
              Firebase aún no está configurado. Copia las variables requeridas de .env.example a
              .env.local.
            </AuthNotice>
          ) : null}
          <AuthField
            label="Correo electrónico"
            value={correo}
            onChangeText={setCorreo}
            placeholder="tu@correo.com"
            keyboardType="email-address"
          />
          <AuthField
            label="Contraseña"
            value={clave}
            onChangeText={setClave}
            placeholder="Tu contraseña"
            secure
          />
          <AuthButton
            label="Iniciar sesión"
            onPress={() => void ingresar()}
            loading={cargando}
            disabled={!firebaseConfigurado}
          />
          <AuthLink
            label="¿Olvidaste tu contraseña?"
            onPress={() => router.push('/recuperar-clave')}
          />
        </Animated.View>
        <View className="mt-5 items-center">
          <Text className="text-center text-aqua-text-muted">¿Todavía no tienes una cuenta?</Text>
          <AuthLink label="Crear cuenta" onPress={() => router.push('/crear-cuenta')} />
        </View>
      </KeyboardAvoidingView>
    </AuthScreen>
  );
}
