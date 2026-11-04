import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthButton, AuthField, AuthHeading, AuthLink, AuthNotice, AuthScreen } from '@/components/auth/AuthUI';
import { useSesion } from '@/context/sesion';
import { mensajeErrorFirebase } from '@/lib/errores-firebase';

export default function RecuperarClaveScreen() {
  const { enviarCorreoRecuperacion } = useSesion();
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function recuperar() {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    setCargando(true);
    try {
      await enviarCorreoRecuperacion(correo);
      setEnviado(true);
    } catch (fallo) {
      const codigo =
        typeof fallo === 'object' && fallo !== null && 'code' in fallo
          ? String((fallo as { code?: unknown }).code)
          : '';
      if (codigo === 'auth/user-not-found') {
        setEnviado(true);
      } else {
        setError(mensajeErrorFirebase(fallo));
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeading title="Recuperar contraseña" subtitle="Te enviaremos instrucciones al correo indicado." />
      <View className="clay-raised gap-5 rounded-[30px] bg-aqua-surface p-6 shadow-lg shadow-indigo-300/50">
        {error ? <AuthNotice>{error}</AuthNotice> : null}
        {enviado ? (
          <AuthNotice success>
            Si existe una cuenta asociada al correo, recibirás un enlace para restablecer la contraseña.
          </AuthNotice>
        ) : null}
        <AuthField label="Correo electrónico" value={correo} onChangeText={setCorreo} placeholder="tu@correo.com" keyboardType="email-address" />
        <AuthButton label="Enviar enlace" onPress={() => void recuperar()} loading={cargando} disabled={enviado} />
        <Text className="text-center text-sm text-slate-500">Por seguridad, la confirmación no revela si el correo está registrado.</Text>
        <AuthLink label="Volver al inicio de sesión" onPress={() => router.replace('/login')} />
      </View>
    </AuthScreen>
  );
}
