import { fechaLocalISO } from '../utils/fechas';

export const TIPOS_ESTADO = ['normal', 'inaccesible', 'danado'] as const;
export type TipoEstadoLectura = (typeof TIPOS_ESTADO)[number];

export const ESTADOS_VERIFICACION = [
  'pendiente',
  'verificada',
  'anomalia_confirmada',
  'anomalia_pendiente',
  'no_aplica',
] as const;
export type EstadoVerificacion = (typeof ESTADOS_VERIFICACION)[number];

export const ESTADOS_ENVIO = ['pendiente', 'enviando', 'enviado', 'requiere_revision'] as const;
export type EstadoEnvio = (typeof ESTADOS_ENVIO)[number];

export const PASOS_REGISTRO = [1, 2, 3] as const;
export type PasoRegistro = (typeof PASOS_REGISTRO)[number];

export interface Sesion {
  codigoTecnico: string;
  nombre: string;
  zona: string;
  iniciadaEn: string;
}

export interface Medidor {
  idRemoto: string | null;
  codigo: string;
  direccion: string;
  sector: string;
  numeroCuenta: string;
  estado: string;
  ultimaLectura: number | null;
  fechaUltimaLectura: string | null;
  consumoPromedioMensual: number | null;
  consultadoEn: string;
}

export interface MedidorRemoto {
  id: string;
  codigo: string;
  direccion: string;
  sector: string;
  numeroCuenta: string;
  estado: string;
  ultimaLectura: number | null;
  fechaUltimaLectura: string | null;
  consumoPromedioMensual: number | null;
}

export interface Lectura {
  localId: string;
  idRemoto: string | null;
  codigoMedidor: string;
  medidorId: string | null;
  codigoTecnico: string;
  fechaRegistro: string;
  periodo: string;
  tipoEstado: TipoEstadoLectura;
  lecturaActual: number | null;
  ultimaLecturaReferencia: number | null;
  consumoCalculado: number | null;
  consumoPromedioReferencia: number | null;
  motivoInaccesible: string | null;
  descripcionDano: string | null;
  fotoUri: string | null;
  fotoUrl: string | null;
  confirmacionRevision: boolean;
  estadoVerificacion: EstadoVerificacion;
  estadoEnvio: EstadoEnvio;
  intentosEnvio: number;
  fechaEnvio: string | null;
  mensajeError: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface LecturaRemota {
  id: string;
  localId: string;
  medidorId: string | null;
  codigoMedidor: string;
  codigoTecnico: string | null;
  fechaRegistro: string | null;
  periodo: string;
  tipoEstado: TipoEstadoLectura;
  lecturaActual: number | null;
  estadoVerificacion: string | null;
}

export interface DatosFormulario {
  tipoEstado: TipoEstadoLectura;
  /**
   * Día calendario local (`YYYY-MM-DD`) en el que se realizó la lectura.
   * Es opcional para poder leer borradores creados antes de incorporar el
   * selector de fecha; las capturas nuevas siempre lo completan.
   */
  fechaRegistro?: string;
  lecturaActual: string;
  motivoInaccesible: string;
  descripcionDano: string;
  confirmacionRevision: boolean;
}

export interface Borrador {
  localId: string;
  codigoMedidor: string;
  codigoTecnico: string;
  paso: PasoRegistro;
  datos: DatosFormulario;
  fotoUri: string | null;
  lecturaLocalId: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ResumenLecturas {
  pendientes: number;
  revision: number;
  enviadas: number;
  total: number;
}

export interface EvaluacionConsumo {
  consumo: number | null;
  umbral: number | null;
  anomalia: boolean;
  evaluable: boolean;
  motivo: 'sin_lectura' | 'sin_anterior' | 'sin_promedio' | null;
}

export type OrigenMedidor = 'cache' | 'remoto';

export interface MedidorConOrigen {
  medidor: Medidor;
  origen: OrigenMedidor;
  advertencia: string | null;
}

export type FiltroLecturas = 'todas' | 'pendientes' | 'enviadas';

export const DATOS_FORMULARIO_VACIOS: DatosFormulario = {
  tipoEstado: 'normal',
  fechaRegistro: fechaLocalISO(),
  lecturaActual: '',
  motivoInaccesible: '',
  descripcionDano: '',
  confirmacionRevision: false,
};
