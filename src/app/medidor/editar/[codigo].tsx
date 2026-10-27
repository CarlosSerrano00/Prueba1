import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import {
  Alerta,
  AppHeader,
  AppScreen,
  Boton,
  CampoFecha,
  CampoTexto,
  Card,
  ChoiceCard,
  SectionTitle,
  Texto,
} from '@/components/ui';
import { colors, radius, spacing } from '@/constants/ui';
import { useApp } from '@/context/AppProvider';
import { mensajeDeError } from '@/services/errors';
import { actualizarMedidor, consultarMedidor } from '@/services/medidoresService';
import type { Medidor } from '@/types/models';
import { FECHA_MINIMA, hoyISO, normalizarFechaDia } from '@/utils/fechas';
import {
  esEstadoMedidorValido,
  LONGITUDES_MEDIDOR,
  primerErrorMedidor,
  validarMedidorFormulario,
  type ErroresMedidor,
  type MedidorFormulario,
} from '@/utils/validacionesEntidades';
import { validarCodigoMedidor } from '@/utils/validators';

function normalizarParam(valor: string | string[] | undefined): string | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

function formularioDesdeMedidor(medidor: Medidor): MedidorFormulario {
  return {
    codigo: medidor.codigo,
    direccion: medidor.direccion,
    sector: medidor.sector,
    numeroCuenta: medidor.numeroCuenta,
    estado: esEstadoMedidorValido(medidor.estado) ? medidor.estado : 'activo',
    ultimaLectura: medidor.ultimaLectura == null ? '' : String(medidor.ultimaLectura),
    fechaUltimaLectura: normalizarFechaDia(medidor.fechaUltimaLectura),
    consumoPromedioMensual:
      medidor.consumoPromedioMensual == null ? '' : String(medidor.consumoPromedioMensual),
  };
}

export default function EditarMedidorScreen() {
  const parametros = useLocalSearchParams<{ codigo?: string | string[] }>();
  const codigo = normalizarParam(parametros.codigo) ?? '';
  const router = useRouter();
  const { enLinea } = useApp();

  const [medidor, setMedidor] = useState<Medidor | null>(null);
  const [formulario, setFormulario] = useState<MedidorFormulario | null>(null);
  const [errores, setErrores] = useState<ErroresMedidor>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // La conectividad puede cambiar mientras el técnico edita. Se guarda en un
  // ref para que `cargar` no se recree y no borre los cambios sin guardar.
  const enLineaRef = useRef(enLinea);
  useEffect(() => {
    enLineaRef.current = enLinea;
  }, [enLinea]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorGeneral(null);
    try {
      const validacion = validarCodigoMedidor(codigo);
      if (!validacion.valido) {
        throw new Error(validacion.mensaje ?? 'El código del medidor no es válido.');
      }
      const resultado = await consultarMedidor(codigo, enLineaRef.current);
      setMedidor(resultado.medidor);
      setFormulario(formularioDesdeMedidor(resultado.medidor));
      setErrores({});
    } catch (fallo) {
      setErrorGeneral(mensajeDeError(fallo));
    } finally {
      setCargando(false);
    }
  }, [codigo]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  function cambiar(campo: keyof MedidorFormulario, valor: string | null) {
    setFormulario((actual) => (actual ? { ...actual, [campo]: valor } : actual));
    setErrores((actual) => ({ ...actual, [campo]: undefined }));
    setErrorGeneral(null);
  }

  async function guardar() {
    if (!formulario || !medidor) return;
    setGuardando(true);
    setErrorGeneral(null);

    const validacion = validarMedidorFormulario(formulario);
    setErrores(validacion.errores);
    if (!validacion.valido) {
      setErrorGeneral(primerErrorMedidor(validacion.errores) ?? 'Revisa los datos del medidor.');
      setGuardando(false);
      return;
    }

    if (!enLinea) {
      setErrorGeneral(
        'Necesitas conexión para guardar la ficha en MockAPI. Los cambios no se encolan.',
      );
      setGuardando(false);
      return;
    }

    try {
      const { codigo: _codigo, ...cambios } = validacion.valores;
      await actualizarMedidor(medidor.codigo, cambios);
      Alert.alert(
        'Medidor actualizado',
        'La ficha se guardó en MockAPI y la copia local quedó actualizada.',
        [{ text: 'Volver', onPress: () => router.back() }],
      );
    } catch (fallo) {
      setErrorGeneral(mensajeDeError(fallo));
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <AppScreen>
        <AppHeader titulo="Editar medidor" subtitulo={codigo} onBack={() => router.back()} />
        <View style={estilos.centro}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Texto variante="caption" color={colors.textMuted}>
            Cargando la ficha del medidor…
          </Texto>
        </View>
      </AppScreen>
    );
  }

  if (errorGeneral && (!formulario || !medidor)) {
    return (
      <AppScreen>
        <AppHeader titulo="Editar medidor" subtitulo={codigo} onBack={() => router.back()} />
        <Alerta tono="peligro" titulo="No se pudo abrir la ficha">
          {errorGeneral}
        </Alerta>
        <Boton titulo="Volver a intentar" onPress={() => void cargar()} icono="refresh" />
      </AppScreen>
    );
  }

  if (!formulario || !medidor) return null;

  return (
    <AppScreen evitarTeclado>
      <AppHeader
        titulo="Editar medidor"
        subtitulo="Los cambios se envían a la oficina."
        onBack={() => router.back()}
        derecha={<Ionicons name="cloud-upload-outline" size={24} color={colors.brand} />}
      />

      <Alerta tono="info" titulo="Actualización directa en MockAPI">
        La ficha maestra se actualiza solo con conexión. Si falla el envío, no se guarda una
        versión local diferente a la de oficina.
      </Alerta>

      {errorGeneral ? (
        <Alerta tono="peligro" titulo="Revisa los datos">
          {errorGeneral}
        </Alerta>
      ) : null}

      {!enLinea ? (
        <Alerta tono="advertencia" titulo="Sin conexión">
          Puedes revisar los datos, pero necesitas conexión para guardar los cambios.
        </Alerta>
      ) : null}

      <Card estilo={estilos.resumenCard}>
        <View style={estilos.codigoFila}>
          <View style={estilos.codigoIcono}>
            <Ionicons name="speedometer-outline" size={24} color={colors.accentDark} />
          </View>
          <View style={estilos.codigoTextos}>
            <Texto variante="etiqueta" color={colors.textMuted}>
              Código de etiqueta
            </Texto>
            <Texto variante="mono" peso="bold" color={colors.brand} style={estilos.codigo}>
              {medidor.codigo}
            </Texto>
          </View>
        </View>
        <Texto variante="caption" color={colors.textMuted}>
          El código no se puede cambiar porque identifica la etiqueta física y las lecturas
          asociadas.
        </Texto>
      </Card>

      <View style={estilos.seccion}>
        <SectionTitle
          titulo="Ubicación y cuenta"
          descripcion="Datos que usa el técnico para identificar el medidor en campo."
        />
        <CampoTexto
          etiqueta="Dirección"
          valor={formulario.direccion}
          onChangeText={(valor) => cambiar('direccion', valor)}
          placeholder="Calle, número y referencia"
          maxLength={LONGITUDES_MEDIDOR.direccion.max}
          error={errores.direccion}
          ayuda={`Mínimo ${LONGITUDES_MEDIDOR.direccion.min} caracteres.`}
          icono="home-outline"
        />
        <CampoTexto
          etiqueta="Sector"
          valor={formulario.sector}
          onChangeText={(valor) => cambiar('sector', valor)}
          placeholder="Nono, Lloa, La Libertad…"
          maxLength={LONGITUDES_MEDIDOR.sector.max}
          error={errores.sector}
          ayuda={`Mínimo ${LONGITUDES_MEDIDOR.sector.min} caracteres.`}
          icono="map-outline"
        />
        <CampoTexto
          etiqueta="Número de cuenta"
          valor={formulario.numeroCuenta}
          onChangeText={(valor) => cambiar('numeroCuenta', valor)}
          placeholder="CTA-100001"
          maxLength={LONGITUDES_MEDIDOR.numeroCuenta.max}
          autoCapitalize="characters"
          autoCorrect={false}
          error={errores.numeroCuenta}
          ayuda="Formato obligatorio: CTA- seguido de seis dígitos."
          icono="receipt-outline"
        />
      </View>

      <View style={estilos.seccion}>
        <SectionTitle
          titulo="Estado del medidor"
          descripcion="El estado se muestra en la búsqueda y en la ficha del medidor."
        />
        <View style={estilos.listaOpciones}>
          <ChoiceCard
            titulo="Activo"
            descripcion="El medidor está operativo y se le pueden tomar lecturas."
            icono="checkmark-circle-outline"
            seleccionado={formulario.estado === 'activo'}
            onPress={() => cambiar('estado', 'activo')}
            color={colors.success}
            fondo={colors.successSoft}
          />
          <ChoiceCard
            titulo="Suspendido"
            descripcion="El servicio está suspendido temporalmente."
            icono="pause-circle-outline"
            seleccionado={formulario.estado === 'suspendido'}
            onPress={() => cambiar('estado', 'suspendido')}
            color={colors.warning}
            fondo={colors.warningSoft}
          />
          <ChoiceCard
            titulo="Inactivo"
            descripcion="El medidor fue retirado o ya no está en servicio."
            icono="close-circle-outline"
            seleccionado={formulario.estado === 'inactivo'}
            onPress={() => cambiar('estado', 'inactivo')}
            color={colors.danger}
            fondo={colors.dangerSoft}
          />
        </View>
        {errores.estado ? <Alerta tono="peligro">{errores.estado}</Alerta> : null}
      </View>

      <View style={estilos.seccion}>
        <SectionTitle
          titulo="Referencia de consumo"
          descripcion="El promedio mensual se usa para detectar consumos anómalos."
        />
        <CampoTexto
          etiqueta="Última lectura"
          valor={formulario.ultimaLectura}
          onChangeText={(valor) => cambiar('ultimaLectura', valor)}
          placeholder="Ejemplo: 540,5"
          keyboardType="decimal-pad"
          sufijo="m³"
          maxLength={10}
          error={errores.ultimaLectura}
          ayuda="Entre 0 y 999.999,999. Hasta tres decimales."
          icono="water-outline"
        />
        <CampoFecha
          etiqueta="Fecha de última lectura"
          valor={formulario.fechaUltimaLectura}
          onChange={(valor) => cambiar('fechaUltimaLectura', valor)}
          min={FECHA_MINIMA}
          max={hoyISO()}
          error={errores.fechaUltimaLectura}
          ayuda="Opcional. Si dejas la lectura vacía, deja también la fecha vacía."
        />
        <CampoTexto
          etiqueta="Consumo promedio mensual"
          valor={formulario.consumoPromedioMensual}
          onChangeText={(valor) => cambiar('consumoPromedioMensual', valor)}
          placeholder="Ejemplo: 20"
          keyboardType="decimal-pad"
          sufijo="m³"
          maxLength={10}
          error={errores.consumoPromedioMensual}
          ayuda="Opcional. Entre 0 y 100.000 m³. Se usa para el límite de anomalía."
          icono="analytics-outline"
        />
        <Alerta tono="advertencia" titulo="Coherencia de la referencia">
          Si informas una última lectura, también debes informar su fecha. Si no hay referencia,
          deja ambos campos vacíos.
        </Alerta>
      </View>

      <Boton
        titulo="Guardar en MockAPI"
        onPress={() => void guardar()}
        icono="cloud-upload-outline"
        cargando={guardando}
        deshabilitado={!enLinea}
      />
      <Boton
        titulo="Cancelar"
        onPress={() => router.back()}
        variante="fantasma"
        deshabilitado={guardando}
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
  resumenCard: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceBrand,
  },
  codigoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  codigoIcono: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codigoTextos: {
    flex: 1,
    gap: 1,
  },
  codigo: {
    fontSize: 21,
  },
  seccion: {
    gap: spacing.md,
  },
  listaOpciones: {
    gap: spacing.sm,
  },
});
