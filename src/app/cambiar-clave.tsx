import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AuthButton, AuthField, AuthHeading, AuthLink, AuthNotice, AuthScreen, PasswordStrength } from '@/components/auth/AuthUI';
import { useSesion } from '@/context/sesion';
import { mensajeErrorFirebase } from '@/lib/errores-firebase';

export default function CambiarClaveScreen() {
  const { cambiarClave } = useSesion();
  const router = useRouter();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setError(null);
    setExito(false);
    if (!actual || nueva.length < 8) {
      setError('Ingresa tu contraseña actual y una nueva de al menos ocho caracteres.');
      return;
    }
    if (nueva !== confirmacion) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setGuardando(true);
    try {
      await cambiarClave(actual, nueva);
      setExito(true);
      setActual('');
      setNueva('');
      setConfirmacion('');
    } catch (fallo) {
      setError(mensajeErrorFirebase(fallo));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeading title="Cambiar contraseña" subtitle="Confirma tu contraseña actual antes de guardar una nueva." />
      <View className="clay-raised gap-4 rounded-[30px] bg-aqua-surface p-6 shadow-lg shadow-indigo-300/50">
        {error ? <AuthNotice>{error}</AuthNotice> : null}
        {exito ? <AuthNotice success>La contraseña se cambió correctamente.</AuthNotice> : null}
        <AuthField label="Contraseña actual" value={actual} onChangeText={setActual} placeholder="Contraseña actual" secure />
        <AuthField label="Contraseña nueva" value={nueva} onChangeText={setNueva} placeholder="Mínimo ocho caracteres" secure />
        <PasswordStrength password={nueva} />
        <AuthField label="Confirmar contraseña nueva" value={confirmacion} onChangeText={setConfirmacion} placeholder="Repite la contraseña nueva" secure />
        <AuthButton label="Cambiar contraseña" onPress={() => void guardar()} loading={guardando} />
        <AuthLink label="Volver" onPress={() => router.back()} />
      </View>
    </AuthScreen>
  );
}
