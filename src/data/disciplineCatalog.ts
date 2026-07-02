import { MacroArea, NodeType } from '@/src/types';
import { getMentalBranchGenOneChildren } from '@/src/data/mentalEmotionalGalaxyCatalog';
import { getPhysicalBranchGenOneChildren } from '@/src/data/physicalGalaxyCatalog';

export interface DisciplineChildSeed {
  slug: string;
  name: string;
  type: NodeType;
}

export interface DisciplineBundle {
  key: string;
  displayName: string;
  /** Palabras clave para emparejar el texto libre del usuario. */
  aliases: string[];
  children: DisciplineChildSeed[];
}

export const WILDCARD_PLACEHOLDER_NAME = 'Nodo de Selección';

export const DISCIPLINE_CATALOG: Record<MacroArea, DisciplineBundle[]> = {
  physical: [
    {
      key: 'gimnasio',
      displayName: 'Gimnasio (Hipertrofia y Fuerza en Rack)',
      aliases: ['gimnasio', 'gym', 'pesas', 'hipertrofia', 'musculación', 'musculacion', 'fuerza', 'weightlifting', 'rack'],
      children: [],
    },
    {
      key: 'judo',
      displayName: 'Judo Técnico',
      aliases: ['judo', 'tatami', 'dojo', 'cinturón', 'cinturon', 'ne-waza', 'ukemi', 'reiho', 'kuzushi'],
      children: [],
    },
    {
      key: 'fisioterapia',
      displayName: 'Fisioterapia de Blindaje Articular',
      aliases: ['fisioterapia', 'physio', 'rehab', 'movilidad', 'prevención lesiones', 'prevencion lesiones', 'articular', 'tejido conectivo'],
      children: [],
    },
  ],
  intellectual: [
    {
      key: 'guitar',
      displayName: 'Guitarra',
      aliases: ['guitarra', 'guitar', 'bajo', 'bass', 'ukulele'],
      children: [
        { slug: 'disc_guitar_acordes', name: 'Acordes abiertos', type: 'intellectual' },
        { slug: 'disc_guitar_escalas', name: 'Escalas pentatónicas', type: 'intellectual' },
        { slug: 'disc_guitar_repertorio', name: 'Repertorio', type: 'intellectual' },
      ],
    },
    {
      key: 'piano',
      displayName: 'Piano',
      aliases: ['piano', 'teclado', 'keyboard', 'sintetizador'],
      children: [
        { slug: 'disc_piano_digitacion', name: 'Digitación', type: 'intellectual' },
        { slug: 'disc_piano_lectura', name: 'Lectura rítmica', type: 'intellectual' },
        { slug: 'disc_piano_pieza', name: 'Pieza en progreso', type: 'intellectual' },
      ],
    },
    {
      key: 'language',
      displayName: 'Idioma',
      aliases: ['idioma', 'inglés', 'english', 'francés', 'japonés', 'alemán', 'español', 'language'],
      children: [
        { slug: 'disc_lang_vocabulario', name: 'Vocabulario', type: 'intellectual' },
        { slug: 'disc_lang_conversacion', name: 'Conversación', type: 'intellectual' },
        { slug: 'disc_lang_comprension', name: 'Comprensión auditiva', type: 'intellectual' },
      ],
    },
  ],
  mental_emotional: [
    {
      key: 'nervioso',
      displayName: 'Regulación del Sistema Nervioso',
      aliases: [
        'nervioso',
        'sistema nervioso',
        'regulación',
        'regulacion',
        'respiración',
        'respiracion',
        'calma',
        'estrés',
        'estres',
        'parasimpático',
        'parasimpatico',
      ],
      children: [],
    },
    {
      key: 'enfoque',
      displayName: 'Enfoque, Cognición Aguda y Lanzamiento de Apps',
      aliases: [
        'enfoque',
        'concentración',
        'concentracion',
        'atención',
        'atencion',
        'pomodoro',
        'flow',
        'cognición',
        'cognicion',
        'deep work',
      ],
      children: [],
    },
    {
      key: 'lectura',
      displayName: 'Lectura Estoica Diaria',
      aliases: [
        'lectura',
        'leer',
        'estoicismo',
        'meditaciones',
        'asimilación',
        'asimilacion',
        'journaling',
        'reflexión',
        'reflexion',
        'valores',
      ],
      children: [],
    },
  ],
  productive: [
    {
      key: 'coding',
      displayName: 'Desarrollo de Software e IA',
      aliases: [
        'programación',
        'programacion',
        'código',
        'codigo',
        'desarrollo',
        'software',
        'coding',
        'cursor',
        'supabase',
        'react native',
        'react-native',
        'roo code',
      ],
      children: [],
    },
    {
      key: 'writing',
      displayName: 'Creación de Contenido y Monetización Digital',
      aliases: [
        'escritura',
        'redacción',
        'redaccion',
        'blog',
        'novela',
        'copywriting',
        'youtube',
        'instagram',
        'monetización',
        'monetizacion',
        'contenido',
      ],
      children: [],
    },
    {
      key: 'design',
      displayName: 'Diseño y Marca Visual',
      aliases: [
        'diseño',
        'diseno',
        'figma',
        'ui',
        'ux',
        'ilustración',
        'ilustracion',
        'marca',
        'branding',
        'thumbnail',
      ],
      children: [],
    },
  ],
};

export function matchDisciplineBundle(
  input: string,
  macroArea: MacroArea
): DisciplineBundle | null {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;

  for (const bundle of DISCIPLINE_CATALOG[macroArea]) {
    if (normalized === bundle.key || normalized === bundle.displayName.toLowerCase()) {
      return bundle;
    }
    for (const alias of bundle.aliases) {
      const aliasNorm = alias.toLowerCase();
      if (
        normalized === aliasNorm ||
        normalized.includes(aliasNorm) ||
        aliasNorm.includes(normalized)
      ) {
        return bundle;
      }
    }
  }

  return null;
}

export function resolveDisciplineChildren(
  customName: string,
  macroArea: MacroArea
): { bundleKey: string; children: DisciplineChildSeed[] } {
  const matched = matchDisciplineBundle(customName, macroArea);
  if (matched) {
    if (macroArea === 'physical') {
      const galaxyChildren = getPhysicalBranchGenOneChildren(matched.key);
      if (galaxyChildren.length > 0) {
        return { bundleKey: matched.key, children: galaxyChildren };
      }
    }
    if (macroArea === 'mental_emotional') {
      const galaxyChildren = getMentalBranchGenOneChildren(matched.key);
      if (galaxyChildren.length > 0) {
        return { bundleKey: matched.key, children: galaxyChildren };
      }
    }
    return { bundleKey: matched.key, children: matched.children };
  }

  const label = customName.trim();
  const base = slugify(label) || 'custom';
  const type = macroArea === 'physical' ? 'physical' : 'intellectual';
  return {
    bundleKey: 'custom',
    children: [
      { slug: `disc_${base}_fundamentos`, name: `${label} — Fundamentos`, type },
      { slug: `disc_${base}_practica`, name: `${label} — Práctica`, type },
      { slug: `disc_${base}_dominio`, name: `${label} — Dominio`, type },
    ],
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 24);
}
