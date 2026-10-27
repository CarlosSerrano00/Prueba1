import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { contarBorradoresConFoto } from '../storage/borradoresRepository';
import { contarLecturasConFoto } from '../storage/lecturasRepository';
import { PermisoCamaraError } from './errors';

const CARPETA_FOTOS = 'fotos-lecturas';

function obtenerDirectorio(): Directory {
  const directorio = new Directory(Paths.document, CARPETA_FOTOS);
  if (!directorio.exists) {
    directorio.create({ intermediates: true, idempotent: true });
  }
  return directorio;
}

function extensionDe(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.fileName?.includes('.')) {
    const extension = asset.fileName.split('.').pop()?.toLowerCase();
    if (extension && /^[a-z0-9]{2,5}$/.test(extension)) return `.${extension}`;
  }
  if (asset.mimeType === 'image/png') return '.png';
  if (asset.mimeType === 'image/webp') return '.webp';
  return '.jpg';
}

function limpiarNombre(valor: string): string {
  return valor.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
}

/**
 * R7: la cámara entrega la foto en la caché temporal. Se copia de inmediato
 * a Paths.document para que siga existiendo aunque el sistema limpie la caché
 * o el teléfono se reinicie antes de enviar la lectura.
 */
export async function tomarFoto(nombreBase: string): Promise<string | null> {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) {
    throw new PermisoCamaraError(permiso.canAskAgain);
  }

  const resultado = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.55,
    cameraType: ImagePicker.CameraType.back,
  });

  if (resultado.canceled || !resultado.assets[0]) return null;

  const asset = resultado.assets[0];
  const directorio = obtenerDirectorio();
  const destino = new File(
    directorio,
    `${limpiarNombre(nombreBase)}_${Date.now()}${extensionDe(asset)}`,
  );

  try {
    const origen = new File(asset.uri);
    await origen.copy(destino);
  } catch {
    throw new Error(
      'La foto se tomó, pero no se pudo guardar en el almacenamiento del teléfono. Inténtalo otra vez.',
    );
  }

  return destino.uri;
}

export function nombreArchivoFoto(uri: string | null): string | null {
  if (!uri) return null;
  const partes = uri.split(/[\\/]/);
  return partes[partes.length - 1] || null;
}

export function eliminarFoto(uri: string | null): void {
  if (!uri) return;
  try {
    const archivo = new File(uri);
    if (archivo.exists) archivo.delete();
  } catch {
    // La lectura ya no depende del archivo; no se bloquea el flujo por esto.
  }
}

/**
 * Una foto puede estar referenciada por una lectura enviada/pendiente o por
 * un borrador. Solo se elimina del disco cuando ya no la usa nadie.
 */
export async function eliminarFotoSiHuerfana(uri: string | null): Promise<void> {
  if (!uri) return;
  try {
    const [enLecturas, enBorradores] = await Promise.all([
      contarLecturasConFoto(uri),
      contarBorradoresConFoto(uri),
    ]);
    if (enLecturas === 0 && enBorradores === 0) eliminarFoto(uri);
  } catch {
    // Mantener un archivo huérfano es preferible a borrar una evidencia.
  }
}
