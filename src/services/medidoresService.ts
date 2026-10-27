import type { Medidor, MedidorConOrigen, MedidorRemoto } from '../types/models';
import { guardarMedidor, listarMedidoresRecientes, obtenerMedidor } from '../storage/medidoresRepository';
import { formatearFechaHora } from '../utils/format';
import {
  validarMedidorFormulario,
  primerErrorMedidor,
  type EstadoMedidor,
  type MedidorFormulario,
} from '../utils/validacionesEntidades';
import { cuerpoMedidorRemoto } from '../utils/contratoRemoto';
import { validarCodigoMedidor } from '../utils/validators';
import { construirConsulta, solicitar } from './apiClient';
import { parsearLista, parsearMedidorRemoto } from './apiParsers';
import { ReglaNegocioError } from './errors';

function convertirMedidor(remoto: MedidorRemoto): Medidor {
  return {
    idRemoto: remoto.id,
    codigo: remoto.codigo,
    direccion: remoto.direccion,
    sector: remoto.sector,
    numeroCuenta: remoto.numeroCuenta,
    estado: remoto.estado,
    ultimaLectura: remoto.ultimaLectura,
    fechaUltimaLectura: remoto.fechaUltimaLectura,
    consumoPromedioMensual: remoto.consumoPromedioMensual,
    consultadoEn: new Date().toISOString(),
  };
}

function advertenciaCache(
  medidor: Medidor,
  permitirRed: boolean,
  detalle?: string,
): string {
  const base = permitirRed
    ? `Se muestran los datos guardados el ${formatearFechaHora(
        medidor.consultadoEn,
      )}. Desliza hacia abajo para actualizarlos desde la oficina.`
    : `Sin conexión con la oficina. Se muestran los datos guardados el ${formatearFechaHora(
        medidor.consultadoEn,
      )}.`;
  return detalle ? `${base} ${detalle}` : base;
}

function fueConsultadoHoy(iso: string): boolean {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return false;
  const hoy = new Date();
  return (
    fecha.getFullYear() === hoy.getFullYear() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getDate() === hoy.getDate()
  );
}

/**
 * R3: con señal se consulta la oficina y se guarda la copia local.
 * Sin señal se devuelve la copia local. Dentro de la misma jornada, un
 * medidor ya consultado se entrega desde SQLite sin esperar otra descarga;
 * `forzarRed` se usa en el gesto de actualizar. R2: el código se valida
 * antes de llegar a este servicio y otra vez aquí, antes de tocar la red.
 */
export async function consultarMedidor(
  codigo: string,
  permitirRed = true,
  forzarRed = false,
): Promise<MedidorConOrigen> {
  const validacion = validarCodigoMedidor(codigo);
  if (!validacion.valido) {
    throw new ReglaNegocioError(
      'CODIGO_INVALIDO',
      validacion.mensaje ?? 'El código del medidor no es válido.',
    );
  }

  const cache = await obtenerMedidor(codigo);

  if (cache && !forzarRed && fueConsultadoHoy(cache.consultadoEn)) {
    return { medidor: cache, origen: 'cache', advertencia: advertenciaCache(cache, permitirRed) };
  }

  if (!permitirRed) {
    if (cache) {
      return {
        medidor: cache,
        origen: 'cache',
        advertencia: advertenciaCache(cache, false),
      };
    }
    throw new ReglaNegocioError(
      'MEDIDOR_NO_DISPONIBLE',
      'Sin conexión y este medidor todavía no está guardado en el teléfono. Conéctate y consúltalo una vez.',
    );
  }

  try {
    const remoto = await consultarMedidorRemoto(codigo);
    if (!remoto) {
      if (cache) {
        return {
          medidor: cache,
          origen: 'cache',
          advertencia: advertenciaCache(
            cache,
            true,
            'La oficina no devolvió datos para este código.',
          ),
        };
      }
      throw new ReglaNegocioError(
        'MEDIDOR_NO_DISPONIBLE',
        'El sistema de oficina no tiene un medidor con ese código. Verifica la etiqueta.',
      );
    }

    const medidor = convertirMedidor(remoto);
    await guardarMedidor(medidor);
    return { medidor, origen: 'remoto', advertencia: null };
  } catch (error) {
    if (cache) {
      return {
        medidor: cache,
        origen: 'cache',
        advertencia: advertenciaCache(
          cache,
          permitirRed,
          'La consulta a la oficina no respondió.',
        ),
      };
    }
    throw error;
  }
}

export interface CambiosMedidor {
  direccion: string;
  sector: string;
  numeroCuenta: string;
  estado: EstadoMedidor;
  ultimaLectura: number | null;
  fechaUltimaLectura: string | null;
  consumoPromedioMensual: number | null;
}

/**
 * Actualiza la ficha del medidor en MockAPI y refresca la copia local. La
 * operación exige conexión: no se encola porque una ficha maestra no debe
 * quedar desincronizada sin que el técnico lo sepa.
 */
export async function actualizarMedidor(
  codigo: string,
  cambios: CambiosMedidor,
): Promise<Medidor> {
  const validacionCodigo = validarCodigoMedidor(codigo);
  if (!validacionCodigo.valido) {
    throw new ReglaNegocioError(
      'CODIGO_INVALIDO',
      validacionCodigo.mensaje ?? 'El código del medidor no es válido.',
    );
  }

  const formulario: MedidorFormulario = {
    codigo,
    direccion: cambios.direccion,
    sector: cambios.sector,
    numeroCuenta: cambios.numeroCuenta,
    estado: cambios.estado,
    ultimaLectura: cambios.ultimaLectura == null ? '' : String(cambios.ultimaLectura),
    fechaUltimaLectura: cambios.fechaUltimaLectura,
    consumoPromedioMensual:
      cambios.consumoPromedioMensual == null ? '' : String(cambios.consumoPromedioMensual),
  };
  const validacion = validarMedidorFormulario(formulario);
  if (!validacion.valido) {
    throw new ReglaNegocioError(
      'VALIDACION',
      primerErrorMedidor(validacion.errores) ?? 'Revisa los datos del medidor.',
      validacion.errores,
    );
  }

  const cache = await obtenerMedidor(codigo);
  const idRemoto = cache?.idRemoto ?? (await consultarMedidorRemoto(codigo))?.id ?? null;
  if (!idRemoto) {
    throw new ReglaNegocioError(
      'MEDIDOR_NO_DISPONIBLE',
      'No se encontró el identificador remoto del medidor. Conéctate y vuelve a consultarlo.',
    );
  }

  const respuesta = await solicitar<unknown>(`/medidores/${encodeURIComponent(idRemoto)}`, {
    metodo: 'PUT',
    cuerpo: cuerpoMedidorRemoto({
      codigo,
      direccion: validacion.valores.direccion,
      sector: validacion.valores.sector,
      numeroCuenta: validacion.valores.numeroCuenta,
      estado: validacion.valores.estado,
      ultimaLectura: validacion.valores.ultimaLectura,
      fechaUltimaLectura: validacion.valores.fechaUltimaLectura,
      consumoPromedioMensual: validacion.valores.consumoPromedioMensual,
    }),
  });

  const remoto = parsearMedidorRemoto(respuesta);
  const medidor = convertirMedidor(remoto);
  await guardarMedidor(medidor);
  return medidor;
}

export async function consultarMedidorRemoto(codigo: string): Promise<MedidorRemoto | null> {
  const datos = await solicitar<unknown>(`/medidores${construirConsulta({ codigo })}`);
  const medidores = parsearLista(datos, parsearMedidorRemoto);
  return medidores.find((medidor) => medidor.codigo === codigo) ?? null;
}

export async function listarRecientes(limite = 5): Promise<Medidor[]> {
  return listarMedidoresRecientes(limite);
}

export async function probarConexion(baseUrl?: string): Promise<number> {
  const datos = await solicitar<unknown>('/medidores?limit=1', { baseUrl, timeoutMs: 8_000 });
  if (Array.isArray(datos)) return datos.length;
  if (datos && typeof datos === 'object') return 1;
  return 0;
}
