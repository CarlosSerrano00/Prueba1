import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppProvider, useApp } from '@/context/AppProvider';
import { SesionProvider, useSesion } from '@/context/sesion';
import '../global.css';

SplashScreen.preventAutoHideAsync();

function NavegacionRaiz() {
  const { cargando: cargandoApp, errorInicial, sesion, borrador } = useApp();
  const { cargando: cargandoAuth, usuario, errorAutenticacion } = useSesion();
  const cargando = cargandoApp || cargandoAuth;
  const autenticado = Boolean(usuario);
  const verificado = Boolean(usuario?.emailVerified);
  const tecnicoAsociado = Boolean(sesion && sesion.firebaseUid === usuario?.uid);
  const router = useRouter();
  const segments = useSegments();
  const borradorOfrecido = useRef<string | null>(null);
  const enRegistro = segments[0] === 'registro';
  const enBorrador = segments[0] === 'borrador';

  useEffect(() => {
    if (cargando) return;
    void SplashScreen.hideAsync();
  }, [cargando]);

  useEffect(() => {
    borradorOfrecido.current = null;
  }, [sesion?.codigoTecnico]);

  useEffect(() => {
    if (
      !tecnicoAsociado ||
      !borrador ||
      borradorOfrecido.current === borrador.localId ||
      enRegistro ||
      enBorrador
    ) {
      return;
    }
    borradorOfrecido.current = borrador.localId;
    router.push('/borrador');
  }, [borrador, enBorrador, enRegistro, router, tecnicoAsociado]);

  if (errorInicial) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-aqua-background px-6">
        <View className="gap-4">
          <Text className="text-2xl font-bold text-aqua-text">No se pudo abrir el almacenamiento local</Text>
          <Text className="text-aqua-text-muted">{errorInicial}</Text>
          <Text className="text-sm text-slate-500">
            Cierra la aplicación y vuelve a abrirla. Si el problema continúa, borra los datos de
            AquaRuta desde los ajustes del teléfono.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorAutenticacion) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-aqua-background px-6">
        <Text className="text-lg text-rose-800">
          No se pudo restaurar la sesión de Firebase: {errorAutenticacion}
        </Text>
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
          contentStyle: { backgroundColor: '#f0f9ff' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Protected guard={!autenticado}>
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
          <Stack.Screen name="crear-cuenta" />
          <Stack.Screen name="recuperar-clave" />
        </Stack.Protected>
        <Stack.Protected guard={autenticado && !verificado}>
          <Stack.Screen name="verificar-correo" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={autenticado && verificado && !tecnicoAsociado}>
          <Stack.Screen name="codigo-tecnico" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={autenticado && verificado && tecnicoAsociado}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="borrador" options={{ animation: 'fade' }} />
          <Stack.Screen name="medidor/[codigo]" />
          <Stack.Screen name="medidor/editar/[codigo]" />
          <Stack.Screen name="registro/[codigo]" />
          <Stack.Screen name="lectura/[localId]" />
          <Stack.Screen name="editar-perfil" />
          <Stack.Screen name="cambiar-clave" />
        </Stack.Protected>
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SesionProvider>
      <AppProvider>
        <NavegacionRaiz />
      </AppProvider>
    </SesionProvider>
  );
}
