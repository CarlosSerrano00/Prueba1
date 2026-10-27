const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

/**
 * Periodo mensual según la fecha local del dispositivo.
 * Se congela al iniciar la captura y no se recalcula al mostrar la lectura.
 */
export function obtenerPeriodo(fecha: Date = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${anio}-${mes}`;
}

export function esPeriodoValido(periodo: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(periodo);
}

export function nombrePeriodo(periodo: string): string {
  if (!esPeriodoValido(periodo)) return periodo;
  const [anio, mes] = periodo.split('-');
  const indice = Number(mes) - 1;
  return `${MESES[indice]} ${anio}`;
}

export function nombreMesCorto(fecha: Date): string {
  return MESES_CORTOS[fecha.getMonth()];
}

export function diferenciaEnDias(desdeIso: string, hasta: Date = new Date()): number {
  const desde = new Date(desdeIso);
  if (Number.isNaN(desde.getTime())) return 0;
  const ms = hasta.getTime() - desde.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}
