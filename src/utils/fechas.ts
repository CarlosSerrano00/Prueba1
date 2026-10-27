const PATRON_DIA = /^\d{4}-\d{2}-\d{2}$/;

export const FECHA_MINIMA = '2000-01-01';

function dosDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}

function fechaDesdePartes(anio: number, mes: number, dia: number): Date | null {
  const fecha = new Date(anio, mes - 1, dia, 12, 0, 0, 0);
  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }
  return fecha;
}

/**
 * Las fechas de negocio (por ejemplo, `fechaUltimaLectura`) se guardan como
 * día calendario. Se usa mediodía local para evitar que un cambio de zona
 * horaria mueva el día al convertir el valor a ISO.
 */
export function fechaLocalISO(fecha: Date = new Date()): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(
    fecha.getDate(),
  )}`;
}

export function hoyISO(): string {
  return fechaLocalISO(new Date());
}

/**
 * Acepta un día (`YYYY-MM-DD`) o una fecha ISO completa. Para fechas de
 * MockAPI que llegan como medianoche UTC se conserva el día UTC, porque el
 * campo original representa un día calendario y no un instante local.
 */
export function parsearFecha(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const limpio = valor.trim();
  if (limpio.length === 0) return null;

  if (PATRON_DIA.test(limpio)) {
    const [anio, mes, dia] = limpio.split('-').map(Number);
    return fechaDesdePartes(anio, mes, dia);
  }

  if (esMedianocheUtc(limpio)) {
    const fecha = new Date(limpio);
    if (Number.isNaN(fecha.getTime())) return null;
    return fechaDesdePartes(
      fecha.getUTCFullYear(),
      fecha.getUTCMonth() + 1,
      fecha.getUTCDate(),
    );
  }

  const fecha = new Date(limpio);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function esMedianocheUtc(valor: string): boolean {
  return /T00:00:00(?:\.000)?Z$/i.test(valor);
}

export function normalizarFechaDia(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const limpio = valor.trim();
  if (PATRON_DIA.test(limpio)) {
    const fecha = parsearFecha(limpio);
    return fecha ? fechaLocalISO(fecha) : null;
  }
  const fecha = parsearFecha(limpio);
  return fecha ? fechaLocalISO(fecha) : null;
}

export function normalizarFechaHora(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const fecha = parsearFecha(valor);
  return fecha ? fecha.toISOString() : null;
}

export function fechaHoraDesdeDia(dia: string): string | null {
  const fecha = parsearFecha(dia);
  return fecha ? fecha.toISOString() : null;
}

export function periodoDeFecha(valor: string | null | undefined): string | null {
  const dia = normalizarFechaDia(valor);
  return dia ? dia.slice(0, 7) : null;
}

export function sumarDias(dia: string, cantidad: number): string {
  const fecha = parsearFecha(dia);
  if (!fecha) return dia;
  fecha.setDate(fecha.getDate() + cantidad);
  return fechaLocalISO(fecha);
}

export interface OpcionesValidacionFecha {
  requerida?: boolean;
  min?: string;
  max?: string;
  etiqueta?: string;
}

export interface ResultadoFecha {
  ok: boolean;
  mensaje: string | null;
  valor: string | null;
}

export function validarFechaDia(
  valor: string | null | undefined,
  opciones: OpcionesValidacionFecha = {},
): ResultadoFecha {
  const etiqueta = opciones.etiqueta ?? 'La fecha';
  const limpio = (valor ?? '').trim();

  if (limpio.length === 0) {
    return opciones.requerida
      ? { ok: false, mensaje: `${etiqueta} es obligatoria.`, valor: null }
      : { ok: true, mensaje: null, valor: null };
  }

  const dia = normalizarFechaDia(limpio);
  if (!dia) {
    return {
      ok: false,
      mensaje: `${etiqueta} no es una fecha válida. Usa el selector de fecha.`,
      valor: null,
    };
  }

  const min = opciones.min ?? FECHA_MINIMA;
  const max = opciones.max ?? hoyISO();
  if (dia < min) {
    return {
      ok: false,
      mensaje: `${etiqueta} no puede ser anterior a ${min}.`,
      valor: null,
    };
  }
  if (dia > max) {
    return {
      ok: false,
      mensaje: `${etiqueta} no puede ser posterior a ${max}.`,
      valor: null,
    };
  }

  return { ok: true, mensaje: null, valor: dia };
}

export function validarFechaHoraISO(
  valor: string | null | undefined,
  opciones: OpcionesValidacionFecha = {},
): ResultadoFecha {
  const etiqueta = opciones.etiqueta ?? 'La fecha';
  const limpio = (valor ?? '').trim();

  if (limpio.length === 0) {
    return opciones.requerida
      ? { ok: false, mensaje: `${etiqueta} es obligatoria.`, valor: null }
      : { ok: true, mensaje: null, valor: null };
  }

  const iso = normalizarFechaHora(limpio);
  const fecha = iso ? new Date(iso) : null;
  if (!iso || !fecha || Number.isNaN(fecha.getTime())) {
    return { ok: false, mensaje: `${etiqueta} no es una fecha válida.`, valor: null };
  }

  const dia = normalizarFechaDia(iso);
  const min = opciones.min ?? FECHA_MINIMA;
  const max = opciones.max ?? hoyISO();
  if (dia && dia < min) {
    return {
      ok: false,
      mensaje: `${etiqueta} no puede ser anterior a ${min}.`,
      valor: null,
    };
  }
  if (dia && dia > max) {
    return {
      ok: false,
      mensaje: `${etiqueta} no puede ser posterior a ${max}.`,
      valor: null,
    };
  }

  return { ok: true, mensaje: null, valor: iso };
}
