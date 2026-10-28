import type { DatosFormulario, Lectura, Medidor, ResumenLecturas } from '../types/models';
import {
  actualizarLecturaEditada,
  guardarLecturaYDescartarBorrador,
  listarLecturas,
  listarUltimasLecturas,
  obtenerLectura,
  obtenerLecturaPorMedidorPeriodo,
  obtenerResumenLecturas,
  reencolarLecturaParaReintento,
} from '../storage/lecturasRepository';
import {
  fechaHoraDesdeDia,
  fechaLocalISO,
  hoyISO,
  periodoDeFecha,
} from '../utils/fechas';
import { generarLocalId } from '../utils/id';
import { obtenerPeriodo } from '../utils/periodo';
import { primerError, validarRegistroCompleto } from '../utils/validators';
import { calcularEstadoVerificacion, lecturaSePuedeCorregir } from '../utils/verificacion';
import { LecturaDuplicadaError, ReglaNegocioError } from './errors';

export interface ParametrosNuevaLectura {
  medidor: Medidor;
  datos: DatosFormulario;
  fotoUri: string | null;
  codigoTecnico: string;
  borradorId: string | null;
  periodo?: string;
}

export interface ParametrosEdicionLectura {
  lectura: Lectura;
  medidor: Medidor;
  datos: DatosFormulario;
  fotoUri: string | null;
}

function esErrorDeUnicidad(error: unknown): boolean {
  return (
    error instanceof Error &&
    /UNIQUE constraint failed: lecturas\.codigo_medidor, lecturas\.periodo/i.test(error.message)
  );
}

function limpiarTexto(valor: string): string | null {
  const limpio = valor.trim();
  return limpio.length > 0 ? limpio : null;
}

/**
 * R10: la restricción UNIQUE(codigo_medidor, periodo) vive en SQLite.
 * Esta comprobación previa sirve para dar un mensaje claro y enlazar
 * a la lectura existente; la base sigue siendo la última defensa.
 */
export async function guardarNuevaLectura(
  parametros: ParametrosNuevaLectura,
): Promise<Lectura> {
  const { medidor, datos, fotoUri, codigoTecnico, borradorId } = parametros;
  const validacion = validarRegistroCompleto(datos, medidor, fotoUri);

  if (!validacion.valido) {
    throw new ReglaNegocioError(
      'VALIDACION',
      primerError(validacion.errores) ?? 'Revisa los datos de la lectura.',
      validacion.errores,
    );
  }

  const diaRegistro = datos.fechaRegistro?.trim() || fechaLocalISO();
  const periodo =
    periodoDeFecha(diaRegistro) ?? parametros.periodo ?? obtenerPeriodo();
  const existente = await obtenerLecturaPorMedidorPeriodo(medidor.codigo, periodo);
  if (existente) {
    throw new LecturaDuplicadaError(
      existente,
      `Ya registraste ${medidor.codigo} en el periodo ${periodo}. Cada medidor admite una lectura por mes.`,
    );
  }

  const ahora = new Date().toISOString();
  // El selector solo elige el día. Si es hoy conservamos la hora real de
  // captura; para fechas pasadas usamos el mediodía local como instante
  // estable, sin desplazar el día por zona horaria.
  const fechaRegistro =
    diaRegistro === hoyISO() ? ahora : (fechaHoraDesdeDia(diaRegistro) ?? ahora);
  const estadoVerificacion = calcularEstadoVerificacion({
    tipoEstado: datos.tipoEstado,
    lecturaActual: validacion.lectura,
    evaluacion: validacion.evaluacion,
    confirmacionRevision: datos.confirmacionRevision,
    fotoUri,
  });

  const lectura: Lectura = {
    localId: generarLocalId(),
    idRemoto: null,
    codigoMedidor: medidor.codigo,
    medidorId: medidor.idRemoto,
    codigoTecnico,
    fechaRegistro,
    periodo,
    tipoEstado: datos.tipoEstado,
    lecturaActual: validacion.lectura,
    ultimaLecturaReferencia: medidor.ultimaLectura,
    consumoCalculado: validacion.evaluacion.consumo,
    consumoPromedioReferencia: medidor.consumoPromedioMensual,
    motivoInaccesible:
      datos.tipoEstado === 'inaccesible' ? limpiarTexto(datos.motivoInaccesible) : null,
    descripcionDano: datos.tipoEstado === 'danado' ? limpiarTexto(datos.descripcionDano) : null,
    fotoUri,
    fotoUrl: null,
    confirmacionRevision: datos.confirmacionRevision,
    estadoVerificacion,
    estadoEnvio: 'pendiente',
    intentosEnvio: 0,
    fechaEnvio: null,
    mensajeError: null,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  try {
    await guardarLecturaYDescartarBorrador(lectura, borradorId);
  } catch (error) {
    if (esErrorDeUnicidad(error)) {
      const duplicada = await obtenerLecturaPorMedidorPeriodo(medidor.codigo, periodo);
      if (duplicada) throw new LecturaDuplicadaError(duplicada);
    }
    throw error;
  }

  return lectura;
}

export async function corregirLectura(
  parametros: ParametrosEdicionLectura,
): Promise<Lectura> {
  const { lectura, medidor, datos, fotoUri } = parametros;

  if (lectura.estadoEnvio === 'enviado') {
    throw new ReglaNegocioError(
      'LECTURA_ENVIADA',
      'Esta lectura ya fue confirmada por el sistema de oficina y no se puede modificar.',
    );
  }

  if (lectura.estadoEnvio === 'enviando') {
    throw new ReglaNegocioError(
      'LECTURA_ENVIANDO',
      'La lectura se está enviando. Espera unos segundos e inténtalo otra vez.',
    );
  }

  if (!lecturaSePuedeCorregir(lectura.estadoEnvio)) {
    throw new ReglaNegocioError(
      'LECTURA_ENVIADA',
      'Esta lectura ya no se puede corregir porque salió de la cola de envío.',
    );
  }

  const validacion = validarRegistroCompleto(datos, medidor, fotoUri, { validarFecha: false });
  if (!validacion.valido) {
    throw new ReglaNegocioError(
      'VALIDACION',
      primerError(validacion.errores) ?? 'Revisa los datos de la lectura.',
      validacion.errores,
    );
  }

  const ahora = new Date().toISOString();
  const estadoVerificacion = calcularEstadoVerificacion({
    tipoEstado: datos.tipoEstado,
    lecturaActual: validacion.lectura,
    evaluacion: validacion.evaluacion,
    confirmacionRevision: datos.confirmacionRevision,
    fotoUri,
  });

  const actualizada: Lectura = {
    ...lectura,
    medidorId: medidor.idRemoto ?? lectura.medidorId,
    tipoEstado: datos.tipoEstado,
    lecturaActual: validacion.lectura,
    ultimaLecturaReferencia: medidor.ultimaLectura,
    consumoCalculado: validacion.evaluacion.consumo,
    consumoPromedioReferencia: medidor.consumoPromedioMensual,
    motivoInaccesible:
      datos.tipoEstado === 'inaccesible' ? limpiarTexto(datos.motivoInaccesible) : null,
    descripcionDano: datos.tipoEstado === 'danado' ? limpiarTexto(datos.descripcionDano) : null,
    fotoUri,
    confirmacionRevision: datos.confirmacionRevision,
    estadoVerificacion,
    estadoEnvio: 'pendiente',
    intentosEnvio: 0,
    fechaEnvio: null,
    mensajeError: null,
    actualizadoEn: ahora,
  };

  await actualizarLecturaEditada(actualizada);
  return actualizada;
}

export async function obtenerLecturaPorId(localId: string): Promise<Lectura | null> {
  return obtenerLectura(localId);
}

export async function prepararReintentoLectura(localId: string): Promise<void> {
  await reencolarLecturaParaReintento(localId);
}

export async function obtenerLecturaDelPeriodo(
  codigoMedidor: string,
  periodo: string,
): Promise<Lectura | null> {
  return obtenerLecturaPorMedidorPeriodo(codigoMedidor, periodo);
}

export async function listarLecturasDelTecnico(
  codigoTecnico: string,
  filtro: 'todas' | 'pendientes' | 'enviadas' = 'todas',
): Promise<Lectura[]> {
  return listarLecturas(codigoTecnico, filtro);
}

export async function listarActividadReciente(
  codigoTecnico: string,
  limite = 3,
): Promise<Lectura[]> {
  return listarUltimasLecturas(codigoTecnico, limite);
}

export async function resumenDeLecturas(codigoTecnico: string): Promise<ResumenLecturas> {
  return obtenerResumenLecturas(codigoTecnico);
}
