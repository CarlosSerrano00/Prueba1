import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  Alerta,
  AppHeader,
  AppScreen,
  Badge,
  Boton,
  Card,
  InfoRow,
  SectionTitle,
  Texto,
} from '@/components/ui';
import { colors, radius, spacing } from '@/constants/ui';
import { useApp } from '@/context/AppProvider';
import {
  descripcionEstadoEnvio,
  descripcionEstadoVerificacion,
  etiquetaEstadoEnvio,
  etiquetaEstadoVerificacion,
  etiquetaTipoEstado,
} from '@/utils/etiquetas';
import type { TonoBadge } from '@/components/ui';
import { obtenerLecturaPorId } from '@/services/lecturasService';
import type { Lectura } from '@/types/models';
import { formatearFechaHora, formatearMetros } from '@/utils/format';
import { nombrePeriodo } from '@/utils/periodo';
import { calcularUmbral } from '@/utils/consumo';
import { lecturaSePuedeCorregir } from '@/utils/verificacion';

function normalizarParam(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) return valor[0] ?? '';
  return valor ?? '';
}

function tonoEnvio(lectura: Lectura): TonoBadge {
  if (lectura.estadoEnvio === 'enviado') return 'exito';
  if (lectura.estadoEnvio === 'requiere_revision') return 'peligro';
  if (lectura.estadoEnvio === 'enviando') return 'info';
  return 'advertencia';
}

export default function LecturaScreen() {
  const parametros = useLocalSearchParams<{ localId?: string | string[] }>();
  const localId = normalizarParam(parametros.localId);
  const router = useRouter();
  const { sincronizarAhora, enLinea } = useApp();
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!localId) {
      setError('No se indicó la lectura que quieres abrir.');
      setCargando(false);
      return;
    }
    try {
      const encontrada = await obtenerLecturaPorId(localId);
      if (!encontrada) {
        setError('La lectura ya no existe en este teléfono.');
      } else {
        setLectura(encontrada);
        setError(null);
      }
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo abrir la lectura.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [localId]);

  useFocusEffect(
    useCallback(() => {
      setCargando(true);
      void cargar();
    }, [cargar]),
  );

  async function refrescar() {
    setRefrescando(true);
    await cargar();
  }

  async function reintentarEnvio() {
    await sincronizarAhora();
    await cargar();
  }

  if (cargando && !lectura) {
    return (
      <AppScreen>
        <AppHeader titulo="Lectura" onBack={() => router.back()} />
        <View style={estilos.centro}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Texto variante="caption" color={colors.textMuted}>
            Abriendo la lectura…
          </Texto>
        </View>
      </AppScreen>
    );
  }

  if (error || !lectura) {
    return (
      <AppScreen>
        <AppHeader titulo="Lectura" onBack={() => router.back()} />
        <Alerta tono="peligro" titulo="No se pudo abrir la lectura">
          {error ?? 'La lectura no está disponible.'}
        </Alerta>
        <Boton
          titulo="Volver a mis lecturas"
          onPress={() => router.replace('/lecturas')}
          variante="secundario"
          icono="documents-outline"
        />
      </AppScreen>
    );
  }

  const puedeCorregir = lecturaSePuedeCorregir(lectura.estadoEnvio);
  const umbral = calcularUmbral(lectura.consumoPromedioReferencia);
  const fotoDisponible = Boolean(lectura.fotoUri);

  return (
    <AppScreen refrescando={refrescando} onRefresh={() => void refrescar()}>
      <AppHeader
        titulo={`Lectura ${lectura.codigoMedidor}`}
        subtitulo={nombrePeriodo(lectura.periodo)}
        onBack={() => router.back()}
        derecha={
          <Badge
            texto={etiquetaEstadoEnvio(lectura.estadoEnvio)}
            tono={tonoEnvio(lectura)}
            icono={
              lectura.estadoEnvio === 'enviado'
                ? 'checkmark-circle'
                : lectura.estadoEnvio === 'requiere_revision'
                  ? 'alert-circle'
                  : lectura.estadoEnvio === 'enviando'
                    ? 'sync'
                    : 'time'
            }
          />
        }
      />

      <Card estilo={estilos.estadoCard}>
        <View style={estilos.estadoFila}>
          <Ionicons
            name={
              lectura.estadoEnvio === 'enviado'
                ? 'shield-checkmark'
                : lectura.estadoEnvio === 'requiere_revision'
                  ? 'alert-circle'
                  : 'phone-portrait-outline'
            }
            size={24}
            color={
              lectura.estadoEnvio === 'enviado'
                ? colors.success
                : lectura.estadoEnvio === 'requiere_revision'
                  ? colors.danger
                  : colors.warning
            }
          />
          <View style={estilos.estadoTextos}>
            <Texto variante="cuerpoFuerte">{etiquetaEstadoEnvio(lectura.estadoEnvio)}</Texto>
            <Texto variante="caption" color={colors.textMuted}>
              {descripcionEstadoEnvio(lectura.estadoEnvio)}
            </Texto>
          </View>
        </View>

        {lectura.mensajeError ? (
          <Alerta
            tono={lectura.estadoEnvio === 'requiere_revision' ? 'peligro' : 'advertencia'}
            titulo={
              lectura.estadoEnvio === 'requiere_revision'
                ? 'Motivo de la revisión'
                : 'Último intento de envío'
            }
          >
            {lectura.mensajeError}
          </Alerta>
        ) : null}

        {lectura.estadoEnvio === 'enviado' ? (
          <Alerta tono="exito" titulo="Registro inmutable">
            La oficina confirmó esta lectura el{' '}
            {lectura.fechaEnvio ? formatearFechaHora(lectura.fechaEnvio) : 'día de hoy'}. Ya no se
            puede modificar. Si necesitas una corrección, comunícala a la oficina.
          </Alerta>
        ) : null}
      </Card>

      <View style={estilos.seccion}>
        <SectionTitle titulo="Datos registrados" />
        <Card estilo={estilos.datosCard}>
          <InfoRow
            etiqueta="Medidor"
            valor={lectura.codigoMedidor}
            icono="barcode-outline"
          />
          <View style={estilos.divisor} />
          <InfoRow
            etiqueta="Periodo"
            valor={nombrePeriodo(lectura.periodo)}
            icono="calendar-outline"
          />
          <View style={estilos.divisor} />
          <InfoRow
            etiqueta="Fecha de registro"
            valor={formatearFechaHora(lectura.fechaRegistro)}
            icono="time-outline"
          />
          <View style={estilos.divisor} />
          <InfoRow
            etiqueta="Estado encontrado"
            valor={etiquetaTipoEstado(lectura.tipoEstado)}
            icono="pulse-outline"
          />
          <View style={estilos.divisor} />
          <InfoRow
            etiqueta="Lectura actual"
            valor={formatearMetros(lectura.lecturaActual)}
            icono="water-outline"
          />
          <View style={estilos.divisor} />
          <InfoRow
            etiqueta="Lectura anterior"
            valor={formatearMetros(lectura.ultimaLecturaReferencia)}
            icono="time-outline"
          />
          <View style={estilos.divisor} />
          <InfoRow
            etiqueta="Consumo calculado"
            valor={formatearMetros(lectura.consumoCalculado)}
            color={lectura.estadoVerificacion === 'anomalia_confirmada' ? colors.danger : colors.text}
            icono="analytics-outline"
          />
          <View style={estilos.divisor} />
          <InfoRow
            etiqueta="Promedio mensual"
            valor={formatearMetros(lectura.consumoPromedioReferencia)}
            icono="stats-chart-outline"
          />
          <View style={estilos.divisor} />
          <InfoRow
            etiqueta="Límite de anomalía"
            valor={formatearMetros(umbral)}
            icono="warning-outline"
          />
          <View style={estilos.divisor} />
          <InfoRow
            etiqueta="Verificación"
            valor={etiquetaEstadoVerificacion(lectura.estadoVerificacion)}
            icono="shield-checkmark-outline"
          />
        </Card>
      </View>

      <Alerta
        tono={
          lectura.estadoVerificacion === 'anomalia_confirmada'
            ? 'peligro'
            : lectura.estadoVerificacion === 'pendiente' ||
                lectura.estadoVerificacion === 'anomalia_pendiente'
              ? 'advertencia'
              : 'info'
        }
        titulo={etiquetaEstadoVerificacion(lectura.estadoVerificacion)}
      >
        {descripcionEstadoVerificacion(lectura.estadoVerificacion)}
      </Alerta>

      {lectura.tipoEstado === 'inaccesible' && lectura.motivoInaccesible ? (
        <Card estilo={estilos.textoCard}>
          <Texto variante="etiqueta" color={colors.textMuted}>
            Motivo de inaccesibilidad
          </Texto>
          <Texto variante="cuerpo">{lectura.motivoInaccesible}</Texto>
        </Card>
      ) : null}

      {lectura.tipoEstado === 'danado' && lectura.descripcionDano ? (
        <Card estilo={estilos.textoCard}>
          <Texto variante="etiqueta" color={colors.textMuted}>
            Descripción del daño
          </Texto>
          <Texto variante="cuerpo">{lectura.descripcionDano}</Texto>
        </Card>
      ) : null}

      <View style={estilos.seccion}>
        <SectionTitle
          titulo="Foto del medidor"
          descripcion={
            fotoDisponible
              ? 'La evidencia se conserva en el almacenamiento privado del teléfono.'
              : 'Esta lectura no tiene una foto asociada.'
          }
        />
        <Card estilo={estilos.fotoCard}>
          {fotoDisponible ? (
            <Image
              source={{ uri: lectura.fotoUri ?? undefined }}
              style={estilos.foto}
              contentFit="cover"
              transition={150}
              accessibilityLabel={`Foto del medidor ${lectura.codigoMedidor}`}
            />
          ) : (
            <View style={estilos.sinFoto}>
              <Ionicons name="image-outline" size={30} color={colors.textSoft} />
              <Texto variante="caption" color={colors.textMuted} centrado>
                {lectura.tipoEstado === 'normal' && lectura.estadoVerificacion !== 'anomalia_confirmada'
                  ? 'La foto era opcional para este registro.'
                  : 'No se encontró la foto guardada. El registro y sus datos siguen disponibles.'}
              </Texto>
            </View>
          )}
        </Card>
      </View>

      {lectura.estadoEnvio !== 'enviado' ? (
        <View style={estilos.seccion}>
          <SectionTitle
            titulo="Acciones"
            descripcion="Puedes corregir el registro mientras la oficina no lo haya confirmado."
          />
          {puedeCorregir ? (
            <Boton
              titulo="Corregir esta lectura"
              onPress={() =>
                router.push({
                  pathname: '/registro/[codigo]',
                  params: { codigo: lectura.codigoMedidor, editar: lectura.localId },
                })
              }
              icono="create-outline"
            />
          ) : null}
          <Boton
            titulo="Reintentar envío"
            onPress={() => void reintentarEnvio()}
            variante="secundario"
            icono="cloud-upload-outline"
            deshabilitado={!enLinea}
          />
          {!enLinea ? (
            <Texto variante="micro" color={colors.warning} centrado>
              Sin conexión. El envío se reintentará automáticamente cuando vuelva la señal.
            </Texto>
          ) : null}
          {lectura.intentosEnvio > 0 ? (
            <Texto variante="micro" color={colors.textMuted} centrado>
              Intentos de envío realizados: {lectura.intentosEnvio}.
            </Texto>
          ) : null}
        </View>
      ) : null}

      <Boton
        titulo="Ver datos del medidor"
        onPress={() =>
          router.push({
            pathname: '/medidor/[codigo]',
            params: { codigo: lectura.codigoMedidor },
          })
        }
        variante="fantasma"
        icono="speedometer-outline"
      />
    </AppScreen>
  );
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.huge,
  },
  estadoCard: {
    gap: spacing.md,
  },
  estadoFila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  estadoTextos: {
    flex: 1,
    gap: 2,
  },
  seccion: {
    gap: spacing.md,
  },
  datosCard: {
    paddingVertical: spacing.sm,
  },
  divisor: {
    height: 1,
    backgroundColor: colors.surfaceAlt,
  },
  textoCard: {
    gap: spacing.xs,
  },
  fotoCard: {
    padding: spacing.sm,
  },
  foto: {
    width: '100%',
    height: 230,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  sinFoto: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
