import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import {
  Alerta,
  AppHeader,
  AppScreen,
  Badge,
  Boton,
  EmptyState,
  LecturaCard,
  SectionTitle,
  Texto,
} from '@/components/ui';
import { clayInset, clayShadowSoft, colors, radius, spacing } from '@/constants/ui';
import { useApp } from '@/context/AppProvider';
import { listarLecturasDelTecnico } from '@/services/lecturasService';
import type { FiltroLecturas, Lectura } from '@/types/models';

interface OpcionFiltro {
  valor: FiltroLecturas;
  etiqueta: string;
  icono: keyof typeof Ionicons.glyphMap;
}

export default function LecturasScreen() {
  const { sesion, pendientes, revision, enviadas, totalLecturas, sincronizarAhora } = useApp();
  const router = useRouter();
  const [filtro, setFiltro] = useState<FiltroLecturas>('todas');
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!sesion) return;
    const datos = await listarLecturasDelTecnico(sesion.codigoTecnico, filtro);
    setLecturas(datos);
  }, [filtro, sesion]);

  useFocusEffect(
    useCallback(() => {
      setCargando(true);
      void cargar().finally(() => setCargando(false));
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

  const opciones: OpcionFiltro[] = [
    { valor: 'todas', etiqueta: `Todas (${totalLecturas})`, icono: 'albums-outline' },
    {
      valor: 'pendientes',
      etiqueta: `Pendientes (${pendientes + revision})`,
      icono: 'cloud-upload-outline',
    },
    { valor: 'enviadas', etiqueta: `Enviadas (${enviadas})`, icono: 'checkmark-circle-outline' },
  ];

  const tituloVacio =
    filtro === 'enviadas'
      ? 'Todavía no hay lecturas enviadas'
      : filtro === 'pendientes'
        ? 'No tienes lecturas pendientes'
        : 'Aún no hay lecturas en tu jornada';

  const mensajeVacio =
    filtro === 'enviadas'
      ? 'Cuando la oficina confirme una lectura, aparecerá aquí y quedará bloqueada para edición.'
      : filtro === 'pendientes'
        ? 'Todas tus lecturas fueron confirmadas por el sistema de oficina.'
        : 'Busca un medidor y registra la primera lectura. Se guardará en el teléfono aunque no haya señal.';

  return (
    <AppScreen refrescando={refrescando} onRefresh={() => void refrescar()}>
      <AppHeader
        marca
        titulo="Mis lecturas"
        subtitulo="Cada medidor admite una lectura por mes. Las enviadas son inmutables."
        derecha={<Badge texto={`${totalLecturas} en total`} tono="marca" icono="documents-outline" />}
      />

      <View style={estilos.filtros} accessibilityRole="tablist">
        {opciones.map((opcion) => {
          const activo = filtro === opcion.valor;
          return (
            <Pressable
              key={opcion.valor}
              onPress={() => setFiltro(opcion.valor)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={`Filtrar ${opcion.etiqueta}`}
              style={({ pressed }) => [
                estilos.filtro,
                activo && estilos.filtroActivo,
                pressed && estilos.filtroPresionado,
              ]}
            >
              <Ionicons
                name={opcion.icono}
                size={16}
                color={activo ? colors.white : colors.textMuted}
              />
              <Texto
                variante="micro"
                peso="bold"
                color={activo ? colors.white : colors.textMuted}
                numberOfLines={1}
              >
                {opcion.etiqueta}
              </Texto>
            </Pressable>
          );
        })}
      </View>

      {revision > 0 && filtro !== 'enviadas' ? (
        <Alerta tono="peligro" titulo="Lecturas que necesitan tu revisión">
          {revision === 1
            ? 'Una lectura no se pudo enviar porque requiere una corrección.'
            : `${revision} lecturas no se pudieron enviar porque requieren una corrección.`}{' '}
          Ábrelas para revisar el motivo, corregirlas y volver a guardarlas.
        </Alerta>
      ) : null}

      {cargando && lecturas.length === 0 ? (
        <View style={estilos.cargando}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Texto variante="caption" color={colors.textMuted}>
            Leyendo las lecturas guardadas…
          </Texto>
        </View>
      ) : lecturas.length === 0 ? (
        <EmptyState
          icono={filtro === 'enviadas' ? 'cloud-done-outline' : 'document-text-outline'}
          titulo={tituloVacio}
          mensaje={mensajeVacio}
          accion={
            filtro === 'todas' ? (
              <Boton
                titulo="Buscar un medidor"
                onPress={() => router.push('/buscar')}
                variante="secundario"
                icono="search-outline"
              />
            ) : null
          }
        />
      ) : (
        <View style={estilos.seccion}>
          <SectionTitle
            titulo={
              filtro === 'todas'
                ? 'Todas las lecturas'
                : filtro === 'pendientes'
                  ? 'Pendientes de envío'
                  : 'Confirmadas por la oficina'
            }
            descripcion={`${lecturas.length} ${
              lecturas.length === 1 ? 'registro' : 'registros'
            } en este filtro.`}
          />
          <View style={estilos.lista}>
            {lecturas.map((lectura) => (
              <LecturaCard
                key={lectura.localId}
                lectura={lectura}
                onPress={() => router.push(`/lectura/${lectura.localId}`)}
              />
            ))}
          </View>
        </View>
      )}

      <Alerta tono="info" titulo="Estados de envío">
        Una lectura pendiente se envía sola al recuperar la conexión. Si requiere revisión, no se
        enviará hasta que corrijas el dato indicado. Una lectura enviada ya no se puede modificar.
      </Alerta>
    </AppScreen>
  );
}

const estilos = StyleSheet.create({
  filtros: {
    flexDirection: 'row',
    gap: spacing.xs,
    ...clayInset,
    borderRadius: radius.lg,
    padding: spacing.xs,
  },
  filtro: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs,
  },
  filtroActivo: {
    backgroundColor: colors.brand,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    borderBottomColor: 'rgba(40,43,120,0.40)',
    ...clayShadowSoft,
  },
  filtroPresionado: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  seccion: {
    gap: spacing.md,
  },
  lista: {
    gap: spacing.sm,
  },
  cargando: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.huge,
  },
});
