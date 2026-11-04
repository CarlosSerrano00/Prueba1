import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion, useReducedMotion } from 'react-native-reanimated';

import { AuthButton, AuthField, AuthHeading, AuthLink, AuthNotice, AuthScreen } from '@/components/auth/AuthUI';
import { useSesion } from '@/context/sesion';
import { mensajeErrorFirebase } from '@/lib/errores-firebase';

export default function EditarPerfilScreen() {
  const { usuario, actualizarNombre } = useSesion();
  const router = useRouter();
  const [nombre, setNombre] = useState(usuario?.displayName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const reducirMovimiento = useReducedMotion();

  async function guardar() {
    setError(null);
    setExito(false);
    if (nombre.trim().length < 3) {
      setError('El nombre debe tener al menos tres caracteres.');
      return;
    }
    setGuardando(true);
    try {
      await actualizarNombre(nombre);
      setExito(true);
    } catch (fallo) {
      setError(mensajeErrorFirebase(fallo));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <AuthScreen>
      <Animated.View entering={reducirMovimiento ? undefined : FadeInDown.duration(320).reduceMotion(ReduceMotion.System)}>
        <AuthHeading title="Editar perfil" subtitle="Actualiza el nombre que se muestra en tu aplicación." />
        <View className="clay-raised gap-5 rounded-[30px] bg-aqua-surface p-6 shadow-lg shadow-indigo-300/50">
          <Text className="text-sm text-aqua-text-muted">{usuario?.email}</Text>
          {error ? <AuthNotice>{error}</AuthNotice> : null}
          {exito ? <AuthNotice success>El nombre de perfil se actualizó correctamente.</AuthNotice> : null}
          <AuthField label="Nombre completo" value={nombre} onChangeText={setNombre} placeholder="Tu nombre" autoCapitalize="words" />
          <AuthButton label="Guardar cambios" onPress={() => void guardar()} loading={guardando} />
          <AuthLink label="Volver" onPress={() => router.back()} />
        </View>
      </Animated.View>
    </AuthScreen>
  );
}
