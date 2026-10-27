import type { LecturaRemota, MedidorRemoto, TipoEstadoLectura } from '../types/models';
import { ESTADOS_VERIFICACION, TIPOS_ESTADO } from '../types/models';
import {
  hoyISO,
  normalizarFechaDia,
  normalizarFechaHora,
  sumarDias,
  validarFechaDia,
  validarFechaHoraISO,
} from '../utils/fechas';
import { esPeriodoValido } from '../utils/periodo';
import {
  esEstadoMedidorValido,
  parsearNumeroRango,
  RANGO_LECTURA,
  RANGO_PROMEDIO,
  validarDireccion,
  validarNumeroCuenta,
  validarSector,
  type OpcionesNumero,
} from '../utils/validacionesEntidades';
import { esCodigoMedidorValido } from '../utils/validators';
import { ApiError } from './errors';

type Crudo = Record<string, unknown>;

const MAX_ID = 40;
const MAX_LOCAL_ID = 100;
const MAX_CODIGO_TECNICO = 20;

function comoObjeto(valor: unknown, contexto: string): Crudo {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    throw new ApiError('respuesta', `La respuesta de ${contexto} no tiene el formato esperado.`);
  }
  return valor as Crudo;
}

function textoRequerido(objeto: Crudo, clave: string, contexto: string): string {
  const valor = objeto[clave];
  if (typeof valor !== 'string' || valor.trim().length === 0) {
    throw new ApiError(
      'respuesta',
      `La respuesta de ${contexto} no incluye el campo obligatorio "${clave}".`,
    );
  }
  return valor.trim();
}

function textoOpcional(objeto: Crudo, clave: string): string | null {
  const valor = objeto[clave];
  if (valor == null) return null;
  if (typeof valor === 'string') return valor.trim().length > 0 ? valor.trim() : null;
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  return null;
}

function numeroOpcional(objeto: Crudo, clave: string, contexto: string): number | null {
  const valor = objeto[clave];
  if (valor == null || valor === '') return null;
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor === 'string') {
    const numero = Number(valor.replace(',', '.'));
    if (Number.isFinite(numero)) return numero;
  }
  throw new ApiError(
    'respuesta',
    `La respuesta de ${contexto} tiene un valor no numérico en "${clave}".`,
  );
}

function numeroEnRango(
  objeto: Crudo,
  clave: string,
  contexto: string,
  opciones: OpcionesNumero,
): number | null {
  const valor = numeroOpcional(objeto, clave, contexto);
  if (valor == null) return null;
  const resultado = parsearNumeroRango(String(valor), opciones);
  if (!resultado.ok) {
    throw new ApiError(
      'respuesta',
      `La respuesta de ${contexto} tiene un valor fuera de rango en "${clave}": ${resultado.mensaje}`,
    );
  }
  return resultado.valor;
}

function idRequerido(objeto: Crudo, contexto: string): string {
  const valor = objeto.id;
  if (typeof valor === 'string' && valor.trim().length > 0 && valor.trim().length <= MAX_ID) {
    return valor.trim();
  }
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  throw new ApiError('respuesta', `La respuesta de ${contexto} no incluye un id válido.`);
}

function tipoEstadoValido(objeto: Crudo, contexto: string): TipoEstadoLectura {
  const valor = textoRequerido(objeto, 'tipoEstado', contexto);
  if ((TIPOS_ESTADO as readonly string[]).includes(valor)) {
    return valor as TipoEstadoLectura;
  }
  throw new ApiError('respuesta', `La respuesta de ${contexto} tiene un tipoEstado desconocido.`);
}

function estadoVerificacionValido(objeto: Crudo, contexto: string): string | null {
  const valor = textoOpcional(objeto, 'estadoVerificacion');
  if (valor == null) return null;
  if ((ESTADOS_VERIFICACION as readonly string[]).includes(valor)) return valor;
  throw new ApiError(
    'respuesta',
    `La respuesta de ${contexto} tiene un estadoVerificacion desconocido.`,
  );
}

function fechaDiaOpcional(
  objeto: Crudo,
  clave: string,
  contexto: string,
  requerida = false,
): string | null {
  const crudo = textoOpcional(objeto, clave);
  const resultado = validarFechaDia(crudo, {
    etiqueta: `El campo "${clave}" de ${contexto}`,
    requerida,
    max: hoyISO(),
  });
  if (!resultado.ok) {
    throw new ApiError('respuesta', resultado.mensaje ?? `La fecha de ${contexto} no es válida.`);
  }
  return normalizarFechaDia(resultado.valor);
}

function fechaHoraOpcional(
  objeto: Crudo,
  clave: string,
  contexto: string,
  requerida = false,
): string | null {
  const crudo = textoOpcional(objeto, clave);
  const resultado = validarFechaHoraISO(crudo, {
    etiqueta: `El campo "${clave}" de ${contexto}`,
    requerida,
    // Un pequeño margen absorbe diferencias de zona horaria en el servidor.
    max: sumarDias(hoyISO(), 1),
  });
  if (!resultado.ok) {
    throw new ApiError('respuesta', resultado.mensaje ?? `La fecha de ${contexto} no es válida.`);
  }
  return normalizarFechaHora(resultado.valor);
}

export function parsearMedidorRemoto(valor: unknown): MedidorRemoto {
  const contexto = 'un medidor';
  const objeto = comoObjeto(valor, contexto);
  const codigo = textoRequerido(objeto, 'codigo', contexto);

  if (!esCodigoMedidorValido(codigo)) {
    throw new ApiError(
      'respuesta',
      `El medidor "${codigo}" no cumple el formato MED- seguido de seis dígitos.`,
    );
  }

  const direccion = textoRequerido(objeto, 'direccion', contexto);
  const sector = textoRequerido(objeto, 'sector', contexto);
  const numeroCuenta = textoRequerido(objeto, 'numeroCuenta', contexto);
  const estado = textoRequerido(objeto, 'estado', contexto);

  const errorDireccion = validarDireccion(direccion);
  if (errorDireccion) throw new ApiError('respuesta', errorDireccion);
  const errorSector = validarSector(sector);
  if (errorSector) throw new ApiError('respuesta', errorSector);
  const errorCuenta = validarNumeroCuenta(numeroCuenta);
  if (errorCuenta) throw new ApiError('respuesta', errorCuenta);
  if (!esEstadoMedidorValido(estado)) {
    throw new ApiError(
      'respuesta',
      `El medidor "${codigo}" tiene un estado desconocido: "${estado}".`,
    );
  }

  return {
    id: idRequerido(objeto, contexto),
    codigo,
    direccion,
    sector,
    numeroCuenta,
    estado,
    ultimaLectura: numeroEnRango(objeto, 'ultimaLectura', contexto, {
      etiqueta: 'La última lectura',
      ...RANGO_LECTURA,
    }),
    fechaUltimaLectura: fechaDiaOpcional(objeto, 'fechaUltimaLectura', contexto),
    consumoPromedioMensual: numeroEnRango(objeto, 'consumoPromedioMensual', contexto, {
      etiqueta: 'El consumo promedio mensual',
      ...RANGO_PROMEDIO,
    }),
  };
}

export function parsearLecturaRemota(valor: unknown): LecturaRemota {
  const contexto = 'una lectura';
  const objeto = comoObjeto(valor, contexto);
  const codigoMedidor = textoRequerido(objeto, 'codigoMedidor', contexto);

  if (!esCodigoMedidorValido(codigoMedidor)) {
    throw new ApiError('respuesta', 'La lectura remota tiene un código de medidor inválido.');
  }

  const localId = textoRequerido(objeto, 'localId', contexto);
  if (localId.length > MAX_LOCAL_ID || !/^[A-Za-z0-9_-]+$/.test(localId)) {
    throw new ApiError(
      'respuesta',
      'La lectura remota tiene un localId inválido (máximo 100 caracteres alfanuméricos, guion o guion bajo).',
    );
  }

  const periodo = textoRequerido(objeto, 'periodo', contexto);
  if (!esPeriodoValido(periodo)) {
    throw new ApiError(
      'respuesta',
      `La lectura remota tiene un periodo inválido: "${periodo}". Usa el formato AAAA-MM.`,
    );
  }

  const codigoTecnico = textoOpcional(objeto, 'codigoTecnico');
  if (
    codigoTecnico &&
    (codigoTecnico.length > MAX_CODIGO_TECNICO || !/^TEC-[A-Z0-9-]+$/.test(codigoTecnico))
  ) {
    throw new ApiError('respuesta', 'La lectura remota tiene un código de técnico inválido.');
  }

  const medidorId = textoOpcional(objeto, 'medidorId');
  if (medidorId && medidorId.length > MAX_ID) {
    throw new ApiError('respuesta', 'La lectura remota tiene un medidorId inválido.');
  }

  const tipoEstado = tipoEstadoValido(objeto, contexto);
  const lecturaActual = numeroEnRango(objeto, 'lecturaActual', contexto, {
    etiqueta: 'La lectura actual',
    ...RANGO_LECTURA,
  });
  if (tipoEstado === 'normal' && lecturaActual == null) {
    throw new ApiError(
      'respuesta',
      'La lectura remota con tipoEstado "normal" debe incluir lecturaActual.',
    );
  }

  return {
    id: idRequerido(objeto, contexto),
    localId,
    medidorId,
    codigoMedidor,
    codigoTecnico,
    fechaRegistro: fechaHoraOpcional(objeto, 'fechaRegistro', contexto),
    periodo,
    tipoEstado,
    lecturaActual,
    estadoVerificacion: estadoVerificacionValido(objeto, contexto),
  };
}

export function parsearLista<T>(datos: unknown, parser: (valor: unknown) => T): T[] {
  if (datos == null) return [];
  if (Array.isArray(datos)) return datos.map(parser);
  if (typeof datos === 'object') return [parser(datos)];
  throw new ApiError('respuesta', 'Se esperaba una lista de datos del sistema de oficina.');
}
