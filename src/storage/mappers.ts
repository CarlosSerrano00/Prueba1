import type {
  Borrador,
  DatosFormulario,
  Lectura,
  Medidor,
  PasoRegistro,
  TipoEstadoLectura,
} from '../types/models';
import { DATOS_FORMULARIO_VACIOS } from '../types/models';

export interface MedidorRow {
  codigo: string;
  id_remoto: string | null;
  direccion: string;
  sector: string;
  numero_cuenta: string;
  estado: string;
  ultima_lectura: number | null;
  fecha_ultima_lectura: string | null;
  consumo_promedio_mensual: number | null;
  consultado_en: string;
}

export interface LecturaRow {
  local_id: string;
  id_remoto: string | null;
  codigo_medidor: string;
  medidor_id: string | null;
  codigo_tecnico: string;
  fecha_registro: string;
  periodo: string;
  tipo_estado: TipoEstadoLectura;
  lectura_actual: number | null;
  ultima_lectura_referencia: number | null;
  consumo_calculado: number | null;
  consumo_promedio_referencia: number | null;
  motivo_inaccesible: string | null;
  descripcion_dano: string | null;
  foto_uri: string | null;
  foto_url: string | null;
  confirmacion_revision: number;
  estado_verificacion: Lectura['estadoVerificacion'];
  estado_envio: Lectura['estadoEnvio'];
  intentos_envio: number;
  fecha_envio: string | null;
  mensaje_error: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface BorradorRow {
  local_id: string;
  codigo_medidor: string;
  codigo_tecnico: string;
  paso: number;
  datos_json: string;
  foto_uri: string | null;
  lectura_local_id: string | null;
  creado_en: string;
  actualizado_en: string;
}

export function mapMedidor(row: MedidorRow): Medidor {
  return {
    idRemoto: row.id_remoto,
    codigo: row.codigo,
    direccion: row.direccion,
    sector: row.sector,
    numeroCuenta: row.numero_cuenta,
    estado: row.estado,
    ultimaLectura: row.ultima_lectura,
    fechaUltimaLectura: row.fecha_ultima_lectura,
    consumoPromedioMensual: row.consumo_promedio_mensual,
    consultadoEn: row.consultado_en,
  };
}

export function mapLectura(row: LecturaRow): Lectura {
  return {
    localId: row.local_id,
    idRemoto: row.id_remoto,
    codigoMedidor: row.codigo_medidor,
    medidorId: row.medidor_id,
    codigoTecnico: row.codigo_tecnico,
    fechaRegistro: row.fecha_registro,
    periodo: row.periodo,
    tipoEstado: row.tipo_estado,
    lecturaActual: row.lectura_actual,
    ultimaLecturaReferencia: row.ultima_lectura_referencia,
    consumoCalculado: row.consumo_calculado,
    consumoPromedioReferencia: row.consumo_promedio_referencia,
    motivoInaccesible: row.motivo_inaccesible,
    descripcionDano: row.descripcion_dano,
    fotoUri: row.foto_uri,
    fotoUrl: row.foto_url,
    confirmacionRevision: row.confirmacion_revision === 1,
    estadoVerificacion: row.estado_verificacion,
    estadoEnvio: row.estado_envio,
    intentosEnvio: row.intentos_envio,
    fechaEnvio: row.fecha_envio,
    mensajeError: row.mensaje_error,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}

function esTipoEstado(valor: unknown): valor is TipoEstadoLectura {
  return valor === 'normal' || valor === 'inaccesible' || valor === 'danado';
}

function parsearDatos(valor: string): DatosFormulario {
  try {
    const objeto = JSON.parse(valor) as Partial<DatosFormulario>;
    return {
      tipoEstado: esTipoEstado(objeto.tipoEstado) ? objeto.tipoEstado : 'normal',
      lecturaActual: typeof objeto.lecturaActual === 'string' ? objeto.lecturaActual : '',
      motivoInaccesible:
        typeof objeto.motivoInaccesible === 'string' ? objeto.motivoInaccesible : '',
      descripcionDano: typeof objeto.descripcionDano === 'string' ? objeto.descripcionDano : '',
      confirmacionRevision: objeto.confirmacionRevision === true,
    };
  } catch {
    return { ...DATOS_FORMULARIO_VACIOS };
  }
}

function pasoValido(valor: number): PasoRegistro {
  if (valor === 2) return 2;
  if (valor === 3) return 3;
  return 1;
}

export function mapBorrador(row: BorradorRow): Borrador {
  return {
    localId: row.local_id,
    codigoMedidor: row.codigo_medidor,
    codigoTecnico: row.codigo_tecnico,
    paso: pasoValido(row.paso),
    datos: parsearDatos(row.datos_json),
    fotoUri: row.foto_uri,
    lecturaLocalId: row.lectura_local_id,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}
