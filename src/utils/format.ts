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

function dosDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}

function fechaDesdeIso(iso: string): Date | null {
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const fecha = new Date(soloFecha ? `${iso}T12:00:00` : iso);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return 'Sin dato';
  const fecha = fechaDesdeIso(iso);
  if (!fecha) return iso;
  return `${dosDigitos(fecha.getDate())} ${MESES_CORTOS[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) return 'Sin dato';
  const fecha = fechaDesdeIso(iso);
  if (!fecha) return iso;
  return `${formatearFecha(iso)} · ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

export function formatearHora(iso: string | null | undefined): string {
  if (!iso) return '';
  const fecha = fechaDesdeIso(iso);
  if (!fecha) return '';
  return `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

export function formatearNumero(valor: number | null | undefined): string {
  if (valor == null || !Number.isFinite(valor)) return '—';
  const redondeado = Math.round(valor * 100) / 100;
  const [entero, decimales] = redondeado.toFixed(2).split('.');
  const enteroConMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalesLimpios = decimales.replace(/0+$/, '');
  return decimalesLimpios ? `${enteroConMiles},${decimalesLimpios}` : enteroConMiles;
}

export function formatearMetros(valor: number | null | undefined): string {
  return valor == null ? 'Sin dato' : `${formatearNumero(valor)} m³`;
}

export function iniciales(nombre: string): string {
  const partes = nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (partes.length === 0) return '?';
  return partes.map((parte) => parte[0]?.toUpperCase() ?? '').join('');
}

export function formatearFechaJornada(fecha: Date = new Date()): string {
  return `${dosDigitos(fecha.getDate())} de ${nombreMesLargo(fecha)} de ${fecha.getFullYear()}`;
}

export function nombreMesLargo(fecha: Date): string {
  return [
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
  ][fecha.getMonth()] as string;
}

export function saludoSegunHora(fecha: Date = new Date()): string {
  const hora = fecha.getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
