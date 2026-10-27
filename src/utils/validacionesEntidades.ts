import { formatearNumero } from './format';
import { hoyISO, normalizarFechaDia, validarFechaDia } from './fechas';

export const ESTADOS_MEDIDOR = ['activo', 'suspendido', 'inactivo'] as const;
export type EstadoMedidor = (typeof ESTADOS_MEDIDOR)[number];

export const LONGITUDES_MEDIDOR = {
  codigo: { min: 10, max: 10 },
  direccion: { min: 5, max: 160 },
  sector: { min: 2, max: 60 },
  numeroCuenta: { min: 10, max: 10 },
} as const;

export const RANGO_LECTURA = {
  min: 0,
  max: 999999.999,
  decimales: 3,
} as const;

export const RANGO_PROMEDIO = {
  min: 0,
  max: 100000,
  decimales: 3,
} as const;

export interface MedidorFormulario {
  codigo: string;
  direccion: string;
  sector: string;
  numeroCuenta: string;
  estado: EstadoMedidor;
  ultimaLectura: string;
  fechaUltimaLectura: string | null;
  consumoPromedioMensual: string;
}

export type ErroresMedidor = Partial<
  Record<
    | 'codigo'
    | 'direccion'
    | 'sector'
    | 'numeroCuenta'
    | 'estado'
    | 'ultimaLectura'
    | 'fechaUltimaLectura'
    | 'consumoPromedioMensual'
    | 'general',
    string
  >
>;

export interface ResultadoValidacionMedidor {
  valido: boolean;
  errores: ErroresMedidor;
  valores: {
    codigo: string;
    direccion: string;
    sector: string;
    numeroCuenta: string;
    estado: EstadoMedidor;
    ultimaLectura: number | null;
    fechaUltimaLectura: string | null;
    consumoPromedioMensual: number | null;
  };
}

export function validarDireccion(valor: string): string | null {
  const limpio = valor.trim();
  if (limpio.length === 0) return 'La dirección es obligatoria.';
  if (limpio.length < LONGITUDES_MEDIDOR.direccion.min) {
    return `La dirección debe tener al menos ${LONGITUDES_MEDIDOR.direccion.min} caracteres.`;
  }
  if (limpio.length > LONGITUDES_MEDIDOR.direccion.max) {
    return `La dirección no debe superar los ${LONGITUDES_MEDIDOR.direccion.max} caracteres.`;
  }
  return null;
}

export function validarSector(valor: string): string | null {
  const limpio = valor.trim();
  if (limpio.length === 0) return 'El sector es obligatorio.';
  if (limpio.length < LONGITUDES_MEDIDOR.sector.min) {
    return `El sector debe tener al menos ${LONGITUDES_MEDIDOR.sector.min} caracteres.`;
  }
  if (limpio.length > LONGITUDES_MEDIDOR.sector.max) {
    return `El sector no debe superar los ${LONGITUDES_MEDIDOR.sector.max} caracteres.`;
  }
  return null;
}

export function validarNumeroCuenta(valor: string): string | null {
  const limpio = valor.trim();
  if (limpio.length === 0) return 'El número de cuenta es obligatorio.';
  if (!/^CTA-\d{6}$/.test(limpio)) {
    return 'El número de cuenta debe tener el formato CTA- seguido de seis dígitos.';
  }
  return null;
}

export function esEstadoMedidorValido(valor: string): valor is EstadoMedidor {
  return (ESTADOS_MEDIDOR as readonly string[]).includes(valor);
}

export interface ResultadoNumero {
  ok: boolean;
  valor: number | null;
  mensaje: string | null;
}

export interface OpcionesNumero {
  etiqueta: string;
  min: number;
  max: number;
  decimales: number;
  requerido?: boolean;
}

export function parsearNumeroRango(texto: string, opciones: OpcionesNumero): ResultadoNumero {
  const limpio = texto.trim();
  if (limpio.length === 0) {
    return opciones.requerido
      ? { ok: false, valor: null, mensaje: `${opciones.etiqueta} es obligatorio.` }
      : { ok: true, valor: null, mensaje: null };
  }

  const patron = new RegExp(`^\\d{1,6}(?:[.,]\\d{1,${opciones.decimales}})?$`);
  if (!patron.test(limpio)) {
    return {
      ok: false,
      valor: null,
      mensaje:
        `${opciones.etiqueta} debe ser un número mayor o igual a ${formatearNumero(
          opciones.min,
        )}. ` +
        `Puedes usar hasta ${opciones.decimales} decimales.`,
    };
  }

  const valor = Number(limpio.replace(',', '.'));
  if (!Number.isFinite(valor) || valor < opciones.min || valor > opciones.max) {
    return {
      ok: false,
      valor: null,
      mensaje: `${opciones.etiqueta} debe estar entre ${formatearNumero(
        opciones.min,
      )} y ${formatearNumero(opciones.max)}.`,
    };
  }

  return { ok: true, valor, mensaje: null };
}

export function validarMedidorFormulario(
  formulario: MedidorFormulario,
  opciones: { fechaMinima?: string } = {},
): ResultadoValidacionMedidor {
  const errores: ErroresMedidor = {};

  const codigo = formulario.codigo.trim();
  const direccion = formulario.direccion.trim();
  const sector = formulario.sector.trim();
  const numeroCuenta = formulario.numeroCuenta.trim();

  if (!/^MED-\d{6}$/.test(codigo)) {
    errores.codigo = 'El código debe tener el formato MED- seguido de seis dígitos.';
  }

  const errorDireccion = validarDireccion(direccion);
  if (errorDireccion) errores.direccion = errorDireccion;

  const errorSector = validarSector(sector);
  if (errorSector) errores.sector = errorSector;

  const errorCuenta = validarNumeroCuenta(numeroCuenta);
  if (errorCuenta) errores.numeroCuenta = errorCuenta;

  if (!esEstadoMedidorValido(formulario.estado)) {
    errores.estado = 'Selecciona un estado válido para el medidor.';
  }

  const lectura = parsearNumeroRango(formulario.ultimaLectura, {
    etiqueta: 'La última lectura',
    ...RANGO_LECTURA,
  });
  if (lectura.mensaje) errores.ultimaLectura = lectura.mensaje;

  const promedio = parsearNumeroRango(formulario.consumoPromedioMensual, {
    etiqueta: 'El consumo promedio mensual',
    ...RANGO_PROMEDIO,
  });
  if (promedio.mensaje) errores.consumoPromedioMensual = promedio.mensaje;

  const fecha = validarFechaDia(formulario.fechaUltimaLectura, {
    etiqueta: 'La fecha de última lectura',
    min: opciones.fechaMinima,
    max: hoyISO(),
  });
  if (fecha.mensaje) errores.fechaUltimaLectura = fecha.mensaje;

  if (lectura.ok && fecha.ok && lectura.valor == null && fecha.valor != null) {
    errores.ultimaLectura = 'Si indicas una fecha de última lectura, también debes indicar el valor.';
  }
  if (lectura.ok && fecha.ok && lectura.valor != null && fecha.valor == null) {
    errores.fechaUltimaLectura =
      'Indica la fecha de la última lectura o deja ambos campos vacíos.';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    valores: {
      codigo,
      direccion,
      sector,
      numeroCuenta,
      estado: formulario.estado,
      ultimaLectura: lectura.ok ? lectura.valor : null,
      fechaUltimaLectura: normalizarFechaDia(fecha.valor),
      consumoPromedioMensual: promedio.ok ? promedio.valor : null,
    },
  };
}

export function primerErrorMedidor(errores: ErroresMedidor): string | null {
  const orden: (keyof ErroresMedidor)[] = [
    'general',
    'codigo',
    'direccion',
    'sector',
    'numeroCuenta',
    'estado',
    'ultimaLectura',
    'fechaUltimaLectura',
    'consumoPromedioMensual',
  ];
  for (const clave of orden) {
    if (errores[clave]) return errores[clave] ?? null;
  }
  return null;
}
