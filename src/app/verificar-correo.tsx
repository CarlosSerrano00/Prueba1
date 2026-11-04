import { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthButton, AuthHeading, AuthLink, AuthNotice, AuthScreen } from '@/components/auth/AuthUI';
import { useSesion } from '@/context/sesion';
import { mensajeErrorFirebase } from '@/lib/errores-firebase';

export default function VerificarCorreoScreen() {
  const { usuario, comprobarVerificacion, reenviarVerificacion, cerrarSesion } = useSesion();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [comprobando, setComprobando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  useEffect(() => {
    const listener = AppState.addEventListener('change', (estado) => {
      if (estado === 'active' && usuario && !usuario.emailVerified) {
        void comprobarVerificacion().catch((fallo: unknown) => setError(mensajeErrorFirebase(fallo)));
      }
    });
    return () => listener.remove();
  }, [comprobarVerificacion, usuario]);

  async function comprobar() {
    setError(null);
    setMensaje(null);
    setComprobando(true);
    try {
      const verificado = await comprobarVerificacion();
      if (verificado) {
        setMensaje('Correo verificado. Preparando el acceso seguro.');
        router.replace('/codigo-tecnico');
      } else {
        setMensaje('Aún no aparece la verificación. Abre el enlace del correo y vuelve a comprobar.');
      }
    } catch (fallo) {
      setError(mensajeErrorFirebase(fallo));
    } finally {
      setComprobando(false);
    }
  }

  async function reenviar() {
    setError(null);
    setMensaje(null);
    setReenviando(true);
    try {
      await reenviarVerificacion();
      setMensaje('Enviamos un nuevo enlace de verificación.');
    } catch (fallo) {
      setError(mensajeErrorFirebase(fallo));
    } finally {
      setReenviando(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeading title="Verifica tu correo" subtitle="Confirma tu dirección antes de acceder a las herramientas de campo." />
      <View className="clay-raised gap-5 rounded-[30px] bg-aqua-surface p-6 shadow-lg shadow-indigo-300/50">
        <Text className="text-base leading-6 text-aqua-text">
          Enviamos un enlace a {usuario?.email ?? 'tu correo'}. Después de abrirlo, vuelve aquí para comprobar el estado.
        </Text>
        {error ? <AuthNotice>{error}</AuthNotice> : null}
        {mensaje ? <AuthNotice success>{mensaje}</AuthNotice> : null}
        <AuthButton label="Ya verifiqué mi correo" onPress={() => void comprobar()} loading={comprobando} />
        <AuthButton label="Reenviar correo de verificación" onPress={() => void reenviar()} loading={reenviando} secondary />
        <AuthLink label="Cerrar sesión" onPress={() => void cerrarSesion().then(() => router.replace('/login'))} />
      </View>
    </AuthScreen>
  );
}
