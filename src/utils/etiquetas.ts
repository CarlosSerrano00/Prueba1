import type {
  EstadoEnvio,
  EstadoVerificacion,
  TipoEstadoLectura,
} from '../types/models';

export function etiquetaTipoEstado(tipo: TipoEstadoLectura): string {
  switch (tipo) {
    case 'normal':
      return 'Normal';
    case 'inaccesible':
      return 'Inaccesible';
    case 'danado':
      return 'Dañado';
  }
}

export function descripcionTipoEstado(tipo: TipoEstadoLectura): string {
  switch (tipo) {
    case 'normal':
      return 'El medidor se pudo leer con normalidad.';
    case 'inaccesible':
      return 'No se pudo acceder al medidor. Se registra el motivo, sin lectura.';
    case 'danado':
      return 'El medidor presenta daños. La foto es obligatoria.';
  }
}

export function etiquetaEstadoEnvio(estado: EstadoEnvio): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente de envío';
    case 'enviando':
      return 'Enviando';
    case 'enviado':
      return 'Enviada';
    case 'requiere_revision':
      return 'Requiere revisión';
  }
}

export function descripcionEstadoEnvio(estado: EstadoEnvio): string {
  switch (estado) {
    case 'pendiente':
      return 'Está guardada en el teléfono y se enviará automáticamente cuando haya conexión.';
    case 'enviando':
      return 'Se está enviando al sistema de oficina. Espera unos segundos antes de corregirla.';
    case 'enviado':
      return 'El sistema de oficina confirmó el registro. Ya no se puede modificar.';
    case 'requiere_revision':
      return 'No se envió porque necesita tu revisión. Corrige los datos indicados y vuelve a guardar.';
  }
}

export function etiquetaEstadoVerificacion(estado: EstadoVerificacion): string {
  switch (estado) {
    case 'pendiente':
      return 'Verificación pendiente';
    case 'verificada':
      return 'Consumo verificado';
    case 'anomalia_confirmada':
      return 'Anomalía confirmada';
    case 'anomalia_pendiente':
      return 'Anomalía por confirmar';
    case 'no_aplica':
      return 'Sin consumo que verificar';
  }
}

export function descripcionEstadoVerificacion(estado: EstadoVerificacion): string {
  switch (estado) {
    case 'pendiente':
      return 'Aún no se tiene la lectura anterior o el promedio necesario para comparar. Se completará al sincronizar.';
    case 'verificada':
      return 'La lectura se comparó con la anterior y el consumo está dentro del rango esperado.';
    case 'anomalia_confirmada':
      return 'El consumo supera el triple del promedio. El técnico confirmó la revisión y adjuntó la foto.';
    case 'anomalia_pendiente':
      return 'El consumo supera el triple del promedio, pero falta la confirmación o la foto. No se enviará hasta completarlas.';
    case 'no_aplica':
      return 'El registro no tiene lectura actual, por lo que no hay consumo que calcular.';
  }
}

export function etiquetaEstadoMedidor(estado: string): string {
  const normalizado = estado.trim().toLowerCase().replace(/_/g, ' ');
  if (normalizado.length === 0) return 'Sin dato';
  return normalizado.charAt(0).toUpperCase() + normalizado.slice(1);
}
