export type UserProfile = 'young' | 'adult';

export type NodeType = 'intellectual' | 'physical';

export type NodeLayer = 'custom' | 'root' | 'guide' | 'dormant' | 'wildcard' | 'locked';

export type MacroArea =
  | 'physical'
  | 'intellectual'
  | 'mental_emotional'
  | 'productive';

export type SkinId = 'rpg' | 'cyberpunk' | 'minimal';

export type TreeViewMode = 'classic' | 'advanced';

export type DecayState = 'healthy' | 'warning' | 'decaying';

export interface User {
  id: number;
  profile: UserProfile;
  xpGainModifier: number;
  decaySpeedModifier: number;
  retentionShield: boolean;
  onboardingComplete: boolean;
  selectedSkin: SkinId;
  treeViewMode: TreeViewMode;
  practiceFrequency: OnboardingAnswers['practiceFrequency'] | null;
  focusPreference: OnboardingAnswers['focusPreference'] | null;
  retentionConcern: boolean | null;
  goalType: OnboardingAnswers['goalType'] | null;
  practiceReminderEnabled: boolean;
  practiceReminderHour: number;
  createdAt: string;
}

export type NodeColorRole = 'critical' | 'shared' | 'standard' | 'wildcard';

export type DecayCategoria =
  | 'motor_explosivo'
  | 'motor_movilidad'
  | 'habito_diario'
  | 'cognitivo_filosofico'
  | 'tecnico_digital'
  | 'creativo_produccion';

export type CalidadSesion = 'parcial' | 'completa' | 'extendida';

export interface SessionQualityEntry {
  fecha: string;
  calidad: CalidadSesion;
}

export interface SkillNode {
  id: number;
  slug: string | null;
  name: string;
  type: NodeType;
  layer: NodeLayer;
  macroArea: MacroArea;
  xp: number;
  level: number;
  posX: number;
  posY: number;
  lastPracticeAt: string | null;
  weeklyXpSessions: number;
  weekStartAt: string | null;
  /** Verificación diaria (check) — independiente de XP y nivel. */
  dailyVerifiedAt: string | null;
  /** Calidad del último check diario. */
  sessionQuality: CalidadSesion | null;
  /** Historial de las últimas 7 sesiones registradas. */
  sessionQualityHistory: SessionQualityEntry[] | null;
  guideUrl: string | null;
  colorRole: NodeColorRole | null;
  parentId: number | null;
  originPosX: number | null;
  originPosY: number | null;
  /** Borrado lógico — oculto del mapa pero recuperable con XP y posición intactos. */
  isDeleted: boolean;
  /** Categoría científica de decay del radar Nen (no afecta XP del nodo). */
  decayCategoria: DecayCategoria | null;
  createdAt: string;
}

export interface HistoryLog {
  id: number;
  nodeId: number;
  action: 'xp_gain' | 'xp_excess' | 'decay' | 'create' | 'banish' | 'reactivate' | 'daily_check';
  amount: number;
  timestamp: string;
}

export interface UserStatus {
  activeTitle: string;
  legacyTitle: string | null;
  legacyTags: string[];
  dominantAreas: MacroArea[];
  areaLevels: Record<MacroArea, number>;
}

export interface OnboardingAnswers {
  ageRange: UserProfile;
  practiceFrequency: 'daily' | 'weekly' | 'occasional';
  focusPreference: 'physical' | 'intellectual' | 'balanced';
  retentionConcern: boolean;
  goalType: 'mastery' | 'maintenance' | 'exploration';
}

export interface AppTheme {
  id: SkinId;
  name: string;
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
  nodeCustom: string;
  nodeGuide: string;
  nodeBorder: string;
  tabBar: string;
  tabBarActive: string;
  legacyTag: string;
}

export interface TreeEdge {
  fromId: number;
  toId: number;
  strength: number;
}

export interface NodeCenter {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
