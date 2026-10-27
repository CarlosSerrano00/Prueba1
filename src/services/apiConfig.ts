import { borrarConfig, guardarConfig, obtenerConfig } from '../storage/configRepository';
import { normalizarUrlApi, URL_API_POR_DEFECTO } from '../utils/url';

const CLAVE_URL_API = 'url_api';

/**
 * Prioridad documentada en ADR-010:
 * 1) variable de compilación, 2) URL guardada desde Perfil, 3) valor por defecto.
 */
export async function obtenerApiUrl(): Promise<string> {
  const desdeEntorno = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (desdeEntorno) {
    try {
      return normalizarUrlApi(desdeEntorno);
    } catch {
      // Una variable mal escrita no debe impedir abrir la app.
    }
  }

  const guardada = await obtenerConfig(CLAVE_URL_API);
  if (guardada) return guardada;

  return URL_API_POR_DEFECTO;
}

export async function guardarApiUrl(valor: string): Promise<string> {
  const normalizada = normalizarUrlApi(valor);
  await guardarConfig(CLAVE_URL_API, normalizada);
  return normalizada;
}

export async function restablecerApiUrl(): Promise<string> {
  await borrarConfig(CLAVE_URL_API);
  return obtenerApiUrl();
}

export async function urlEstaDefinidaPorEntorno(): Promise<boolean> {
  const desdeEntorno = process.env.EXPO_PUBLIC_API_URL?.trim();
  return Boolean(desdeEntorno);
}
