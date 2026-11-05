import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  Alerta,
  AppHeader,
  AppScreen,
  Badge,
  Boton,
  Card,
  EstadoAnimado,
  InfoRow,
  MapaLectura,
  SectionTitle,
  Texto,
} from '@/components/ui';
import { colors } from '@/constants/ui';
import { useApp } from '@/context/AppProvider';
import {
  descripcionEstadoEnvio,
  descripcionEstadoVerificacion,
  etiquetaEstadoEnvio,
  etiquetaEstadoVerificacion,
  etiquetaTipoEstado,
} from '@/utils/etiquetas';
import type { TonoBadge } from '@/components/ui';
import {
  obtenerLecturaPorId,
  prepararReintentoLectura,
} from '@/services/lecturasService';
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
    if (lectura?.estadoEnvio === 'requiere_revision') {
      await prepararReintentoLectura(lectura.localId);
    }
    await sincronizarAhora();
    await cargar();
  }

  if (cargando && !lectura) {
    return (
      <AppScreen>
        <AppHeader titulo="Lectura" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center gap-3 py-12">
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

      <Card className="flex-row items-center gap-3">
        <EstadoAnimado tipo="guardado" tamano={88} />
        <View className="flex-1 gap-1">
          <Texto variante="cuerpoFuerte">Lectura guardada</Texto>
          <Texto variante="caption" color={colors.textMuted}>
            {lectura.estadoEnvio === 'enviado'
              ? 'La oficina confirmó el registro.'
              : 'El registro está guardado en este teléfono y pendiente de sincronización.'}
          </Texto>
        </View>
      </Card>

      <Card className="gap-3">
        <View className="flex-row items-center gap-3">
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
          <View className="flex-1 gap-1">
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

      <View className="gap-3">
        <SectionTitle titulo="Datos registrados" />
        <Card className="py-2">
          <InfoRow
            etiqueta="Medidor"
            valor={lectura.codigoMedidor}
            icono="barcode-outline"
          />
          <View className="h-px bg-slate-100" />
          <InfoRow
            etiqueta="Periodo"
            valor={nombrePeriodo(lectura.periodo)}
            icono="calendar-outline"
          />
          <View className="h-px bg-slate-100" />
          <InfoRow
            etiqueta="Fecha de registro"
            valor={formatearFechaHora(lectura.fechaRegistro)}
            icono="time-outline"
          />
          <View className="h-px bg-slate-100" />
          <InfoRow
            etiqueta="Estado encontrado"
            valor={etiquetaTipoEstado(lectura.tipoEstado)}
            icono="pulse-outline"
          />
          <View className="h-px bg-slate-100" />
          <InfoRow
            etiqueta="Lectura actual"
            valor={formatearMetros(lectura.lecturaActual)}
            icono="water-outline"
          />
          <View className="h-px bg-slate-100" />
          <InfoRow
            etiqueta="Lectura anterior"
            valor={formatearMetros(lectura.ultimaLecturaReferencia)}
            icono="time-outline"
          />
          <View className="h-px bg-slate-100" />
          <InfoRow
            etiqueta="Consumo calculado"
            valor={formatearMetros(lectura.consumoCalculado)}
            color={lectura.estadoVerificacion === 'anomalia_confirmada' ? colors.danger : colors.text}
            icono="analytics-outline"
          />
          <View className="h-px bg-slate-100" />
          <InfoRow
            etiqueta="Promedio mensual"
            valor={formatearMetros(lectura.consumoPromedioReferencia)}
            icono="stats-chart-outline"
          />
          <View className="h-px bg-slate-100" />
          <InfoRow
            etiqueta="Límite de anomalía"
            valor={formatearMetros(umbral)}
            icono="warning-outline"
          />
          <View className="h-px bg-slate-100" />
          <InfoRow
            etiqueta="Verificación"
            valor={etiquetaEstadoVerificacion(lectura.estadoVerificacion)}
            icono="shield-checkmark-outline"
          />
        </Card>
      </View>

      <View className="gap-3">
        <SectionTitle
          titulo="Ubicación de la lectura"
          descripcion="Lugar donde el técnico registró la lectura."
          animacion="ubicacion"
        />
        {lectura.ubicacion ? (
          <>
            <MapaLectura ubicacion={lectura.ubicacion} />
            <Texto variante="micro" color={colors.textMuted}>
              {lectura.ubicacion.latitud.toFixed(6)}, {lectura.ubicacion.longitud.toFixed(6)} ·{' '}
              {lectura.ubicacion.origen === 'gps' ? 'GPS' : 'marcador manual'}
            </Texto>
          </>
        ) : (
          <Alerta tono="info" titulo="Ubicación no disponible">
            Esta lectura se creó antes de guardar coordenadas.
          </Alerta>
        )}
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
        <Card className="gap-2">
          <Texto variante="etiqueta" color={colors.textMuted}>
            Motivo de inaccesibilidad
          </Texto>
          <Texto variante="cuerpo">{lectura.motivoInaccesible}</Texto>
        </Card>
      ) : null}

      {lectura.tipoEstado === 'danado' && lectura.descripcionDano ? (
        <Card className="gap-2">
          <Texto variante="etiqueta" color={colors.textMuted}>
            Descripción del daño
          </Texto>
          <Texto variante="cuerpo">{lectura.descripcionDano}</Texto>
        </Card>
      ) : null}

      <View className="gap-3">
        <SectionTitle
          titulo="Foto del medidor"
          descripcion={
            fotoDisponible
              ? 'La evidencia se conserva en el almacenamiento privado del teléfono.'
              : 'Esta lectura no tiene una foto asociada.'
          }
        />
        <Card className="p-3">
          {fotoDisponible ? (
            <Image
              source={{ uri: lectura.fotoUri ?? undefined }}
              className="h-[260px] w-full rounded-2xl"
              contentFit="cover"
              transition={150}
              accessibilityLabel={`Foto del medidor ${lectura.codigoMedidor}`}
            />
          ) : (
            <View className="min-h-[180px] items-center justify-center gap-2">
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
        <View className="gap-3">
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
