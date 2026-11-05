import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';

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
  const cargaInicialRef = useRef(true);

  const cargar = useCallback(async (forzarRed = false) => {
    const inicioCarga = Date.now();
    const validacion = validarCodigoMedidor(codigo);
    if (!validacion.valido) {
      setError(validacion.mensaje ?? 'El código del medidor no es válido.');
      setCargando(false);
      return;
    }

    setError(null);
    let datosConsultados: MedidorConOrigen | null = null;
    let lecturaExistente: Lectura | null = null;
    try {
      datosConsultados = await consultarMedidor(codigo, enLinea, forzarRed);
      const periodo = obtenerPeriodo();
      lecturaExistente = await obtenerLecturaDelPeriodo(codigo, periodo);
    } catch (fallo) {
      setError(mensajeDeError(fallo));
    } finally {
      if (cargaInicialRef.current) {
        const esperaRestante = Math.max(0, 700 - (Date.now() - inicioCarga));
        if (esperaRestante > 0) {
          await new Promise((resolver) => setTimeout(resolver, esperaRestante));
        }
        cargaInicialRef.current = false;
      }
      if (datosConsultados) {
        setResultado(datosConsultados);
        setLecturaMes(lecturaExistente);
      }
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
        <View className="flex-1 items-center justify-center gap-3 py-12">
          <EstadoAnimado tipo="cargando" tamano={120} />
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

      <Card className="gap-3 bg-indigo-50">
        <View className="flex-row items-center gap-3">
          <View className="h-[58px] w-[58px] items-center justify-center rounded-xl border border-white bg-white">
            <Ionicons name="speedometer-outline" size={28} color={colors.accentDark} />
          </View>
          <View className="flex-1 gap-px">
            <Texto variante="etiqueta" color={colors.textMuted}>
              Código de etiqueta
            </Texto>
            <Texto variante="mono" peso="bold" color={colors.brand} className="text-[21px]">
              {medidor.codigo}
            </Texto>
          </View>
        </View>
        <View className="flex-row items-start gap-2">
          <Ionicons name="location-outline" size={18} color={colors.accentDark} />
          <Texto variante="cuerpo" className="flex-1">
            {medidor.direccion}
          </Texto>
        </View>
        <View className="flex-row items-center justify-between gap-2">
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
            <View className="flex-row flex-wrap gap-2">
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

      {lecturaMes ? (
        <View className="gap-3">
          <SectionTitle
            titulo="Ubicación de la lectura"
            descripcion={`Punto donde se registró la lectura de ${nombrePeriodo(periodo)}.`}
            animacion="ubicacion"
          />
          {lecturaMes.ubicacion ? (
            <MapaLectura ubicacion={lecturaMes.ubicacion} />
          ) : (
            <Alerta tono="info" titulo="Ubicación no disponible">
              Esta lectura anterior no guardó coordenadas. Las nuevas lecturas registran su
              ubicación por GPS o con un marcador en el mapa.
            </Alerta>
          )}
        </View>
      ) : null}

      <View className="gap-3">
        <SectionTitle
          titulo="Datos del medidor"
          descripcion="Información enviada por el sistema de oficina."
        />
        <Card className="py-2">
          <InfoRow etiqueta="Dirección" valor={medidor.direccion} icono="home-outline" />
          <View className="h-px bg-slate-100" />
          <InfoRow etiqueta="Sector" valor={medidor.sector} icono="map-outline" />
          <View className="h-px bg-slate-100" />
          <InfoRow etiqueta="Número de cuenta" valor={medidor.numeroCuenta} icono="receipt-outline" />
          <View className="h-px bg-slate-100" />
          <InfoRow
            etiqueta="Estado"
            valor={etiquetaEstadoMedidor(medidor.estado)}
            icono="pulse-outline"
          />
          <View className="h-px bg-slate-100" />
          <InfoRow
            etiqueta="Última lectura"
            valor={formatearMetros(medidor.ultimaLectura)}
            icono="water-outline"
          />
          <View className="h-px bg-slate-100" />
          <InfoRow
            etiqueta="Fecha de última lectura"
            valor={formatearFecha(medidor.fechaUltimaLectura)}
            icono="calendar-outline"
          />
          <View className="h-px bg-slate-100" />
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

      <View className="flex-row gap-3 rounded-3xl border border-white bg-slate-50 p-3">
        <View className="flex-1 gap-0.5">
          <Texto variante="etiqueta" color={colors.textMuted}>
            Lectura anterior
          </Texto>
          <Texto variante="encabezado">{formatearMetros(medidor.ultimaLectura)}</Texto>
          <Texto variante="micro" color={colors.textMuted}>
            {formatearFecha(medidor.fechaUltimaLectura)}
          </Texto>
        </View>
        <View className="w-px bg-slate-300" />
        <View className="flex-1 gap-0.5">
          <Texto variante="etiqueta" color={colors.textMuted}>
            Promedio mensual
          </Texto>
          <Texto variante="encabezado">{formatearMetros(medidor.consumoPromedioMensual)}</Texto>
          <Texto variante="micro" color={colors.textMuted}>
            Límite de anomalía: {formatearMetros((medidor.consumoPromedioMensual ?? 0) * 3)}
          </Texto>
        </View>
      </View>

      <Card className="flex-row items-center gap-2 rounded-3xl bg-slate-100 p-3">
        <Ionicons name="time-outline" size={18} color={colors.textMuted} />
        <Texto variante="micro" color={colors.textMuted} className="flex-1">
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
