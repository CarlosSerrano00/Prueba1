import type { Lectura } from '../types/models';

export type CodigoError =
  | 'CODIGO_INVALIDO'
  | 'VALIDACION'
  | 'LECTURA_MENOR'
  | 'DUPLICADO'
  | 'LECTURA_ENVIADA'
  | 'LECTURA_ENVIANDO'
  | 'FOTO_OBLIGATORIA'
  | 'BORRADOR_EXISTENTE'
  | 'MEDIDOR_NO_DISPONIBLE'
  | 'CREDENCIALES'
  | 'URL_INVALIDA'
  | 'DESCONOCIDO';

export class ReglaNegocioError extends Error {
  constructor(
    public readonly codigo: CodigoError,
    message: string,
    public readonly detalle?: unknown,
  ) {
    super(message);
    this.name = 'ReglaNegocioError';
  }
}

export class LecturaDuplicadaError extends ReglaNegocioError {
  constructor(
    public readonly lectura: Lectura,
    message = 'Ya existe una lectura de este medidor para el mismo mes.',
  ) {
    super('DUPLICADO', message, lectura);
    this.name = 'LecturaDuplicadaError';
  }
}

export class PermisoCamaraError extends Error {
  constructor(public readonly puedeReintentar: boolean) {
    super(
      puedeReintentar
        ? 'No se concedió el permiso de cámara. Puedes volver a intentarlo.'
        : 'El permiso de cámara está bloqueado. Habilítalo en los ajustes del teléfono.',
    );
    this.name = 'PermisoCamaraError';
  }
}

export type TipoErrorApi = 'red' | 'timeout' | 'http' | 'respuesta' | 'configuracion';

export class ApiError extends Error {
  constructor(
    public readonly tipo: TipoErrorApi,
    message: string,
    public readonly status?: number,
    public readonly detalle?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function esErrorDeRed(error: unknown): boolean {
  return error instanceof ApiError && (error.tipo === 'red' || error.tipo === 'timeout');
}

export function esConflicto(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

export function mensajeDeError(error: unknown): string {
  if (error instanceof ReglaNegocioError) return error.message;
  if (error instanceof ApiError) return error.message;
  if (error instanceof PermisoCamaraError) return error.message;
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return 'Ocurrió un error inesperado. Intenta nuevamente.';
}
