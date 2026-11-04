import type { Sesion } from '../types/models';
import { borrarSesion, obtenerSesion } from '../storage/sesionRepository';

export async function restaurarSesion(): Promise<Sesion | null> {
  return obtenerSesion();
}

export async function cerrarSesion(): Promise<void> {
  await borrarSesion();
}
