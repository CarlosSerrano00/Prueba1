import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import {
  Alerta,
  AppHeader,
  AppScreen,
  Badge,
  Boton,
  CampoTexto,
  Card,
  ChoiceCard,
  FotoMedidor,
  InfoRow,
  SectionTitle,
  StepIndicator,
  Texto,
} from '@/components/ui';
import { colors, radius, spacing } from '@/constants/ui';
import { useApp } from '@/context/AppProvider';
import {
  crearBorradorEnMemoria,
  descartarBorrador,
  guardarBorrador,
  obtenerBorradorDeTecnico,
  obtenerBorradorPorId,
} from '@/services/borradoresService';
import {
  LecturaDuplicadaError,
  PermisoCamaraError,
  mensajeDeError,
} from '@/services/errors';
import { eliminarFotoSiHuerfana, tomarFoto } from '@/services/fotoService';
import {
  corregirLectura,
  guardarNuevaLectura,
  obtenerLecturaPorId,
} from '@/services/lecturasService';
import { consultarMedidor } from '@/services/medidoresService';
import { obtenerMedidor } from '@/storage/medidoresRepository';
import type {
  Borrador,
  DatosFormulario,
  Lectura,
  Medidor,
  PasoRegistro,
} from '@/types/models';
import { DATOS_FORMULARIO_VACIOS } from '@/types/models';
import { evaluarConsumo } from '@/utils/consumo';
import {
  formatearFechaHora,
  formatearMetros,
} from '@/utils/format';
import { obtenerPeriodo } from '@/utils/periodo';
import {
  fotoEsObligatoria,
  parsearLectura,
  primerError,
  validarCodigoMedidor,
  validarDatosRegistro,
  validarRegistroCompleto,
  type ErroresFormulario,
} from '@/utils/validators';
import { calcularEstadoVerificacion, lecturaSePuedeCorregir } from '@/utils/verificacion';

function normalizarParam(valor: string | string[] | undefined): string | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

function datosDesdeLectura(lectura: Lectura): DatosFormulario {
  return {
    tipoEstado: lectura.tipoEstado,
    lecturaActual: lectura.lecturaActual != null ? String(lectura.lecturaActual) : '',
    motivoInaccesible: lectura.motivoInaccesible ?? '',
    descripcionDano: lectura.descripcionDano ?? '',
    confirmacionRevision: lectura.confirmacionRevision,
  };
}

export default function RegistroScreen() {
  const parametros = useLocalSearchParams<{
    codigo?: string | string[];
    editar?: string | string[];
    borrador?: string | string[];
  }>();
  const codigo = normalizarParam(parametros.codigo) ?? '';
  const editarParam = normalizarParam(parametros.editar);
  const borradorParam = normalizarParam(parametros.borrador);
  const router = useRouter();
  const {
    sesion,
    enLinea,
    refrescarEstado,
    recargarBorrador,
    sincronizarAhora,
  } = useApp();
  const enLineaRef = useRef(enLinea);
  useEffect(() => {
    enLineaRef.current = enLinea;
  }, [enLinea]);

  const [medidor, setMedidor] = useState<Medidor | null>(null);
  const [datos, setDatos] = useState<DatosFormulario>({ ...DATOS_FORMULARIO_VACIOS });
  const [paso, setPaso] = useState<PasoRegistro>(1);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [fotoOriginal, setFotoOriginal] = useState<string | null>(null);
  const [editando, setEditando] = useState<Lectura | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftCreadoEn, setDraftCreadoEn] = useState(new Date().toISOString());
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [errorInicial, setErrorInicial] = useState<string | null>(null);
  const [conflicto, setConflicto] = useState<Borrador | null>(null);
  const [procesandoConflicto, setProcesandoConflicto] = useState(false);
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [duplicada, setDuplicada] = useState<Lectura | null>(null);
  const [errorBorrador, setErrorBorrador] = useState<string | null>(null);
  const [fotoCargando, setFotoCargando] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [permisoBloqueado, setPermisoBloqueado] = useState(false);
  const persistenciaRef = useRef<Promise<void>>(Promise.resolve());
  const lecturaObjetivoRef = useRef<Lectura | null>(null);

  useEffect(() => {
    let activo = true;

    async function iniciar() {
      setCargando(true);
      setErrorInicial(null);
      setConflicto(null);
      setListo(false);
      setEditando(null);
      setDuplicada(null);
      setErrorGuardar(null);
      setErrores({});
      setErrorFoto(null);
      setPermisoBloqueado(false);
      setFotoUri(null);
      setFotoOriginal(null);
      setDraftId(null);
      lecturaObjetivoRef.current = null;

      try {
        const validacion = validarCodigoMedidor(codigo);
        if (!validacion.valido) {
          throw new Error(validacion.mensaje ?? 'El código del medidor no es válido.');
        }
        if (!sesion) throw new Error('La sesión no está disponible. Vuelve a iniciar sesión.');

        let medidorLocal = await obtenerMedidor(codigo);
        if (!medidorLocal) {
          const resultado = await consultarMedidor(codigo, enLineaRef.current);
          medidorLocal = resultado.medidor;
        }
        if (!activo) return;
        setMedidor(medidorLocal);

        let lecturaObjetivo: Lectura | null = null;
        if (editarParam) {
          lecturaObjetivo = await obtenerLecturaPorId(editarParam);
          if (!lecturaObjetivo) throw new Error('La lectura que quieres corregir ya no existe.');
          if (lecturaObjetivo.codigoMedidor !== codigo) {
            throw new Error('La lectura no corresponde al medidor indicado.');
          }
          if (lecturaObjetivo.estadoEnvio === 'enviado') {
            throw new Error('Esta lectura ya fue enviada y no se puede modificar.');
          }
          if (!lecturaSePuedeCorregir(lecturaObjetivo.estadoEnvio)) {
            throw new Error('Esta lectura no se puede corregir en este momento.');
          }
          lecturaObjetivoRef.current = lecturaObjetivo;
        }

        if (borradorParam) {
          const borrador = await obtenerBorradorPorId(borradorParam);
          if (!borrador) throw new Error('El borrador ya no existe o fue descartado.');
          if (borrador.codigoMedidor !== codigo) {
            throw new Error('El borrador pertenece a otro medidor.');
          }
          if (borrador.codigoTecnico !== sesion.codigoTecnico) {
            throw new Error('El borrador pertenece a otro técnico.');
          }

          let lecturaBorrador: Lectura | null = null;
          if (borrador.lecturaLocalId) {
            lecturaBorrador = await obtenerLecturaPorId(borrador.lecturaLocalId);
            if (lecturaBorrador && lecturaBorrador.estadoEnvio === 'enviado') {
              throw new Error('La lectura asociada al borrador ya fue enviada.');
            }
          }

          if (!activo) return;
          setDraftId(borrador.localId);
          setDraftCreadoEn(borrador.creadoEn);
          setDatos(borrador.datos);
          setPaso(borrador.paso);
          setFotoUri(borrador.fotoUri);
          setFotoOriginal(lecturaBorrador?.fotoUri ?? borrador.fotoUri);
          setEditando(lecturaBorrador);
          setListo(true);
          setCargando(false);
          return;
        }

        const borradorActivo = await obtenerBorradorDeTecnico(sesion.codigoTecnico);
        if (borradorActivo && borradorActivo.localId !== borradorParam) {
          if (!activo) return;
          setConflicto(borradorActivo);
          setCargando(false);
          return;
        }

        if (lecturaObjetivo) {
          setEditando(lecturaObjetivo);
          setDatos(datosDesdeLectura(lecturaObjetivo));
          setFotoUri(lecturaObjetivo.fotoUri);
          setFotoOriginal(lecturaObjetivo.fotoUri);
          setPaso(1);
          setListo(false);
          setCargando(false);
          return;
        }

        const nuevo = crearBorradorEnMemoria({
          codigoMedidor: medidorLocal.codigo,
          codigoTecnico: sesion.codigoTecnico,
        });
        const guardado = await guardarBorrador(nuevo);
        if (!activo) return;
        setDraftId(guardado.localId);
        setDraftCreadoEn(guardado.creadoEn);
        setDatos(guardado.datos);
        setPaso(1);
        setFotoUri(null);
        setListo(true);
        setCargando(false);
      } catch (fallo) {
        if (!activo) return;
        setErrorInicial(mensajeDeError(fallo));
        setCargando(false);
      }
    }

    void iniciar();
    return () => {
      activo = false;
    };
  }, [borradorParam, codigo, editarParam, sesion]);

  const persistirBorrador = useCallback(
    async (pasoGuardar: PasoRegistro, cambios: Partial<Pick<Borrador, 'fotoUri'>> = {}) => {
      if (!draftId || !sesion || !medidor || editando) return;
      const borrador: Borrador = {
        localId: draftId,
        codigoMedidor: medidor.codigo,
        codigoTecnico: sesion.codigoTecnico,
        paso: pasoGuardar,
        datos,
        fotoUri: cambios.fotoUri !== undefined ? cambios.fotoUri : fotoUri,
        lecturaLocalId: null,
        creadoEn: draftCreadoEn,
        actualizadoEn: new Date().toISOString(),
      };

      const tarea = persistenciaRef.current
        .then(() => guardarBorrador(borrador))
        .then(() => {
          setErrorBorrador(null);
        })
        .catch((fallo) => {
          setErrorBorrador(mensajeDeError(fallo));
        });
      persistenciaRef.current = tarea;
      await tarea;
    },
    [datos, draftCreadoEn, draftId, editando, fotoUri, medidor, sesion],
  );

  useEffect(() => {
    if (!listo || !draftId || editando) return;
    const temporizador = setTimeout(() => {
      void persistirBorrador(paso);
    }, 400);
    return () => clearTimeout(temporizador);
  }, [datos, draftId, editando, fotoUri, listo, paso, persistirBorrador]);

  const lecturaParseada = useMemo(() => {
    if (datos.tipoEstado === 'inaccesible') return null;
    if (datos.lecturaActual.trim().length === 0) return null;
    const resultado = parsearLectura(datos.lecturaActual);
    return resultado.ok ? resultado.valor : null;
  }, [datos.lecturaActual, datos.tipoEstado]);

  const evaluacion = useMemo(
    () =>
      evaluarConsumo(
        lecturaParseada,
        medidor?.ultimaLectura ?? null,
        medidor?.consumoPromedioMensual ?? null,
      ),
    [lecturaParseada, medidor],
  );

  const fotoObligatoria = fotoEsObligatoria(datos.tipoEstado, evaluacion);
  const estadoVerificacion = calcularEstadoVerificacion({
    tipoEstado: datos.tipoEstado,
    lecturaActual: lecturaParseada,
    evaluacion,
    confirmacionRevision: datos.confirmacionRevision,
    fotoUri,
  });

  function cambiarDatos(cambio: Partial<DatosFormulario>) {
    setDatos((actual) => ({ ...actual, ...cambio }));
    setErrores((actual) => {
      if (Object.keys(actual).length === 0) return actual;
      return {};
    });
    setErrorGuardar(null);
    setDuplicada(null);
  }

  async function irAPaso(nuevo: PasoRegistro) {
    await persistirBorrador(nuevo);
    setPaso(nuevo);
    setErrores({});
  }

  async function continuarDesdeDatos() {
    if (!medidor) return;
    const validacion = validarDatosRegistro(datos, medidor);
    if (!validacion.valido) {
      setErrores(validacion.errores);
      return;
    }
    await irAPaso(2);
  }

  async function continuarDesdeFoto() {
    if (!medidor) return;
    const validacion = validarRegistroCompleto(datos, medidor, fotoUri);
    if (!validacion.valido) {
      setErrores(validacion.errores);
      return;
    }
    await irAPaso(3);
  }

  async function tomarFotoMedidor() {
    setErrorFoto(null);
    setPermisoBloqueado(false);
    setFotoCargando(true);
    const anterior = fotoUri;
    try {
      const nueva = await tomarFoto(draftId ?? editando?.localId ?? 'lectura');
      if (!nueva) return;
      setFotoUri(nueva);
      setErrores((actual) => ({ ...actual, foto: undefined }));
      if (draftId) await persistirBorrador(paso, { fotoUri: nueva });
      if (anterior && anterior !== nueva) await eliminarFotoSiHuerfana(anterior);
    } catch (fallo) {
      if (fallo instanceof PermisoCamaraError) {
        setErrorFoto(fallo.message);
        setPermisoBloqueado(!fallo.puedeReintentar);
      } else {
        setErrorFoto(mensajeDeError(fallo));
      }
    } finally {
      setFotoCargando(false);
    }
  }

  async function quitarFoto() {
    const anterior = fotoUri;
    setFotoUri(null);
    setErrores((actual) => ({ ...actual, foto: undefined }));
    if (draftId) await persistirBorrador(paso, { fotoUri: null });
    await eliminarFotoSiHuerfana(anterior);
  }

  async function salir() {
    if (editando) {
      Alert.alert(
        '¿Descartar la corrección?',
        'La lectura original se mantiene sin cambios.',
        [
          { text: 'Seguir editando', style: 'cancel' },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => {
              if (fotoUri && fotoUri !== fotoOriginal) {
                void eliminarFotoSiHuerfana(fotoUri);
              }
              router.back();
            },
          },
        ],
      );
      return;
    }

    setListo(false);
    await persistirBorrador(paso);
    await recargarBorrador();
    router.back();
  }

  async function guardar() {
    if (!medidor || !sesion) return;
    setGuardando(true);
    setErrorGuardar(null);
    setDuplicada(null);
    setListo(false);

    try {
      await persistenciaRef.current;

      if (editando) {
        const actualizada = await corregirLectura({
          lectura: editando,
          medidor,
          datos,
          fotoUri,
        });
        if (fotoOriginal && fotoOriginal !== fotoUri) {
          await eliminarFotoSiHuerfana(fotoOriginal);
        }
        await refrescarEstado();
        router.replace(`/lectura/${actualizada.localId}`);
        void sincronizarAhora();
        return;
      }

      const nueva = await guardarNuevaLectura({
        medidor,
        datos,
        fotoUri,
        codigoTecnico: sesion.codigoTecnico,
        borradorId: draftId,
        periodo: obtenerPeriodo(new Date(draftCreadoEn)),
      });
      await refrescarEstado();
      router.replace(`/lectura/${nueva.localId}`);
      void sincronizarAhora();
    } catch (fallo) {
      if (fallo instanceof LecturaDuplicadaError) {
        setDuplicada(fallo.lectura);
      }
      setErrorGuardar(mensajeDeError(fallo));
      setListo(!editando);
    } finally {
      setGuardando(false);
    }
  }

  async function descartarConflictoYEmpezar() {
    if (!conflicto || !medidor || !sesion) return;
    setProcesandoConflicto(true);
    try {
      await descartarBorrador(conflicto.localId);
      await recargarBorrador();
      setConflicto(null);

      const objetivo = lecturaObjetivoRef.current;
      if (objetivo) {
        setEditando(objetivo);
        setDatos(datosDesdeLectura(objetivo));
        setFotoUri(objetivo.fotoUri);
        setFotoOriginal(objetivo.fotoUri);
        setPaso(1);
        setListo(false);
        return;
      }

      const nuevo = crearBorradorEnMemoria({
        codigoMedidor: medidor.codigo,
        codigoTecnico: sesion.codigoTecnico,
      });
      const guardado = await guardarBorrador(nuevo);
      setDraftId(guardado.localId);
      setDraftCreadoEn(guardado.creadoEn);
      setDatos(guardado.datos);
      setPaso(1);
      setFotoUri(null);
      setListo(true);
    } catch (fallo) {
      setErrorInicial(mensajeDeError(fallo));
    } finally {
      setProcesandoConflicto(false);
    }
  }

  if (cargando) {
    return (
      <AppScreen>
        <AppHeader titulo="Nueva lectura" subtitulo={codigo} onBack={() => router.back()} />
        <View style={estilos.centro}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Texto variante="caption" color={colors.textMuted}>
            Preparando la captura…
          </Texto>
        </View>
      </AppScreen>
    );
  }

  if (errorInicial || !medidor) {
    return (
      <AppScreen>
        <AppHeader titulo="Nueva lectura" subtitulo={codigo} onBack={() => router.back()} />
        <Alerta tono="peligro" titulo="No se pudo iniciar la captura">
          {errorInicial ?? 'No se encontró el medidor.'}
        </Alerta>
        <Boton titulo="Volver" onPress={() => router.back()} variante="secundario" />
      </AppScreen>
    );
  }

  if (conflicto) {
    return (
      <AppScreen>
        <AppHeader
          titulo="Captura pendiente"
          subtitulo="Solo puede existir un borrador activo."
          onBack={() => router.back()}
        />
        <Alerta tono="borrador" titulo="Ya tienes una captura sin terminar">
          La captura del medidor {conflicto.codigoMedidor} está guardada en el paso{' '}
          {conflicto.paso} de 3, actualizada el {formatearFechaHora(conflicto.actualizadoEn)}. Para
          empezar otro registro debes continuarla o descartarla.
        </Alerta>
        <Card estilo={estilos.conflictoCard}>
          <InfoRow etiqueta="Medidor" valor={conflicto.codigoMedidor} icono="barcode-outline" />
          <InfoRow
            etiqueta="Paso guardado"
            valor={`${conflicto.paso} de 3`}
            icono="list-outline"
          />
          <InfoRow
            etiqueta="Última actualización"
            valor={formatearFechaHora(conflicto.actualizadoEn)}
            icono="time-outline"
          />
        </Card>
        <Boton
          titulo="Continuar el borrador"
          onPress={() =>
            router.replace({
              pathname: '/registro/[codigo]',
              params: { codigo: conflicto.codigoMedidor, borrador: conflicto.localId },
            })
          }
          icono="arrow-forward"
        />
        <Boton
          titulo="Descartar y empezar"
          onPress={() => void descartarConflictoYEmpezar()}
          variante="peligro"
          icono="trash-outline"
          cargando={procesandoConflicto}
        />
        <Boton
          titulo="Cancelar"
          onPress={() => router.back()}
          variante="fantasma"
        />
      </AppScreen>
    );
  }

  const anomalia = evaluacion.anomalia;
  const errorPrincipal = primerError(errores);

  return (
    <AppScreen evitarTeclado>
      <AppHeader
        titulo={editando ? 'Corregir lectura' : 'Nueva lectura'}
        subtitulo={medidor.codigo}
        onBack={() => void salir()}
        derecha={
          <Badge
            texto={editando ? 'Corrección' : draftId ? 'Borrador' : 'Nueva'}
            tono={editando ? 'info' : 'borrador'}
            icono={editando ? 'create-outline' : 'document-text-outline'}
          />
        }
      />

      <StepIndicator paso={paso} />

      <Card estilo={estilos.medidorMini}>
        <View style={estilos.medidorIcono}>
          <Ionicons name="speedometer-outline" size={22} color={colors.accentDark} />
        </View>
        <View style={estilos.medidorTextos}>
          <Texto variante="mono" peso="bold" color={colors.brand}>
            {medidor.codigo}
          </Texto>
          <Texto variante="caption" color={colors.textMuted} numberOfLines={1}>
            {medidor.direccion} · {medidor.sector}
          </Texto>
          <Texto variante="micro" color={colors.textSoft}>
            Anterior {formatearMetros(medidor.ultimaLectura)} · Promedio{' '}
            {formatearMetros(medidor.consumoPromedioMensual)}
          </Texto>
        </View>
      </Card>

      {errorBorrador ? (
        <Alerta tono="advertencia" titulo="El borrador no se pudo guardar">
          {errorBorrador}
        </Alerta>
      ) : null}

      {errorPrincipal && paso !== 3 ? (
        <Alerta tono="peligro" titulo="Revisa los datos">
          {errorPrincipal}
        </Alerta>
      ) : null}

      {paso === 1 ? (
        <>
          <View style={estilos.seccion}>
            <SectionTitle
              titulo="¿Qué encontraste?"
              descripcion="El estado define qué datos son obligatorios."
            />
            <View style={estilos.listaOpciones}>
              <ChoiceCard
                titulo="Normal"
                descripcion="Se pudo ver y leer el medidor."
                icono="checkmark-circle-outline"
                seleccionado={datos.tipoEstado === 'normal'}
                onPress={() => cambiarDatos({ tipoEstado: 'normal' })}
                color={colors.success}
                fondo={colors.successSoft}
              />
              <ChoiceCard
                titulo="Inaccesible"
                descripcion="No se pudo llegar al medidor. Se registra el motivo."
                icono="lock-closed-outline"
                seleccionado={datos.tipoEstado === 'inaccesible'}
                onPress={() => cambiarDatos({ tipoEstado: 'inaccesible' })}
                color={colors.warning}
                fondo={colors.warningSoft}
              />
              <ChoiceCard
                titulo="Dañado"
                descripcion="El medidor presenta daños. La foto es obligatoria."
                icono="construct-outline"
                seleccionado={datos.tipoEstado === 'danado'}
                onPress={() => cambiarDatos({ tipoEstado: 'danado' })}
                color={colors.danger}
                fondo={colors.dangerSoft}
              />
            </View>
          </View>

          {datos.tipoEstado === 'inaccesible' ? (
            <>
              <CampoTexto
                etiqueta="Motivo de inaccesibilidad"
                valor={datos.motivoInaccesible}
                onChangeText={(valor) => cambiarDatos({ motivoInaccesible: valor })}
                placeholder="Casa cerrada, portón con candado, no hay acceso…"
                multilinea
                numeroLineas={3}
                maxLength={300}
                error={errores.motivoInaccesible}
                ayuda="No se registra una lectura cuando el medidor es inaccesible."
              />
              <Alerta tono="info">
                El registro quedará pendiente de verificación y se enviará con el motivo, sin
                lectura actual.
              </Alerta>
            </>
          ) : null}

          {datos.tipoEstado === 'danado' ? (
            <>
              <CampoTexto
                etiqueta="Descripción del daño"
                valor={datos.descripcionDano}
                onChangeText={(valor) => cambiarDatos({ descripcionDano: valor })}
                placeholder="Tapa rota, vidrio empañado, fuga visible…"
                multilinea
                numeroLineas={3}
                maxLength={500}
                error={errores.descripcionDano}
              />
              <CampoTexto
                etiqueta="Lectura actual (opcional)"
                valor={datos.lecturaActual}
                onChangeText={(valor) => cambiarDatos({ lecturaActual: valor })}
                placeholder="Si el visor permite leer, escríbela aquí"
                keyboardType="decimal-pad"
                sufijo="m³"
                error={errores.lecturaActual}
                ayuda="La lectura es opcional cuando el medidor está dañado."
              />
            </>
          ) : null}

          {datos.tipoEstado === 'normal' ? (
            <CampoTexto
              etiqueta="Lectura actual"
              valor={datos.lecturaActual}
              onChangeText={(valor) => cambiarDatos({ lecturaActual: valor })}
              placeholder="Ejemplo: 160"
              keyboardType="decimal-pad"
              sufijo="m³"
              error={errores.lecturaActual}
              ayuda="Usa coma o punto para los decimales. No puede ser menor que la lectura anterior."
            />
          ) : null}

          <Card
            estilo={[
              estilos.consumoCard,
              anomalia && estilos.consumoAnomalia,
              !evaluacion.evaluable && estilos.consumoPendiente,
            ]}
          >
            <View style={estilos.consumoFila}>
              <Ionicons
                name={anomalia ? 'warning' : evaluacion.evaluable ? 'analytics' : 'time-outline'}
                size={20}
                color={anomalia ? colors.danger : evaluacion.evaluable ? colors.success : colors.warning}
              />
              <Texto variante="cuerpoFuerte" style={estilos.consumoTexto}>
                {evaluacion.consumo != null
                  ? `Consumo calculado: ${formatearMetros(evaluacion.consumo)}`
                  : 'Consumo aún no calculable'}
              </Texto>
            </View>
            {evaluacion.evaluable ? (
              <Texto variante="caption" color={anomalia ? colors.danger : colors.textMuted}>
                Lectura anterior {formatearMetros(medidor.ultimaLectura)} · Límite de anomalía{' '}
                {formatearMetros(evaluacion.umbral)} (triple del promedio).
                {anomalia
                  ? ' El consumo supera el límite: deberás confirmar la revisión y adjuntar una foto.'
                  : ' El consumo está dentro del rango esperado.'}
              </Texto>
            ) : (
              <Texto variante="caption" color={colors.textMuted}>
                {evaluacion.motivo === 'sin_anterior'
                  ? 'No hay lectura anterior en los datos del medidor. La verificación quedará pendiente y se completará al sincronizar.'
                  : evaluacion.motivo === 'sin_promedio'
                    ? 'No hay consumo promedio mensual. La verificación quedará pendiente hasta contrastar con la oficina.'
                    : evaluacion.motivo === 'sin_lectura'
                      ? 'Este estado no registra una lectura actual, por lo que no hay consumo que calcular.'
                      : 'Escribe una lectura válida para calcular el consumo.'}
              </Texto>
            )}
          </Card>

          <Boton
            titulo="Continuar a la foto"
            onPress={() => void continuarDesdeDatos()}
            icono="arrow-forward"
            iconoDerecha="camera-outline"
          />
          <Texto variante="micro" color={colors.textMuted} centrado>
            La captura se guarda automáticamente. Puedes salir y continuar después.
          </Texto>
        </>
      ) : null}

      {paso === 2 ? (
        <>
          {anomalia ? (
            <Alerta tono="peligro" titulo="Consumo superior al triple del promedio">
              La lectura produce un consumo de {formatearMetros(evaluacion.consumo)}, mayor que el
              límite de {formatearMetros(evaluacion.umbral)}. Confirma que revisaste el medidor y
              adjunta una foto antes de continuar.
            </Alerta>
          ) : null}

          <Card estilo={estilos.fotoCard}>
            <FotoMedidor
              uri={fotoUri}
              obligatoria={fotoObligatoria}
              motivo={
                datos.tipoEstado === 'danado'
                  ? 'La foto es obligatoria porque el medidor está dañado.'
                  : anomalia
                    ? 'La foto es obligatoria porque el consumo supera el triple del promedio.'
                    : 'La foto es opcional para este registro. Puedes adjuntarla como respaldo.'
              }
              onTomar={() => void tomarFotoMedidor()}
              onQuitar={() => void quitarFoto()}
              cargando={fotoCargando}
              error={errorFoto ?? errores.foto}
            />
            {permisoBloqueado ? (
              <Boton
                titulo="Abrir ajustes del teléfono"
                onPress={() => void Linking.openSettings()}
                variante="secundario"
                icono="settings-outline"
              />
            ) : null}
          </Card>

          {fotoObligatoria ? (
            <Alerta tono="advertencia" titulo="Foto obligatoria">
              Sin la foto no se puede guardar este registro. Si no diste permiso a la cámara, la
              app te explica cómo habilitarlo en los ajustes.
            </Alerta>
          ) : (
            <Alerta tono="info" titulo="La foto es opcional aquí">
              Puedes continuar sin foto. Si la cámara está bloqueada, el registro sigue siendo
              válido porque no hay anomalía ni daño.
            </Alerta>
          )}

          {anomalia ? (
            <Pressable
              onPress={() =>
                cambiarDatos({ confirmacionRevision: !datos.confirmacionRevision })
              }
              accessibilityRole="checkbox"
              accessibilityState={{ checked: datos.confirmacionRevision }}
              accessibilityLabel="Confirmo que revisé el medidor de agua"
              style={({ pressed }) => [
                estilos.checkboxFila,
                datos.confirmacionRevision && estilos.checkboxFilaActiva,
                pressed && estilos.checkboxPresionada,
              ]}
            >
              <View
                style={[
                  estilos.checkbox,
                  datos.confirmacionRevision && estilos.checkboxMarcado,
                ]}
              >
                {datos.confirmacionRevision ? (
                  <Ionicons name="checkmark" size={17} color={colors.white} />
                ) : null}
              </View>
              <View style={estilos.checkboxTextos}>
                <Texto variante="cuerpoFuerte">Confirmo que revisé el medidor de agua</Texto>
                <Texto variante="caption" color={colors.textMuted}>
                  Esta confirmación queda asociada a la lectura junto con la foto.
                </Texto>
              </View>
            </Pressable>
          ) : null}

          {errores.confirmacion ? (
            <Alerta tono="peligro">{errores.confirmacion}</Alerta>
          ) : null}

          <View style={estilos.filaBotones}>
            <Boton
              titulo="Atrás"
              onPress={() => void irAPaso(1)}
              variante="secundario"
              icono="arrow-back"
              anchoCompleto={false}
              estilo={estilos.botonMitad}
            />
            <Boton
              titulo="Revisar resumen"
              onPress={() => void continuarDesdeFoto()}
              icono="arrow-forward"
              anchoCompleto={false}
              estilo={estilos.botonMitad}
            />
          </View>
        </>
      ) : null}

      {paso === 3 ? (
        <>
          <SectionTitle
            titulo="Revisa antes de guardar"
            descripcion="La lectura quedará pendiente de envío y podrás corregirla hasta que la oficina la confirme."
          />

          {anomalia ? (
            <Alerta tono="exito" titulo="Anomalía revisada">
              Confirmaste la revisión y adjuntaste la foto. El registro podrá enviarse con el estado
              de anomalía confirmada.
            </Alerta>
          ) : null}

          <Card estilo={estilos.resumenCard}>
            <InfoRow
              etiqueta="Medidor"
              valor={medidor.codigo}
              icono="barcode-outline"
            />
            <InfoRow
              etiqueta="Estado encontrado"
              valor={
                datos.tipoEstado === 'normal'
                  ? 'Normal'
                  : datos.tipoEstado === 'inaccesible'
                    ? 'Inaccesible'
                    : 'Dañado'
              }
              icono="pulse-outline"
            />
            <InfoRow
              etiqueta="Lectura actual"
              valor={lecturaParseada != null ? formatearMetros(lecturaParseada) : 'Sin lectura'}
              icono="water-outline"
            />
            <InfoRow
              etiqueta="Lectura anterior"
              valor={formatearMetros(medidor.ultimaLectura)}
              icono="time-outline"
            />
            <InfoRow
              etiqueta="Consumo calculado"
              valor={formatearMetros(evaluacion.consumo)}
              color={anomalia ? colors.danger : colors.text}
              icono="analytics-outline"
            />
            <InfoRow
              etiqueta="Promedio mensual"
              valor={formatearMetros(medidor.consumoPromedioMensual)}
              icono="stats-chart-outline"
            />
            <InfoRow
              etiqueta="Verificación"
              valor={
                estadoVerificacion === 'verificada'
                  ? 'Verificada'
                  : estadoVerificacion === 'pendiente'
                    ? 'Pendiente'
                    : estadoVerificacion === 'anomalia_confirmada'
                      ? 'Anomalía confirmada'
                      : estadoVerificacion === 'anomalia_pendiente'
                        ? 'Anomalía por confirmar'
                        : 'No aplica'
              }
              icono="shield-checkmark-outline"
            />
            <InfoRow
              etiqueta="Periodo"
              valor={obtenerPeriodo(new Date(editando?.periodo ?? draftCreadoEn))}
              icono="calendar-outline"
            />
          </Card>

          {datos.tipoEstado === 'inaccesible' ? (
            <Card estilo={estilos.textoResumen}>
              <Texto variante="etiqueta" color={colors.textMuted}>
                Motivo de inaccesibilidad
              </Texto>
              <Texto variante="cuerpo">{datos.motivoInaccesible.trim()}</Texto>
            </Card>
          ) : null}

          {datos.tipoEstado === 'danado' ? (
            <Card estilo={estilos.textoResumen}>
              <Texto variante="etiqueta" color={colors.textMuted}>
                Descripción del daño
              </Texto>
              <Texto variante="cuerpo">{datos.descripcionDano.trim()}</Texto>
            </Card>
          ) : null}

          <Card estilo={estilos.fotoResumen}>
            <View style={estilos.fotoResumenCabecera}>
              <Texto variante="cuerpoFuerte">Foto del medidor</Texto>
              <Badge
                texto={fotoUri ? 'Adjunta' : fotoObligatoria ? 'Falta' : 'Sin foto'}
                tono={fotoUri ? 'exito' : fotoObligatoria ? 'peligro' : 'neutral'}
                icono={fotoUri ? 'checkmark-circle' : 'camera-outline'}
              />
            </View>
            {fotoUri ? (
              <Image source={{ uri: fotoUri }} style={estilos.fotoMini} contentFit="cover" />
            ) : (
              <Texto variante="caption" color={colors.textMuted}>
                No se adjuntó una foto. En este registro no es obligatoria.
              </Texto>
            )}
          </Card>

          {errorGuardar ? (
            <Alerta tono="peligro" titulo="No se pudo guardar la lectura">
              {errorGuardar}
              {duplicada ? (
                <View style={estilos.accionDuplicada}>
                  <Boton
                    titulo="Abrir la lectura existente"
                    onPress={() => router.replace(`/lectura/${duplicada.localId}`)}
                    variante="secundario"
                    icono="document-text-outline"
                  />
                </View>
              ) : null}
            </Alerta>
          ) : null}

          <View style={estilos.filaBotones}>
            <Boton
              titulo="Atrás"
              onPress={() => void irAPaso(2)}
              variante="secundario"
              icono="arrow-back"
              anchoCompleto={false}
              estilo={estilos.botonMitad}
              deshabilitado={guardando}
            />
            <Boton
              titulo={editando ? 'Guardar corrección' : 'Guardar lectura'}
              onPress={() => void guardar()}
              icono="save-outline"
              cargando={guardando}
              anchoCompleto={false}
              estilo={estilos.botonMitad}
            />
          </View>

          <Boton
            titulo="Guardar borrador y salir"
            onPress={() => void salir()}
            variante="fantasma"
            icono="exit-outline"
            deshabilitado={guardando}
          />
        </>
      ) : null}
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
  medidorMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  medidorIcono: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceBrand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medidorTextos: {
    flex: 1,
    gap: 1,
  },
  seccion: {
    gap: spacing.md,
  },
  listaOpciones: {
    gap: spacing.sm,
  },
  consumoCard: {
    gap: spacing.xs,
    borderLeftWidth: 4,
    borderLeftColor: colors.borderStrong,
    padding: spacing.md,
  },
  consumoAnomalia: {
    borderLeftColor: colors.danger,
    backgroundColor: '#FFFBFB',
  },
  consumoPendiente: {
    borderLeftColor: colors.warning,
    backgroundColor: '#FFFDF7',
  },
  consumoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  consumoTexto: {
    flex: 1,
  },
  fotoCard: {
    gap: spacing.md,
  },
  checkboxFila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  checkboxFilaActiva: {
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  checkboxPresionada: {
    opacity: 0.85,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxMarcado: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkboxTextos: {
    flex: 1,
    gap: 2,
  },
  filaBotones: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  botonMitad: {
    flex: 1,
  },
  resumenCard: {
    paddingVertical: spacing.sm,
  },
  textoResumen: {
    gap: spacing.xs,
  },
  fotoResumen: {
    gap: spacing.sm,
  },
  fotoResumenCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  fotoMini: {
    width: '100%',
    height: 170,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  accionDuplicada: {
    marginTop: spacing.sm,
  },
  conflictoCard: {
    paddingVertical: spacing.sm,
  },
});
