import type { EstadoMedidor } from './validacionesEntidades';
import type { Lectura } from '../types/models';

/**
 * Contrato exacto con MockAPI. El seed de `mock-api/seed.json` es la fuente
 * de verdad: no se agregan campos de apoyo local (foto, motivo, consumo
 * calculado) al cuerpo remoto.
 */
export const CAMPOS_MEDIDOR_REMOTO = [
  'codigo',
  'direccion',
  'sector',
  'numeroCuenta',
  'estado',
  'ultimaLectura',
  'fechaUltimaLectura',
  'consumoPromedioMensual',
] as const;

export const CAMPOS_LECTURA_REMOTA = [
  'localId',
  'medidorId',
  'codigoMedidor',
  'codigoTecnico',
  'fechaRegistro',
  'periodo',
  'tipoEstado',
  'lecturaActual',
  'estadoVerificacion',
] as const;

export interface CuerpoMedidor {
  codigo: string;
  direccion: string;
  sector: string;
  numeroCuenta: string;
  estado: EstadoMedidor;
  ultimaLectura: number | null;
  fechaUltimaLectura: string | null;
  consumoPromedioMensual: number | null;
}

export function cuerpoMedidorRemoto(cambios: CuerpoMedidor): Record<string, unknown> {
  return {
    codigo: cambios.codigo,
    direccion: cambios.direccion,
    sector: cambios.sector,
    numeroCuenta: cambios.numeroCuenta,
    estado: cambios.estado,
    ultimaLectura: cambios.ultimaLectura,
    fechaUltimaLectura: cambios.fechaUltimaLectura,
    consumoPromedioMensual: cambios.consumoPromedioMensual,
  };
}

export function cuerpoLecturaRemota(lectura: Lectura): Record<string, unknown> {
  return {
    localId: lectura.localId,
    medidorId: lectura.medidorId,
    codigoMedidor: lectura.codigoMedidor,
    codigoTecnico: lectura.codigoTecnico,
    fechaRegistro: lectura.fechaRegistro,
    periodo: lectura.periodo,
    tipoEstado: lectura.tipoEstado,
    lecturaActual: lectura.lecturaActual,
    estadoVerificacion: lectura.estadoVerificacion,
  };
}
