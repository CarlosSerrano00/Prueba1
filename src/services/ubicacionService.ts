import * as Location from 'expo-location';

import type { UbicacionLectura } from '../types/models';

export class PermisoUbicacionError extends Error {
  constructor(
    message: string,
    readonly puedeReintentar: boolean,
  ) {
    super(message);
    this.name = 'PermisoUbicacionError';
  }
}

export async function obtenerUbicacionActual(): Promise<UbicacionLectura> {
  const permiso = await Location.requestForegroundPermissionsAsync();
  if (!permiso.granted) {
    throw new PermisoUbicacionError(
      'No se concedió el permiso de ubicación. Puedes habilitarlo en los ajustes o marcar el punto manualmente en el mapa.',
      permiso.canAskAgain,
    );
  }

  const posicion = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitud: posicion.coords.latitude,
    longitud: posicion.coords.longitude,
    origen: 'gps',
  };
}
