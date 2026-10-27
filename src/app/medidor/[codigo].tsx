import { Ionicons } from '@expo/vector-icons';
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
import { mensajeDeError } from '@/services/errors';
import { consultarMedidor } from '@/services/medidoresService';
import { obtenerLecturaDelPeriodo } from '@/services/lecturasService';
import type { Lectura, MedidorConOrigen } from '@/types/models';
import { etiquetaEstadoMedidor } from '@/utils/etiquetas';
import { formatearFecha, formatearFechaHora, formatearMetros } from '@/utils/format';
import { nombrePeriodo, obtenerPeriodo } from '@/utils/periodo';
import { validarCodigoMedidor } from '@/utils/validators';

function consultadoHoy(iso: string): boolean {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return false;
  const hoy = new Date();
  return (
    fecha.getFullYear() === hoy.getFullYear() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getDate() === hoy.getDate()
  );
}

export default function MedidorScreen() {
  const parametros = useLocalSearchParams<{ codigo?: string | string[] }>();
  const codigo = Array.isArray(parametros.codigo) ? parametros.codigo[0] : parametros.codigo ?? '';
  const router = useRouter();
  const { enLinea } = useApp();
  const [resultado, setResultado] = useState<MedidorConOrigen | null>(null);
  const [lecturaMes, setLecturaMes] = useState<Lectura | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async (forzarRed = false) => {
    const validacion = validarCodigoMedidor(codigo);
    if (!validacion.valido) {
      setError(validacion.mensaje ?? 'El código del medidor no es válido.');
      setCargando(false);
      return;
    }

    setError(null);
    try {
      const datos = await consultarMedidor(codigo, enLinea, forzarRed);
      const periodo = obtenerPeriodo();
      const existente = await obtenerLecturaDelPeriodo(codigo, periodo);
      setResultado(datos);
      setLecturaMes(existente);
    } catch (fallo) {
      setError(mensajeDeError(fallo));
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [codigo, enLinea]);

  useFocusEffect(
    useCallback(() => {
      setCargando(true);
      void cargar();
    }, [cargar]),
  );

  async function refrescar() {
    setRefrescando(true);
    await cargar(true);
  }

  function abrirRegistro() {
    router.push({ pathname: '/registro/[codigo]', params: { codigo } });
  }

  if (cargando && !resultado) {
    return (
      <AppScreen>
        <AppHeader titulo="Medidor" subtitulo={codigo} onBack={() => router.back()} />
        <View style={estilos.cargando}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Texto variante="caption" color={colors.textMuted}>
            Consultando el medidor…
          </Texto>
        </View>
      </AppScreen>
    );
  }

  if (error || !resultado) {
    return (
      <AppScreen>
        <AppHeader titulo="Medidor" subtitulo={codigo} onBack={() => router.back()} />
        <Alerta tono="peligro" titulo="No se pudo abrir el medidor">
          {error ?? 'No se recibieron datos del medidor.'}
        </Alerta>
        <Boton titulo="Volver a intentar" onPress={() => void cargar()} icono="refresh" />
      </AppScreen>
    );
  }

  const { medidor, origen, advertencia } = resultado;
  const periodo = obtenerPeriodo();
  const cacheAlDia = origen === 'cache' && enLinea && consultadoHoy(medidor.consultadoEn);

  return (
    <AppScreen refrescando={refrescando} onRefresh={() => void refrescar()}>
      <AppHeader
        titulo="Medidor"
        subtitulo="Revisa los datos antes de capturar la lectura."
        onBack={() => router.back()}
        derecha={<Badge texto={etiquetaEstadoMedidor(medidor.estado)} tono="marca" />}
      />

      <Card estilo={estilos.hero}>
        <View style={estilos.heroFila}>
          <View style={estilos.iconoMedidor}>
            <Ionicons name="speedometer-outline" size={28} color={colors.accentDark} />
          </View>
          <View style={estilos.heroTextos}>
            <Texto variante="etiqueta" color={colors.textMuted}>
              Código de etiqueta
            </Texto>
            <Texto variante="mono" peso="bold" color={colors.brand} style={estilos.codigo}>
              {medidor.codigo}
            </Texto>
          </View>
        </View>
        <View style={estilos.direccion}>
          <Ionicons name="location-outline" size={18} color={colors.accentDark} />
          <Texto variante="cuerpo" style={estilos.direccionTexto}>
            {medidor.direccion}
          </Texto>
        </View>
        <View style={estilos.heroPie}>
          <Texto variante="caption" color={colors.textMuted}>
            {medidor.sector}
          </Texto>
          <Badge
            texto={origen === 'remoto' ? 'Datos de oficina' : 'Copia guardada'}
            tono={origen === 'remoto' ? 'exito' : 'advertencia'}
            icono={origen === 'remoto' ? 'cloud-done-outline' : 'phone-portrait-outline'}
          />
        </View>
      </Card>

      {advertencia ? (
        <Alerta
          tono={cacheAlDia ? 'info' : 'advertencia'}
          titulo={cacheAlDia ? 'Datos guardados hoy' : 'Estás usando la copia local'}
        >
          {advertencia}
        </Alerta>
      ) : null}

      {lecturaMes ? (
        <Alerta
          tono={lecturaMes.estadoEnvio === 'enviado' ? 'exito' : 'advertencia'}
          titulo={`Ya hay una lectura de ${nombrePeriodo(periodo)}`}
          accion={
            <View style={estilos.filaBotones}>
              <Boton
                titulo="Ver lectura"
                onPress={() => router.push(`/lectura/${lecturaMes.localId}`)}
                variante="secundario"
                icono="document-text-outline"
                anchoCompleto={false}
              />
              {lecturaMes.estadoEnvio !== 'enviado' ? (
                <Boton
                  titulo="Corregir"
                  onPress={() =>
                    router.push({
                      pathname: '/registro/[codigo]',
                      params: { codigo, editar: lecturaMes.localId },
                    })
                  }
                  variante="acento"
                  icono="create-outline"
                  anchoCompleto={false}
                />
              ) : null}
            </View>
          }
        >
          Un medidor solo admite una lectura por mes. No se habilitará un segundo registro para
          este periodo.
        </Alerta>
      ) : null}

      <View style={estilos.seccion}>
        <SectionTitle
          titulo="Datos del medidor"
          descripcion="Información enviada por el sistema de oficina."
        />
        <Card estilo={estilos.datosCard}>
          <InfoRow etiqueta="Dirección" valor={medidor.direccion} icono="home-outline" />
          <View style={estilos.divisor} />
          <InfoRow etiqueta="Sector" valor={medidor.sector} icono="map-outline" />
          <View style={estilos.divisor} />
          <InfoRow etiqueta="Número de cuenta" valor={medidor.numeroCuenta} icono="receipt-outline" />
          <View style={estilos.divisor} />
          <InfoRow
            etiqueta="Estado"
            valor={etiquetaEstadoMedidor(medidor.estado)}
            icono="pulse-outline"
          />
          <View style={estilos.divisor} />
          <InfoRow
            etiqueta="Última lectura"
            valor={formatearMetros(medidor.ultimaLectura)}
            icono="water-outline"
          />
          <View style={estilos.divisor} />
          <InfoRow
            etiqueta="Fecha de última lectura"
            valor={formatearFecha(medidor.fechaUltimaLectura)}
            icono="calendar-outline"
          />
          <View style={estilos.divisor} />
          <InfoRow
            etiqueta="Consumo promedio mensual"
            valor={formatearMetros(medidor.consumoPromedioMensual)}
            icono="analytics-outline"
          />
        </Card>
        <Boton
          titulo="Editar ficha del medidor"
          onPress={() =>
            router.push({
              pathname: '/medidor/editar/[codigo]',
              params: { codigo },
            })
          }
          variante="secundario"
          icono="create-outline"
        />
      </View>

      <View style={estilos.referencia}>
        <View style={estilos.referenciaItem}>
          <Texto variante="etiqueta" color={colors.textMuted}>
            Lectura anterior
          </Texto>
          <Texto variante="encabezado">{formatearMetros(medidor.ultimaLectura)}</Texto>
          <Texto variante="micro" color={colors.textMuted}>
            {formatearFecha(medidor.fechaUltimaLectura)}
          </Texto>
        </View>
        <View style={estilos.referenciaSeparador} />
        <View style={estilos.referenciaItem}>
          <Texto variante="etiqueta" color={colors.textMuted}>
            Promedio mensual
          </Texto>
          <Texto variante="encabezado">{formatearMetros(medidor.consumoPromedioMensual)}</Texto>
          <Texto variante="micro" color={colors.textMuted}>
            Límite de anomalía: {formatearMetros((medidor.consumoPromedioMensual ?? 0) * 3)}
          </Texto>
        </View>
      </View>

      <Card estilo={estilos.sincronizacion}>
        <Ionicons name="time-outline" size={18} color={colors.textMuted} />
        <Texto variante="micro" color={colors.textMuted} style={estilos.sincronizacionTexto}>
          Copia guardada el {formatearFechaHora(medidor.consultadoEn)}. Desliza hacia abajo para
          actualizarla desde la oficina.
        </Texto>
      </Card>

      {!lecturaMes ? (
        <Boton
          titulo="Registrar lectura de este medidor"
          onPress={abrirRegistro}
          icono="create-outline"
          iconoDerecha="arrow-forward"
        />
      ) : null}
    </AppScreen>
  );
}

const estilos = StyleSheet.create({
  cargando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.huge,
  },
  hero: {
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceBrand,
  },
  heroFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconoMedidor: {
    width: 58,
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextos: {
    flex: 1,
    gap: 1,
  },
  codigo: {
    fontSize: 21,
  },
  direccion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  direccionTexto: {
    flex: 1,
  },
  heroPie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
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
  filaBotones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  referencia: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.white,
    borderBottomColor: 'rgba(130,139,183,0.24)',
    padding: spacing.md,
    gap: spacing.md,
  },
  referenciaItem: {
    flex: 1,
    gap: 2,
  },
  referenciaSeparador: {
    width: 1,
    backgroundColor: colors.border,
  },
  sincronizacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
  },
  sincronizacionTexto: {
    flex: 1,
  },
});
