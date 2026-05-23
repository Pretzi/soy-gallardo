export type ReportSubcategory = {
  id: string;
  label: string;
  emoji: string;
};

export type ReportCategory = {
  id: string;
  label: string;
  emoji: string;
  subcategories: ReportSubcategory[];
};

/** @deprecated Legacy report types — kept for older reportes stored with `tipo` only */
export type ReportType = {
  id: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  accentColor: string;
  emoji: string;
  imagePrompt: string;
};

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

type SubcategoryEntry = [label: string, emoji: string];

function buildSubcategories(entries: SubcategoryEntry[]): ReportSubcategory[] {
  return entries.map(([label, emoji]) => ({ id: slugify(label), label, emoji }));
}

function buildCategory(
  label: string,
  emoji: string,
  subcategories: SubcategoryEntry[]
): ReportCategory {
  return {
    id: slugify(label),
    label,
    emoji,
    subcategories: buildSubcategories(subcategories),
  };
}

const CATEGORY_DATA: [string, string, SubcategoryEntry[]][] = [
  ['Alcantarilla', '🕳️', [
    ['Alcantarilla sin tapa', '🚫'],
    ['Tapa suelta o quebrada', '🔧'],
    ['Desazolves pluviales', '🌧️'],
    ['Desnivel', '📐'],
    ['Limpieza de rejilla', '🧹'],
    ['Otro', '📋'],
  ]],
  ['Alumbrado', '💡', [
    ['Luminaria apagada', '🌑'],
    ['Luminaria prendida de día', '☀️'],
    ['Luminaria dañada o en mal estado', '💥'],
    ['Luminaria intermitente', '⚡'],
    ['Luminaria Nueva', '✨'],
    ['Cables expuestos', '🔌'],
    ['Otro', '📋'],
  ]],
  ['Animales', '🐕', [
    ['Animal muerto en vía pública', '💀'],
    ['Agresión', '😠'],
    ['Maltrato', '🚫'],
    ['Perro callejero', '🐕'],
    ['Otro', '📋'],
  ]],
  ['Baches', '🕳️', [
    ['Bache', '🕳️'],
    ['Hundimiento', '⬇️'],
    ['Pavimento agrietado', '〰️'],
    ['Socavón', '🕳️'],
    ['Reparación total de carpeta asfáltica', '🛣️'],
    ['Otro', '📋'],
  ]],
  ['Deshierbe', '🌿', [
    ['Camellones', '🌿'],
    ['Plaza pública', '🏛️'],
    ['Banqueta', '🚶'],
    ['Lotes baldíos', '🏚️'],
    ['Arroyo o talud', '🏞️'],
    ['Canchas Deportivas', '⚽'],
    ['Otro', '📋'],
  ]],
  ['Escombro', '🧱', [
    ['Plaza publica', '🏛️'],
    ['Camellones', '🌿'],
    ['Escuelas públicas', '🏫'],
    ['Vía pública', '🛣️'],
    ['Casa habitación', '🏠'],
    ['Otro', '📋'],
  ]],
  ['Falta de Energía Eléctrica CFE', '⚡', [
    ['Colonia CFE', '🏘️'],
    ['Otro', '📋'],
  ]],
  ['Fuga de Agua', '💧', [
    ['En vía pública', '🛣️'],
    ['Plaza pública', '🏛️'],
    ['Aguas Negras/Drenaje', '🚰'],
    ['Otro', '📋'],
  ]],
  ['Fumigación Mosquito', '🦟', [
    ['Lote baldío', '🏚️'],
    ['En tu colonia', '🏘️'],
    ['Plaza pública', '🏛️'],
    ['Escuela pública', '🏫'],
    ['Otro', '📋'],
  ]],
  ['Lote baldío', '🏚️', [
    ['Deshierbe', '🌿'],
    ['Escombro basura', '🧱'],
    ['Fumigación Mosquito', '🦟'],
    ['Animales muertos', '💀'],
    ['Otro', '📋'],
  ]],
  ['Plaza pública', '🏛️', [
    ['Mantenimiento general', '🔧'],
    ['Deshierbe', '🌿'],
    ['Fumigación Mosquito', '🦟'],
    ['Recolección de basura', '🗑️'],
    ['Pintura', '🎨'],
    ['Reparación', '🛠️'],
    ['Otro', '📋'],
  ]],
  ['Poste dañado', '📡', [
    ['Poste caído', '📉'],
    ['Poste en riesgo', '⚠️'],
    ['Cables caídos', '🔌'],
    ['Otro', '📋'],
  ]],
  ['Recolección de basura', '🗑️', [
    ['No acudió unidad', '🚛'],
    ['Basura en plaza pública', '🏛️'],
    ['Árboles caídos en vía pública', '🌳'],
    ['Descacharrización', '🛋️'],
    ['Llantas', '🛞'],
    ['Otro', '📋'],
  ]],
  ['Reductores de velocidad', '🐢', [
    ['Instalación', '➕'],
    ['Reductor dañado', '💥'],
    ['Sin pintura', '🎨'],
    ['Otro', '📋'],
  ]],
  ['Señalamientos', '🚦', [
    ['Semáforo descompuesto', '🚦'],
    ['Señalamiento dañado', '🪧'],
    ['Falta de señalamiento', '❓'],
    ['Delimitación de carriles', '🛣️'],
    ['Pintura en reductores de velocidad', '🎨'],
    ['Nomenclatura Mantenimiento', '🔤'],
    ['Otro', '📋'],
  ]],
  ['Transporte público', '🚌', [
    ['Mal servicio', '😤'],
    ['Falta de parabus', '🚏'],
    ['Mantenimiento Parabus', '🔧'],
    ['Otro', '📋'],
  ]],
  ['Vehículo abandonado', '🚗', [
    ['Vehículo abandonado', '🚗'],
    ['Otro', '📋'],
  ]],
  ['Comercio', '🏪', [
    ['Venta de Alcohol Fuera de Horario', '🍺'],
    ['Verificación de Uso de Suelo', '📋'],
    ['Obstrucción de la Vía Pública', '🚧'],
    ['Informal', '🛒'],
    ['Ruido Excesivo', '🔊'],
    ['Otro', '📋'],
  ]],
  ['Seguridad', '🚨', [
    ['Presencia Policial', '👮'],
    ['Agente de Transito', '🚔'],
    ['Carro en Lugar Prohibido', '🚫'],
    ['Otro', '📋'],
  ]],
  ['Ecología', '🌱', [
    ['Denuncia de Escombro', '🧱'],
    ['Olores', '👃'],
    ['Ruido de Empresas o Talleres', '🔊'],
    ['Otro', '📋'],
  ]],
  ['Banqueta Obstruida', '🚧', [
    ['Estructura', '🏗️'],
    ['Botes', '🪣'],
    ['Jardineras', '🪴'],
    ['Otros', '📋'],
  ]],
  ['Retiro de Ramas', '🌳', [
    ['En vía pública', '🛣️'],
    ['En plaza pública', '🏛️'],
    ['En Domicilio', '🏠'],
    ['Otro', '📋'],
  ]],
  ['Barrido Manual', '🧹', [
    ['Plaza pública', '🏛️'],
    ['Avenidas y Camellones', '🛣️'],
    ['Otro', '📋'],
  ]],
  ['Salubridad', '🏥', [
    ['Domicilio Insalubre', '🏠'],
    ['Otro', '📋'],
  ]],
  ['Obras Inconclusas', '🚧', [
    ['Pluvial', '🌧️'],
    ['Bache', '🕳️'],
    ['Carretera, Avenida y Calle', '🛣️'],
    ['Otro', '📋'],
  ]],
  ['Construcción', '🏗️', [
    ['Verificación de construcción', '🔍'],
    ['Otro', '📋'],
  ]],
  ['Vecinos ruidosos', '🔊', [
    ['Música alta', '🎵'],
    ['Fiestas o reuniones ruidosas', '🎉'],
    ['Gritos o disturbios', '📢'],
    ['Ruido de mascotas', '🐾'],
    ['Ruido constante en domicilio', '🏠'],
    ['Otro', '📋'],
  ]],
  ['Otro', '📋', [
    ['Reporte no clasificado', '❓'],
    ['Solicitud ciudadana general', '📝'],
    ['Daño en vía pública', '🛣️'],
    ['Riesgo para peatones o vehículos', '⚠️'],
    ['Problema recurrente en la colonia', '🔁'],
    ['Atención urgente', '🆘'],
    ['Otro', '📋'],
  ]],
];

export const REPORT_CATEGORIES: ReportCategory[] = CATEGORY_DATA.map(([label, emoji, subs]) =>
  buildCategory(label, emoji, subs)
);

/** @deprecated Use REPORT_CATEGORIES — kept for legacy reportes */
export const REPORT_TYPES: ReportType[] = [
  {
    id: 'baches',
    label: 'Baches y Pavimento',
    description: 'Hoyos, grietas o deterioro en calles y banquetas',
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    accentColor: 'bg-red-500',
    emoji: '🕳️',
    imagePrompt: 'Flat icon of a road with a pothole, municipal services style, clean vector art, orange and red colors',
  },
  {
    id: 'alumbrado',
    label: 'Alumbrado Público',
    description: 'Lámparas apagadas, postes dañados o cables sueltos',
    color: 'amber',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    accentColor: 'bg-amber-500',
    emoji: '💡',
    imagePrompt: 'Flat icon of a street lamp that is broken or dark, municipal services style, clean vector art, amber and yellow colors',
  },
  {
    id: 'agua',
    label: 'Agua y Drenaje',
    description: 'Fugas de agua, drenaje tapado o inundaciones',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    accentColor: 'bg-blue-500',
    emoji: '💧',
    imagePrompt: 'Flat icon of a water pipe with a leak, municipal services style, clean vector art, blue colors',
  },
  {
    id: 'basura',
    label: 'Recolección de Basura',
    description: 'Basura sin recoger, contenedores dañados o tiraderos',
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    accentColor: 'bg-green-500',
    emoji: '🗑️',
    imagePrompt: 'Flat icon of overflowing trash bins on a street, municipal services style, clean vector art, green colors',
  },
  {
    id: 'parques',
    label: 'Parques y Jardines',
    description: 'Áreas verdes descuidadas, juegos rotos o bancas dañadas',
    color: 'emerald',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    accentColor: 'bg-emerald-500',
    emoji: '🌳',
    imagePrompt: 'Flat icon of a neglected park with overgrown grass, municipal services style, clean vector art, emerald green colors',
  },
  {
    id: 'semaforos',
    label: 'Semáforos y Señales',
    description: 'Semáforos dañados, señales viales faltantes o caídas',
    color: 'orange',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    accentColor: 'bg-orange-500',
    emoji: '🚦',
    imagePrompt: 'Flat icon of a broken traffic light, municipal services style, clean vector art, orange colors',
  },
  {
    id: 'arboles',
    label: 'Árboles Peligrosos',
    description: 'Árboles caídos, ramas peligrosas o raíces dañando banquetas',
    color: 'lime',
    bgColor: 'bg-lime-50',
    textColor: 'text-lime-700',
    borderColor: 'border-lime-200',
    accentColor: 'bg-lime-500',
    emoji: '🌲',
    imagePrompt: 'Flat icon of a fallen dangerous tree on a sidewalk, municipal services style, clean vector art, lime green colors',
  },
  {
    id: 'vandalismo',
    label: 'Vandalismo',
    description: 'Grafiti, daños a propiedad pública o equipamiento urbano',
    color: 'violet',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-200',
    accentColor: 'bg-violet-500',
    emoji: '🎨',
    imagePrompt: 'Flat icon of graffiti on a public wall, municipal services style, clean vector art, violet purple colors',
  },
  {
    id: 'seguridad',
    label: 'Seguridad',
    description: 'Situaciones de inseguridad, alumbrado deficiente o zonas de riesgo',
    color: 'pink',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
    accentColor: 'bg-pink-500',
    emoji: '🚨',
    imagePrompt: 'Flat icon of a security alert or warning sign in a neighborhood, municipal services style, clean vector art, pink and red colors',
  },
  {
    id: 'animales',
    label: 'Animales',
    description: 'Animales callejeros, fauna dañina o mascotas abandonadas',
    color: 'purple',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    accentColor: 'bg-purple-500',
    emoji: '🐕',
    imagePrompt: 'Flat icon of a stray dog on a street, municipal services style, clean vector art, purple colors',
  },
  {
    id: 'ruido',
    label: 'Ruido Excesivo',
    description: 'Actividades con ruido excesivo que perturban la paz',
    color: 'cyan',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-200',
    accentColor: 'bg-cyan-500',
    emoji: '🔊',
    imagePrompt: 'Flat icon of sound waves and noise pollution in a neighborhood, municipal services style, clean vector art, cyan colors',
  },
  {
    id: 'otros',
    label: 'Otros',
    description: 'Cualquier otro problema municipal que necesite atención',
    color: 'slate',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-200',
    accentColor: 'bg-slate-500',
    emoji: '📋',
    imagePrompt: 'Flat icon of a municipal services clipboard with checkmarks, clean vector art, slate gray colors',
  },
];

export type ReportClassification = {
  emoji: string;
  categoryLabel: string;
  subcategoryLabel: string | null;
  displayLabel: string;
  isLegacy: boolean;
};

export function getReportCategory(id: string): ReportCategory | undefined {
  return REPORT_CATEGORIES.find((c) => c.id === id);
}

export function getReportSubcategory(
  categoryId: string,
  subcategoryId: string
): ReportSubcategory | undefined {
  return getReportCategory(categoryId)?.subcategories.find((s) => s.id === subcategoryId);
}

/** @deprecated Use getReportCategory */
export function getReportType(id: string): ReportType | undefined {
  return REPORT_TYPES.find((t) => t.id === id);
}

export function getReportClassification(reporte: {
  tipo?: string;
  categoria?: string;
  subcategoria?: string;
}): ReportClassification {
  if (reporte.categoria) {
    const category = getReportCategory(reporte.categoria);
    const subcategory = reporte.subcategoria
      ? getReportSubcategory(reporte.categoria, reporte.subcategoria)
      : undefined;

    const categoryLabel = category?.label || reporte.categoria;
    const subcategoryLabel = subcategory?.label || reporte.subcategoria || null;
    const displayLabel = subcategoryLabel
      ? `${categoryLabel} · ${subcategoryLabel}`
      : categoryLabel;

    return {
      emoji: subcategory?.emoji || category?.emoji || '📋',
      categoryLabel,
      subcategoryLabel,
      displayLabel,
      isLegacy: false,
    };
  }

  const legacy = reporte.tipo ? getReportType(reporte.tipo) : undefined;
  return {
    emoji: legacy?.emoji || '📋',
    categoryLabel: legacy?.label || reporte.tipo || 'Reporte',
    subcategoryLabel: null,
    displayLabel: legacy?.label || reporte.tipo || 'Reporte',
    isLegacy: true,
  };
}
