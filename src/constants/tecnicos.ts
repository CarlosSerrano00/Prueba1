export interface TecnicoDemo {
  codigo: string;
  clave: string;
  nombre: string;
  zona: string;
}

/**
 * Datos quemados permitidos por el enunciado. La clave nunca se guarda
 * en SQLite: solo se usa para validar el inicio de sesión.
 */
export const TECNICOS_DEMO: readonly TecnicoDemo[] = [
  {
    codigo: 'TEC-001',
    clave: 'agua2026',
    nombre: 'María Quishpe',
    zona: 'Nono',
  },
  {
    codigo: 'TEC-002',
    clave: 'agua2026',
    nombre: 'Diego Cabrera',
    zona: 'Lloa',
  },
];

export function buscarTecnico(codigo: string, clave: string): TecnicoDemo | null {
  const codigoLimpio = codigo.trim();
  const tecnico = TECNICOS_DEMO.find((item) => item.codigo === codigoLimpio);
  if (!tecnico || tecnico.clave !== clave) return null;
  return tecnico;
}
