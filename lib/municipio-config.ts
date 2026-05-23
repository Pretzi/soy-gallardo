export type Director = {
  id: string;
  name: string;
  cargo: string;
};

export type MunicipioConfig = {
  alcaldeName: string;
  alcaldeCargo: string;
  municipioLabel: string;
  directores: Director[];
  /** Maps report category id → director id */
  categoryDirectorMap: Record<string, string>;
};

export const DEFAULT_DIRECTORES: Director[] = [
  {
    id: 'obras-publicas',
    name: 'ARQ. RICARDO VELA RODRIGUEZ',
    cargo: 'DIRECTOR DE OBRAS PÚBLICAS',
  },
  {
    id: 'oroapa',
    name: 'C. JULIO CESAR PANTOJA MORA',
    cargo: 'DIRECTOR DE OROAPA',
  },
  {
    id: 'servicios-publicos',
    name: 'DIRECTOR DE SERVICIOS PÚBLICOS',
    cargo: 'DIRECTOR DE SERVICIOS PÚBLICOS',
  },
  {
    id: 'desarrollo-urbano',
    name: 'DIRECTOR DE DESARROLLO URBANO',
    cargo: 'DIRECTOR DE DESARROLLO URBANO',
  },
  {
    id: 'limpia',
    name: 'DIRECTOR DE LIMPIA PÚBLICA',
    cargo: 'DIRECTOR DE LIMPIA PÚBLICA',
  },
  {
    id: 'transito',
    name: 'DIRECTOR DE TRÁNSITO Y VIALIDAD',
    cargo: 'DIRECTOR DE TRÁNSITO Y VIALIDAD',
  },
  {
    id: 'proteccion-civil',
    name: 'DIRECTOR DE PROTECCIÓN CIVIL',
    cargo: 'DIRECTOR DE PROTECCIÓN CIVIL',
  },
];

/** Default category → director assignments */
export const DEFAULT_CATEGORY_DIRECTOR_MAP: Record<string, string> = {
  alcantarilla: 'obras-publicas',
  alumbrado: 'servicios-publicos',
  animales: 'oroapa',
  baches: 'obras-publicas',
  deshierbe: 'limpia',
  escombro: 'limpia',
  'falta-energia-electrica-cfe': 'servicios-publicos',
  'fuga-agua': 'obras-publicas',
  'fumigacion-mosquito': 'oroapa',
  'lote-baldio': 'limpia',
  'plaza-publica': 'servicios-publicos',
  'poste-danado': 'servicios-publicos',
  'recoleccion-basura': 'limpia',
  'reductores-velocidad': 'obras-publicas',
  senalamientos: 'transito',
  'transporte-publico': 'transito',
  'vehiculo-abandonado': 'transito',
  comercio: 'desarrollo-urbano',
  seguridad: 'proteccion-civil',
  ecologia: 'proteccion-civil',
  'banqueta-obstruida': 'desarrollo-urbano',
  'retiro-ramas': 'limpia',
  'barrido-manual': 'limpia',
  salubridad: 'oroapa',
  'obras-inconclusas': 'obras-publicas',
  construccion: 'desarrollo-urbano',
  'vecinos-ruidosos': 'proteccion-civil',
  otro: 'obras-publicas',
};

export const DEFAULT_MUNICIPIO_CONFIG: MunicipioConfig = {
  alcaldeName: 'LIC. EDUARDO GONZALEZ FERNANDEZ',
  alcaldeCargo: 'PRESIDENTE MUNICIPAL DE TIERRA BLANCA, VER.',
  municipioLabel: 'Tierra Blanca, Ver.',
  directores: DEFAULT_DIRECTORES,
  categoryDirectorMap: DEFAULT_CATEGORY_DIRECTOR_MAP,
};

export function getDirectorForCategory(
  config: MunicipioConfig,
  categoriaId?: string
): Director | undefined {
  if (!categoriaId) return config.directores[0];
  const directorId =
    config.categoryDirectorMap[categoriaId] ||
    DEFAULT_CATEGORY_DIRECTOR_MAP[categoriaId] ||
    'obras-publicas';
  return config.directores.find((d) => d.id === directorId) || config.directores[0];
}

export function mergeMunicipioConfig(partial?: Partial<MunicipioConfig> | null): MunicipioConfig {
  if (!partial) return DEFAULT_MUNICIPIO_CONFIG;
  return {
    alcaldeName: partial.alcaldeName?.trim() || DEFAULT_MUNICIPIO_CONFIG.alcaldeName,
    alcaldeCargo: partial.alcaldeCargo?.trim() || DEFAULT_MUNICIPIO_CONFIG.alcaldeCargo,
    municipioLabel: partial.municipioLabel?.trim() || DEFAULT_MUNICIPIO_CONFIG.municipioLabel,
    directores: partial.directores?.length ? partial.directores : DEFAULT_MUNICIPIO_CONFIG.directores,
    categoryDirectorMap: {
      ...DEFAULT_CATEGORY_DIRECTOR_MAP,
      ...partial.categoryDirectorMap,
    },
  };
}
