import { useRouter, useSegments, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppProvider, useApp } from '@/context/AppProvider';
import { colors, spacing } from '@/constants/ui';
import { Texto } from '@/components/ui';

SplashScreen.preventAutoHideAsync();

function NavegacionRaiz() {
  const { cargando, errorInicial, sesion, borrador } = useApp();
  const router = useRouter();
  const segments = useSegments();
  const borradorOfrecido = useRef<string | null>(null);

  const enLogin = segments[0] === 'login';
  const enBorrador = segments[0] === 'borrador';
  const enRegistro = segments[0] === 'registro';

  useEffect(() => {
    if (cargando) return;
    void SplashScreen.hideAsync();
  }, [cargando]);

  useEffect(() => {
    borradorOfrecido.current = null;
  }, [sesion?.codigoTecnico]);

  useEffect(() => {
    if (cargando) return;

    if (!sesion) {
      borradorOfrecido.current = null;
      if (!enLogin) router.replace('/login');
      return;
    }

    if (enLogin) {
      router.replace('/');
      return;
    }

    if (
      borrador &&
      borradorOfrecido.current !== borrador.localId &&
      !enRegistro &&
      !enBorrador
    ) {
      borradorOfrecido.current = borrador.localId;
      router.push('/borrador');
    }
  }, [borrador, cargando, enBorrador, enLogin, enRegistro, router, sesion]);

  if (errorInicial) {
    return (
      <SafeAreaView style={estilos.errorPantalla}>
        <View style={estilos.errorContenido}>
          <Texto variante="titulo">No se pudo abrir el almacenamiento local</Texto>
          <Texto variante="cuerpo" color={colors.textMuted}>
            {errorInicial}
          </Texto>
          <Texto variante="caption" color={colors.textMuted}>
            Cierra la aplicación y vuelve a abrirla. Si el problema continúa, borra los datos de
            AquaRuta desde los ajustes del teléfono.
          </Texto>
        </View>
      </SafeAreaView>
    );
  }

  if (cargando) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="borrador" options={{ animation: 'fade' }} />
        <Stack.Screen name="medidor/[codigo]" />
        <Stack.Screen name="medidor/editar/[codigo]" />
        <Stack.Screen name="registro/[codigo]" />
        <Stack.Screen name="lectura/[localId]" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <NavegacionRaiz />
    </AppProvider>
  );
}

const estilos = StyleSheet.create({
  errorPantalla: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  errorContenido: {
    padding: spacing.xxl,
    gap: spacing.md,
  },
});
