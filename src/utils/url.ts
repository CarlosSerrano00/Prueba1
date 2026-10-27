import { ReglaNegocioError } from '../services/errors';

export const URL_API_POR_DEFECTO = 'http://10.0.2.2:4000';

export function normalizarUrlApi(valor: string): string {
  const limpio = valor.trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^\s]+$/i.test(limpio)) {
    throw new ReglaNegocioError(
      'URL_INVALIDA',
      'La URL debe comenzar con http:// o https:// y no debe contener espacios.',
    );
  }
  return limpio;
}

export function urlEsLocal(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['localhost', '127.0.0.1', '10.0.2.2'].includes(parsed.hostname);
  } catch {
    return false;
  }
}
