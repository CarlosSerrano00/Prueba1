import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ReduceMotion, useReducedMotion } from 'react-native-reanimated';

import {
  Alerta,
  AppScreen,
  Boton,
  EmptyState,
  LecturaCard,
  SectionTitle,
  StatCard,
  Texto,
} from '@/components/ui';
import { colors } from '@/constants/ui';
import { useApp } from '@/context/AppProvider';
import { useSesion } from '@/context/sesion';
import { listarActividadReciente } from '@/services/lecturasService';
import type { Lectura } from '@/types/models';
import { formatearFechaJornada, iniciales, saludoSegunHora } from '@/utils/format';
import { nombrePeriodo, obtenerPeriodo } from '@/utils/periodo';

export default function InicioScreen() {
  const { nombre } = useSesion();
  const {
    sesion,
    borrador,
    pendientes,
    revision,
    enviadas,
    totalLecturas,
    sincronizarAhora,
  } = useApp();
  const router = useRouter();
  const reducirMovimiento = useReducedMotion();
  const [recientes, setRecientes] = useState<Lectura[]>([]);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!sesion) return;
    const datos = await listarActividadReciente(sesion.codigoTecnico, 3);
    setRecientes(datos);
  }, [sesion]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    // El resumen global cambia al terminar una sincronización; se usa como
    // señal para volver a leer SQLite aunque el callback no lo consuma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cargar, enviadas, pendientes, revision, totalLecturas]),
  );

  async function refrescar() {
    setRefrescando(true);
    try {
      await sincronizarAhora();
      await cargar();
    } finally {
      setRefrescando(false);
    }
  }

  if (!sesion) return null;

  return (
    <AppScreen refrescando={refrescando} onRefresh={() => void refrescar()}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-indigo-950 shadow-sm">
            <Ionicons name="water" size={19} color={colors.white} />
          </View>
          <View>
            <Texto variante="subtitulo" color={colors.brand}>
              AquaRuta
            </Texto>
            <Texto variante="micro" color={colors.textMuted}>
              Jornada de campo
            </Texto>
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/perfil')}
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil del técnico"
          className="h-[46px] w-[46px] items-center justify-center rounded-full border border-white bg-slate-50 shadow-sm"
          style={({ pressed }) => pressed ? { backgroundColor: colors.accentSoft } : undefined}
        >
          <Texto variante="caption" peso="bold" color={colors.accentDark}>
            {iniciales(nombre)}
          </Texto>
        </Pressable>
      </View>

      <Animated.View
        entering={reducirMovimiento ? undefined : FadeInDown.duration(320).reduceMotion(ReduceMotion.System)}
        className="relative gap-1 overflow-hidden rounded-[30px] border border-white/40 bg-indigo-950 p-5 shadow-lg"
      >
        <View className="absolute -right-14 -top-16 h-[190px] w-[190px] rounded-full border border-white/15" />
        <View className="absolute -bottom-12 right-3 h-[120px] w-[120px] rounded-full bg-teal-500/35" />
        <Texto variante="etiqueta" color={colors.textOnBrandMuted}>
          {formatearFechaJornada()} · {nombrePeriodo(obtenerPeriodo())}
        </Texto>
        <Texto variante="titulo" color={colors.white} className="text-[30px] leading-9">
          {saludoSegunHora()}, {nombre.split(' ')[0]}
        </Texto>
        <View className="mt-2 flex-row items-center gap-2">
          <View className="flex-row items-center gap-1">
            <Ionicons name="location-outline" size={15} color={colors.textOnBrandMuted} />
            <Texto variante="caption" color={colors.textOnBrandMuted}>
              Zona {sesion.zona}
            </Texto>
          </View>
          <View className="h-3 w-px bg-white/25" />
          <View className="flex-row items-center gap-1">
            <Ionicons name="id-card-outline" size={15} color={colors.textOnBrandMuted} />
            <Texto variante="caption" color={colors.textOnBrandMuted}>
              {sesion.codigoTecnico}
            </Texto>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        entering={reducirMovimiento ? undefined : FadeInUp.delay(100).duration(320).reduceMotion(ReduceMotion.System)}
      >
        <Pressable
          onPress={() => router.push('/buscar')}
          accessibilityRole="button"
          accessibilityLabel="Registrar una lectura de medidor"
          className="flex-row items-center gap-3 rounded-[30px] border border-white/45 bg-teal-500 p-4 shadow-lg"
          style={({ pressed }) => pressed ? { backgroundColor: colors.accentDark, transform: [{ scale: 0.985 }] } : undefined}
        >
          <View className="h-14 w-14 items-center justify-center rounded-xl border border-white bg-white shadow-sm">
            <Ionicons name="speedometer-outline" size={28} color={colors.accentDark} />
          </View>
          <View className="flex-1 gap-0.5">
            <Texto variante="etiqueta" color={colors.accentSoft}>
              Captura en campo
            </Texto>
            <Texto variante="subtitulo" color={colors.white}>
              Registrar una lectura
            </Texto>
            <Texto variante="caption" color={colors.textOnBrandMuted}>
              Consulta el medidor, revisa el consumo y guarda la foto.
            </Texto>
          </View>
          <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-white/15">
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </View>
        </Pressable>
      </Animated.View>

      <Animated.View
        entering={reducirMovimiento ? undefined : FadeInUp.delay(220).duration(320).reduceMotion(ReduceMotion.System)}
        className="flex-row gap-2"
      >
        <StatCard
          valor={pendientes}
          etiqueta="Por enviar"
          icono="cloud-upload-outline"
          color={colors.warning}
          fondo={colors.warningSoft}
        />
        <StatCard
          valor={revision}
          etiqueta="Por revisar"
          icono="alert-circle-outline"
          color={colors.danger}
          fondo={colors.dangerSoft}
        />
        <StatCard
          valor={enviadas}
          etiqueta="Enviadas"
          icono="checkmark-circle-outline"
          color={colors.success}
          fondo={colors.successSoft}
        />
      </Animated.View>

      {borrador ? (
        <Alerta
          tono="borrador"
          titulo="Tienes una captura sin terminar"
          icono="document-text-outline"
          accion={
            <View className="flex-row flex-wrap items-center gap-3">
              <Boton
                titulo="Continuar captura"
                onPress={() => router.push('/borrador')}
                variante="acento"
                icono="arrow-forward"
                anchoCompleto={false}
              />
              <Texto variante="micro" color={colors.draft} className="flex-1">
                Medidor {borrador.codigoMedidor} · paso {borrador.paso} de 3
              </Texto>
            </View>
          }
        >
          Puedes retomarla donde la dejaste o descartarla desde el aviso de recuperación.
        </Alerta>
      ) : null}

      <View className="gap-3">
        <SectionTitle
          titulo="Últimos registros"
          descripcion="Los más recientes de tu jornada."
          accion={
            <Pressable
              onPress={() => router.push('/lecturas')}
              accessibilityRole="button"
              accessibilityLabel="Ver todas las lecturas"
              hitSlop={8}
            >
              <Texto variante="caption" peso="bold" color={colors.accentDark}>
                Ver todas
              </Texto>
            </Pressable>
          }
        />

        {recientes.length === 0 ? (
          <EmptyState
            icono="document-text-outline"
            titulo="Aún no hay lecturas"
            mensaje="Cuando registres la primera lectura aparecerá aquí con su estado de envío."
            compacto
            accion={
              <Boton
                titulo="Buscar un medidor"
                onPress={() => router.push('/buscar')}
                variante="secundario"
                icono="search-outline"
              />
            }
          />
        ) : (
          <View className="gap-2">
            {recientes.map((lectura) => (
              <LecturaCard
                key={lectura.localId}
                lectura={lectura}
                onPress={() => router.push(`/lectura/${lectura.localId}`)}
              />
            ))}
          </View>
        )}
      </View>

      <Alerta tono="info" titulo="Trabaja sin preocuparte por la señal">
        Las lecturas se guardan en el teléfono y se envían solas al recuperar la conexión. El
        indicador superior te dice cuántas quedan.
      </Alerta>
    </AppScreen>
  );
}
