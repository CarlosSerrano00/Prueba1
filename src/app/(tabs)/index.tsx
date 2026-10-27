import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
import { colors, clayBorder, clayShadowSoft, clayShadowStrong, radius, spacing } from '@/constants/ui';
import { useApp } from '@/context/AppProvider';
import { listarActividadReciente } from '@/services/lecturasService';
import type { Lectura } from '@/types/models';
import { formatearFechaJornada, iniciales, saludoSegunHora } from '@/utils/format';
import { nombrePeriodo, obtenerPeriodo } from '@/utils/periodo';

export default function InicioScreen() {
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
      <View style={estilos.barraMarca}>
        <View style={estilos.marca}>
          <View style={estilos.logo}>
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
          style={({ pressed }) => [estilos.avatar, pressed && estilos.avatarPresionado]}
        >
          <Texto variante="caption" peso="bold" color={colors.accentDark}>
            {iniciales(sesion.nombre)}
          </Texto>
        </Pressable>
      </View>

      <View style={estilos.hero}>
        <View style={estilos.heroCirculo} />
        <View style={estilos.heroCirculo2} />
        <Texto variante="etiqueta" color={colors.textOnBrandMuted}>
          {formatearFechaJornada()} · {nombrePeriodo(obtenerPeriodo())}
        </Texto>
        <Texto variante="titulo" color={colors.white} style={estilos.heroTitulo}>
          {saludoSegunHora()}, {sesion.nombre.split(' ')[0]}
        </Texto>
        <View style={estilos.heroFila}>
          <View style={estilos.heroDato}>
            <Ionicons name="location-outline" size={15} color={colors.textOnBrandMuted} />
            <Texto variante="caption" color={colors.textOnBrandMuted}>
              Zona {sesion.zona}
            </Texto>
          </View>
          <View style={estilos.heroSeparador} />
          <View style={estilos.heroDato}>
            <Ionicons name="id-card-outline" size={15} color={colors.textOnBrandMuted} />
            <Texto variante="caption" color={colors.textOnBrandMuted}>
              {sesion.codigoTecnico}
            </Texto>
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/buscar')}
        accessibilityRole="button"
        accessibilityLabel="Registrar una lectura de medidor"
        style={({ pressed }) => [estilos.accionPrincipal, pressed && estilos.accionPresionada]}
      >
        <View style={estilos.accionIcono}>
          <Ionicons name="speedometer-outline" size={28} color={colors.accentDark} />
        </View>
        <View style={estilos.accionTextos}>
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
        <View style={estilos.accionFlecha}>
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
        </View>
      </Pressable>

      <View style={estilos.filaStats}>
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
      </View>

      {borrador ? (
        <Alerta
          tono="borrador"
          titulo="Tienes una captura sin terminar"
          icono="document-text-outline"
          accion={
            <View style={estilos.filaAcciones}>
              <Boton
                titulo="Continuar captura"
                onPress={() => router.push('/borrador')}
                variante="acento"
                icono="arrow-forward"
                anchoCompleto={false}
              />
              <Texto variante="micro" color={colors.draft} style={estilos.textoBorrador}>
                Medidor {borrador.codigoMedidor} · paso {borrador.paso} de 3
              </Texto>
            </View>
          }
        >
          Puedes retomarla donde la dejaste o descartarla desde el aviso de recuperación.
        </Alerta>
      ) : null}

      <View style={estilos.seccion}>
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
          <View style={estilos.lista}>
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

const estilos = StyleSheet.create({
  barraMarca: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.brand,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    ...clayShadowSoft,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    ...clayBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...clayShadowSoft,
  },
  avatarPresionado: {
    backgroundColor: colors.accentSoft,
  },
  hero: {
    backgroundColor: colors.brand,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.xs,
    overflow: 'hidden',
    ...clayBorder,
    borderColor: 'rgba(255,255,255,0.40)',
    borderTopColor: 'rgba(255,255,255,0.70)',
    borderBottomColor: 'rgba(40,43,120,0.40)',
    ...clayShadowStrong,
  },
  heroCirculo: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.14)',
    right: -55,
    top: -65,
  },
  heroCirculo2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(14,165,164,0.36)',
    right: 12,
    bottom: -50,
  },
  heroTitulo: {
    fontSize: 30,
    lineHeight: 36,
  },
  heroFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  heroDato: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroSeparador: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  accionPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...clayBorder,
    borderColor: 'rgba(255,255,255,0.45)',
    borderTopColor: 'rgba(255,255,255,0.75)',
    borderBottomColor: 'rgba(13,115,113,0.45)',
    ...clayShadowStrong,
  },
  accionPresionada: {
    backgroundColor: colors.accentDark,
    transform: [{ scale: 0.985 }],
  },
  accionIcono: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...clayShadowSoft,
  },
  accionTextos: {
    flex: 1,
    gap: 2,
  },
  accionFlecha: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filaAcciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  textoBorrador: {
    flex: 1,
  },
  seccion: {
    gap: spacing.md,
  },
  lista: {
    gap: spacing.sm,
  },
});
