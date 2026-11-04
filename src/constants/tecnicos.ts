export interface TecnicoDemo {
  codigo: string;
  nombre: string;
  zona: string;
}

export const TECNICOS_DEMO: readonly TecnicoDemo[] = [
  {
    codigo: 'TEC-001',
    nombre: 'María Quishpe',
    zona: 'Nono',
  },
  {
    codigo: 'TEC-002',
    nombre: 'Diego Cabrera',
    zona: 'Lloa',
  },
];

export function buscarTecnicoPorCodigo(codigo: string): TecnicoDemo | null {
  const codigoLimpio = codigo.trim().toUpperCase();
  return TECNICOS_DEMO.find((tecnico) => tecnico.codigo === codigoLimpio) ?? null;
}
