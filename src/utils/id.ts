/**
 * Identificador local estable para una lectura.
 * No es un secreto: combina tiempo y azar para que dos capturas no colisionen.
 * Se genera una sola vez, antes del primer guardado, y se reutiliza en los reintentos.
 */
export function generarLocalId(prefijo = 'lec'): string {
  const tiempo = Date.now().toString(36);
  const bloque = () => {
    const valor = Math.random().toString(36).slice(2, 10);
    return valor.padEnd(8, '0');
  };
  return `${prefijo}_${tiempo}_${bloque()}${bloque()}`;
}
