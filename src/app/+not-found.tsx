import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppScreen, Boton, Texto } from '@/components/ui';
import { colors } from '@/constants/ui';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <AppScreen>
      <View className="flex-1 items-center justify-center gap-3 py-12">
        <Texto variante="display" color={colors.accent}>
          404
        </Texto>
        <Texto variante="titulo" centrado>
          Esta pantalla no existe
        </Texto>
        <Texto variante="cuerpo" color={colors.textMuted} centrado>
          El enlace que abriste no corresponde a una sección de AquaRuta. Vuelve al inicio para
          continuar tu jornada.
        </Texto>
        <Boton
          titulo="Volver al inicio"
          onPress={() => router.replace('/')}
          icono="home-outline"
        />
      </View>
    </AppScreen>
  );
}
