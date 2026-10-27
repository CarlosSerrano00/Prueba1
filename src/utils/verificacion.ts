import type { EstadoVerificacion, EvaluacionConsumo, TipoEstadoLectura } from '../types/models';

/**
 * Traduce la evaluación de consumo a un estado comprensible para el técnico
 * y para el sistema de oficina. No se considera "verificada" una lectura
 * que aún no se pudo comparar por falta de datos.
 */
export function calcularEstadoVerificacion(params: {
  tipoEstado: TipoEstadoLectura;
  lecturaActual: number | null;
  evaluacion: EvaluacionConsumo;
  confirmacionRevision: boolean;
  fotoUri: string | null;
}): EstadoVerificacion {
  const { tipoEstado, lecturaActual, evaluacion, confirmacionRevision, fotoUri } = params;

  if (tipoEstado === 'inaccesible' || lecturaActual == null) return 'no_aplica';
  if (!evaluacion.evaluable) return 'pendiente';
  if (!evaluacion.anomalia) return 'verificada';
  return confirmacionRevision && Boolean(fotoUri) ? 'anomalia_confirmada' : 'anomalia_pendiente';
}

export function lecturaSePuedeCorregir(estadoEnvio: string): boolean {
  return estadoEnvio === 'pendiente' || estadoEnvio === 'requiere_revision';
}
