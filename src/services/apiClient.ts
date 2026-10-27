import { ApiError } from './errors';
import { obtenerApiUrl } from './apiConfig';

export interface OpcionesPeticion {
  metodo?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  cuerpo?: unknown;
  baseUrl?: string;
  timeoutMs?: number;
}

const TIMEOUT_POR_DEFECTO = 12_000;

function mensajeDesdeRespuesta(datos: unknown): string | null {
  if (!datos || typeof datos !== 'object') return null;
  const objeto = datos as Record<string, unknown>;
  const candidatos = [objeto.mensaje, objeto.message, objeto.error, objeto.detalle];
  for (const valor of candidatos) {
    if (typeof valor === 'string' && valor.trim().length > 0) return valor.trim();
  }
  return null;
}

export function codigoDeRespuesta(datos: unknown): string | null {
  if (!datos || typeof datos !== 'object') return null;
  const objeto = datos as Record<string, unknown>;
  const valor = objeto.codigo ?? objeto.code ?? objeto.errorCode;
  return typeof valor === 'string' ? valor : null;
}

function unirUrl(base: string, ruta: string): string {
  const limpiaBase = base.replace(/\/+$/, '');
  const limpiaRuta = ruta.startsWith('/') ? ruta : `/${ruta}`;
  return `${limpiaBase}${limpiaRuta}`;
}

export async function solicitar<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const base = opciones.baseUrl ?? (await obtenerApiUrl());
  const metodo = opciones.metodo ?? 'GET';
  const timeoutMs = opciones.timeoutMs ?? TIMEOUT_POR_DEFECTO;
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);

  const headers: Record<string, string> = { Accept: 'application/json' };
  let cuerpo: string | undefined;
  if (opciones.cuerpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    cuerpo = JSON.stringify(opciones.cuerpo);
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(unirUrl(base, ruta), {
      method: metodo,
      headers,
      body: cuerpo,
      signal: controlador.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        'timeout',
        'El sistema de oficina tardó demasiado en responder. Revisa la conexión e inténtalo otra vez.',
      );
    }
    throw new ApiError(
      'red',
      'No se pudo conectar con el sistema de oficina. La lectura quedará guardada en el teléfono.',
    );
  } finally {
    clearTimeout(temporizador);
  }

  const texto = await respuesta.text();
  let datos: unknown = null;
  if (texto.trim().length > 0) {
    try {
      datos = JSON.parse(texto);
    } catch {
      if (!respuesta.ok) {
        throw new ApiError(
          'http',
          `El sistema de oficina respondió con un error (${respuesta.status}).`,
          respuesta.status,
          texto,
        );
      }
      throw new ApiError(
        'respuesta',
        'El sistema de oficina devolvió una respuesta que no se pudo interpretar.',
        respuesta.status,
        texto,
      );
    }
  }

  if (!respuesta.ok) {
    throw new ApiError(
      'http',
      mensajeDesdeRespuesta(datos) ??
        `El sistema de oficina respondió con un error (${respuesta.status}).`,
      respuesta.status,
      datos,
    );
  }

  return datos as T;
}

export function construirConsulta(parametros: Record<string, string | number | undefined>): string {
  const partes: string[] = [];
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor === undefined || valor === '') continue;
    partes.push(`${encodeURIComponent(clave)}=${encodeURIComponent(String(valor))}`);
  }
  return partes.length > 0 ? `?${partes.join('&')}` : '';
}
