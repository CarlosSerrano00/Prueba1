import type { Sesion } from '../types/models';
import { buscarTecnico } from '../constants/tecnicos';
import { borrarSesion, guardarSesion, obtenerSesion } from '../storage/sesionRepository';
import { ReglaNegocioError } from './errors';

export async function restaurarSesion(): Promise<Sesion | null> {
  return obtenerSesion();
}

export async function iniciarSesion(codigo: string, clave: string): Promise<Sesion> {
  const codigoLimpio = codigo.trim();
  if (codigoLimpio.length === 0) {
    throw new ReglaNegocioError('CREDENCIALES', 'Ingresa tu código de empleado.');
  }
  if (codigoLimpio.length > 20) {
    throw new ReglaNegocioError(
      'CREDENCIALES',
      'El código de empleado no debe superar los 20 caracteres.',
    );
  }
  if (clave.length === 0) {
    throw new ReglaNegocioError('CREDENCIALES', 'Ingresa tu clave.');
  }
  if (clave.length > 60) {
    throw new ReglaNegocioError('CREDENCIALES', 'La clave no debe superar los 60 caracteres.');
  }

  const tecnico = buscarTecnico(codigoLimpio, clave);
  if (!tecnico) {
    throw new ReglaNegocioError(
      'CREDENCIALES',
      'El código de empleado o la clave no son correctos. Revisa los datos e inténtalo otra vez.',
    );
  }

  const sesion: Sesion = {
    codigoTecnico: tecnico.codigo,
    nombre: tecnico.nombre,
    zona: tecnico.zona,
    iniciadaEn: new Date().toISOString(),
  };

  await guardarSesion(sesion);
  return sesion;
}

export async function cerrarSesion(): Promise<void> {
  await borrarSesion();
}
