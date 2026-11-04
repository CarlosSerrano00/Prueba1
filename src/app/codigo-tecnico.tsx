import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthButton, AuthField, AuthHeading, AuthLink, AuthNotice, AuthScreen } from '@/components/auth/AuthUI';
import { useApp } from '@/context/AppProvider';
import { useSesion } from '@/context/sesion';

export default function CodigoTecnicoScreen() {
  const { usuario, cerrarSesion } = useSesion();
  const { asociarTecnico } = useApp();
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function continuar() {
    setError(null);
    if (!codigo.trim()) {
      setError('Ingresa tu código de técnico.');
      return;
    }
    setCargando(true);
    try {
      await asociarTecnico(codigo);
      router.replace('/');
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo asociar el código.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeading title="Identifica tu jornada" subtitle="La cuenta Firebase y el código de técnico son datos separados." />
      <View className="clay-raised gap-5 rounded-[30px] bg-aqua-surface p-6 shadow-lg shadow-indigo-300/50">
        <Text className="text-sm text-aqua-text-muted">Cuenta verificada: {usuario?.email}</Text>
        {error ? <AuthNotice>{error}</AuthNotice> : null}
        <AuthField label="Código de técnico" value={codigo} onChangeText={(valor) => setCodigo(valor.toUpperCase())} placeholder="TEC-001" autoCapitalize="characters" />
        <Text className="text-sm leading-5 text-amber-800">
          En esta versión de demostración, el código selecciona el perfil local de trabajo. No verifica la identidad laboral; no uses esta regla como control de acceso de producción.
        </Text>
        <AuthButton label="Continuar a AquaRuta" onPress={() => void continuar()} loading={cargando} />
        <AuthLink label="Cerrar sesión" onPress={() => void cerrarSesion().then(() => router.replace('/login'))} />
      </View>
    </AuthScreen>
  );
}
