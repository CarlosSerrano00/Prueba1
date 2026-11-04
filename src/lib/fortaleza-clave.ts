export type NivelFortaleza = 'debil' | 'media' | 'fuerte';

export interface EvaluacionFortaleza {
  nivel: NivelFortaleza;
  puntuacion: 1 | 2 | 3;
}

export function evaluarFortalezaClave(clave: string): EvaluacionFortaleza | null {
  if (clave.length === 0) return null;

  const variedad = [
    /[a-z]/.test(clave),
    /[A-Z]/.test(clave),
    /\d/.test(clave),
    /[^A-Za-z0-9]/.test(clave),
  ].filter(Boolean).length;
  const criterios = [
    clave.length >= 8,
    clave.length >= 12,
    variedad >= 1,
    variedad >= 2,
    variedad >= 3,
    new Set(clave).size >= 8,
  ].filter(Boolean).length;

  if (clave.length < 8 || criterios <= 3) return { nivel: 'debil', puntuacion: 1 };
  if (
    clave.length >= 12 &&
    criterios >= 5 &&
    variedad >= 3 &&
    new Set(clave).size >= 8 &&
    !/(.)\1{3}/.test(clave)
  ) {
    return { nivel: 'fuerte', puntuacion: 3 };
  }
  return { nivel: 'media', puntuacion: 2 };
}
