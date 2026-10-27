import type { LecturaRemota, MedidorRemoto, TipoEstadoLectura } from '../types/models';
import { TIPOS_ESTADO } from '../types/models';
import { esCodigoMedidorValido } from '../utils/validators';
import { ApiError } from './errors';

type Crudo = Record<string, unknown>;

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

function idRequerido(objeto: Crudo, contexto: string): string {
  const valor = objeto.id;
  if (typeof valor === 'string' && valor.trim().length > 0) return valor.trim();
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

  return {
    id: idRequerido(objeto, contexto),
    codigo,
    direccion: textoRequerido(objeto, 'direccion', contexto),
    sector: textoRequerido(objeto, 'sector', contexto),
    numeroCuenta: textoRequerido(objeto, 'numeroCuenta', contexto),
    estado: textoRequerido(objeto, 'estado', contexto),
    ultimaLectura: numeroOpcional(objeto, 'ultimaLectura', contexto),
    fechaUltimaLectura: textoOpcional(objeto, 'fechaUltimaLectura'),
    consumoPromedioMensual: numeroOpcional(objeto, 'consumoPromedioMensual', contexto),
  };
}

export function parsearLecturaRemota(valor: unknown): LecturaRemota {
  const contexto = 'una lectura';
  const objeto = comoObjeto(valor, contexto);
  const codigoMedidor = textoRequerido(objeto, 'codigoMedidor', contexto);

  if (!esCodigoMedidorValido(codigoMedidor)) {
    throw new ApiError('respuesta', `La lectura remota tiene un código de medidor inválido.`);
  }

  return {
    id: idRequerido(objeto, contexto),
    localId: textoRequerido(objeto, 'localId', contexto),
    medidorId: textoOpcional(objeto, 'medidorId'),
    codigoMedidor,
    codigoTecnico: textoOpcional(objeto, 'codigoTecnico'),
    fechaRegistro: textoOpcional(objeto, 'fechaRegistro'),
    periodo: textoRequerido(objeto, 'periodo', contexto),
    tipoEstado: tipoEstadoValido(objeto, contexto),
    lecturaActual: numeroOpcional(objeto, 'lecturaActual', contexto),
    estadoVerificacion: textoOpcional(objeto, 'estadoVerificacion'),
  };
}

export function parsearLista<T>(datos: unknown, parser: (valor: unknown) => T): T[] {
  if (datos == null) return [];
  if (Array.isArray(datos)) return datos.map(parser);
  if (typeof datos === 'object') return [parser(datos)];
  throw new ApiError('respuesta', 'Se esperaba una lista de datos del sistema de oficina.');
}
