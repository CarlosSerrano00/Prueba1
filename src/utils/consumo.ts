import type { EvaluacionConsumo } from '../types/models';

export function calcularConsumo(
  lecturaActual: number | null,
  ultimaLectura: number | null,
): number | null {
  if (lecturaActual == null || ultimaLectura == null) return null;
  return lecturaActual - ultimaLectura;
}

export function calcularUmbral(consumoPromedioMensual: number | null): number | null {
  if (consumoPromedioMensual == null) return null;
  return consumoPromedioMensual * 3;
}

/**
 * La anomalía se activa solo si el consumo supera estrictamente el triple.
 * consumo === 3 × promedio NO es anomalía.
 */
export function esConsumoAnomalo(
  consumo: number | null,
  consumoPromedioMensual: number | null,
): boolean {
  if (consumo == null || consumoPromedioMensual == null) return false;
  return consumo > consumoPromedioMensual * 3;
}

export function evaluarConsumo(
  lecturaActual: number | null,
  ultimaLectura: number | null,
  consumoPromedioMensual: number | null,
): EvaluacionConsumo {
  if (lecturaActual == null) {
    return {
      consumo: null,
      umbral: null,
      anomalia: false,
      evaluable: false,
      motivo: 'sin_lectura',
    };
  }

  if (ultimaLectura == null) {
    return {
      consumo: null,
      umbral: null,
      anomalia: false,
      evaluable: false,
      motivo: 'sin_anterior',
    };
  }

  const consumo = calcularConsumo(lecturaActual, ultimaLectura);

  if (consumoPromedioMensual == null) {
    return {
      consumo,
      umbral: null,
      anomalia: false,
      evaluable: false,
      motivo: 'sin_promedio',
    };
  }

  const umbral = calcularUmbral(consumoPromedioMensual);

  return {
    consumo,
    umbral,
    anomalia: esConsumoAnomalo(consumo, consumoPromedioMensual),
    evaluable: true,
    motivo: null,
  };
}
