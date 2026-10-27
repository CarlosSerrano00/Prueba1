import type {
  DatosFormulario,
  EvaluacionConsumo,
  Medidor,
  TipoEstadoLectura,
} from '../types/models';
import { evaluarConsumo } from './consumo';
import { formatearNumero } from './format';

export const PATRON_CODIGO_MEDIDOR = /^MED-\d{6}$/;

export type ResultadoValidacion = {
  valido: boolean;
  mensaje: string | null;
};

export type ErroresFormulario = Partial<
  Record<
    | 'codigo'
    | 'lecturaActual'
    | 'motivoInaccesible'
    | 'descripcionDano'
    | 'foto'
    | 'confirmacion'
    | 'general',
    string
  >
>;

export type EvaluacionRegistro = {
  valido: boolean;
  errores: ErroresFormulario;
  lectura: number | null;
  evaluacion: EvaluacionConsumo;
  fotoObligatoria: boolean;
  requiereConfirmacion: boolean;
};

export function validarCodigoMedidor(codigo: string): ResultadoValidacion {
  if (codigo.length === 0) {
    return {
      valido: false,
      mensaje: 'Ingresa el código del medidor. Ejemplo: MED-123456.',
    };
  }

  if (codigo !== codigo.trim()) {
    return {
      valido: false,
      mensaje: 'El código no debe tener espacios. Formato: MED- seguido de seis dígitos.',
    };
  }

  if (!PATRON_CODIGO_MEDIDOR.test(codigo)) {
    return {
      valido: false,
      mensaje: 'El código debe tener el formato MED- seguido de seis dígitos. Ejemplo: MED-123456.',
    };
  }

  return { valido: true, mensaje: null };
}

export function esCodigoMedidorValido(codigo: string): boolean {
  return PATRON_CODIGO_MEDIDOR.test(codigo);
}

export function parsearLectura(texto: string): { ok: true; valor: number } | { ok: false; mensaje: string } {
  const limpio = texto.trim();
  if (limpio.length === 0) {
    return { ok: false, mensaje: 'Ingresa la lectura del medidor.' };
  }

  if (!/^\d{1,8}(?:[.,]\d{1,3})?$/.test(limpio)) {
    return {
      ok: false,
      mensaje:
        'La lectura debe ser un número mayor o igual a 0. Puedes usar hasta tres decimales, por ejemplo 1234,5.',
    };
  }

  const valor = Number(limpio.replace(',', '.'));
  if (!Number.isFinite(valor) || valor < 0) {
    return { ok: false, mensaje: 'La lectura debe ser un número válido mayor o igual a 0.' };
  }

  return { ok: true, valor };
}

export function validarMotivoInaccesible(texto: string): string | null {
  const limpio = texto.trim();
  if (limpio.length === 0) {
    return 'Describe por qué no se pudo acceder al medidor.';
  }
  if (limpio.length < 4) {
    return 'Escribe un motivo un poco más descriptivo (mínimo 4 caracteres).';
  }
  if (limpio.length > 300) {
    return 'El motivo no debe superar los 300 caracteres.';
  }
  return null;
}

export function validarDescripcionDano(texto: string): string | null {
  const limpio = texto.trim();
  if (limpio.length === 0) {
    return 'Describe el daño del medidor.';
  }
  if (limpio.length < 6) {
    return 'Describe el daño con un poco más de detalle (mínimo 6 caracteres).';
  }
  if (limpio.length > 500) {
    return 'La descripción no debe superar los 500 caracteres.';
  }
  return null;
}

export function validarLecturaContraAnterior(
  lectura: number,
  ultimaLectura: number | null,
): string | null {
  if (ultimaLectura == null) return null;
  if (lectura < ultimaLectura) {
    return `La lectura no puede ser menor que la última registrada (${formatearNumero(
      ultimaLectura,
    )} m³). Revisa el número o registra una incidencia.`;
  }
  return null;
}

/**
 * Valida los datos del paso 1. No exige foto ni confirmación: esas reglas
 * dependen del paso 2 y se validan con `validarRegistroCompleto`.
 */
export function validarDatosRegistro(
  datos: DatosFormulario,
  medidor: Medidor,
): {
  valido: boolean;
  errores: ErroresFormulario;
  lectura: number | null;
  evaluacion: EvaluacionConsumo;
} {
  const errores: ErroresFormulario = {};
  let lectura: number | null = null;

  if (datos.tipoEstado === 'normal') {
    const resultado = parsearLectura(datos.lecturaActual);
    if (!resultado.ok) {
      errores.lecturaActual = resultado.mensaje;
    } else {
      lectura = resultado.valor;
      const errorMenor = validarLecturaContraAnterior(lectura, medidor.ultimaLectura);
      if (errorMenor) errores.lecturaActual = errorMenor;
    }
  }

  if (datos.tipoEstado === 'inaccesible') {
    const errorMotivo = validarMotivoInaccesible(datos.motivoInaccesible);
    if (errorMotivo) errores.motivoInaccesible = errorMotivo;
    lectura = null;
  }

  if (datos.tipoEstado === 'danado') {
    const errorDescripcion = validarDescripcionDano(datos.descripcionDano);
    if (errorDescripcion) errores.descripcionDano = errorDescripcion;

    if (datos.lecturaActual.trim().length > 0) {
      const resultado = parsearLectura(datos.lecturaActual);
      if (!resultado.ok) {
        errores.lecturaActual = resultado.mensaje;
      } else {
        lectura = resultado.valor;
        const errorMenor = validarLecturaContraAnterior(lectura, medidor.ultimaLectura);
        if (errorMenor) errores.lecturaActual = errorMenor;
      }
    }
  }

  const evaluacion = evaluarConsumo(
    lectura,
    medidor.ultimaLectura,
    medidor.consumoPromedioMensual,
  );

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    lectura,
    evaluacion,
  };
}

export function fotoEsObligatoria(
  tipoEstado: TipoEstadoLectura,
  evaluacion: EvaluacionConsumo,
): boolean {
  return tipoEstado === 'danado' || evaluacion.anomalia;
}

export function validarRegistroCompleto(
  datos: DatosFormulario,
  medidor: Medidor,
  fotoUri: string | null,
): EvaluacionRegistro {
  const base = validarDatosRegistro(datos, medidor);
  const errores: ErroresFormulario = { ...base.errores };
  const fotoObligatoria = fotoEsObligatoria(datos.tipoEstado, base.evaluacion);
  const requiereConfirmacion = base.evaluacion.anomalia;

  if (fotoObligatoria && !fotoUri) {
    errores.foto =
      datos.tipoEstado === 'danado'
        ? 'La foto es obligatoria porque el medidor está dañado.'
        : 'La foto es obligatoria porque el consumo supera el triple del promedio.';
  }

  if (requiereConfirmacion && !datos.confirmacionRevision) {
    errores.confirmacion =
      'Confirma que revisaste el medidor de agua antes de guardar la lectura.';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    lectura: base.lectura,
    evaluacion: base.evaluacion,
    fotoObligatoria,
    requiereConfirmacion,
  };
}

export function primerError(errores: ErroresFormulario): string | null {
  const orden: (keyof ErroresFormulario)[] = [
    'codigo',
    'general',
    'lecturaActual',
    'motivoInaccesible',
    'descripcionDano',
    'foto',
    'confirmacion',
  ];
  for (const clave of orden) {
    if (errores[clave]) return errores[clave] ?? null;
  }
  return null;
}
