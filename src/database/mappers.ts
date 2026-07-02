import {
  DecayCategoria,
  CalidadSesion,
  MacroArea,
  NodeType,
  OnboardingAnswers,
  SessionQualityEntry,
  SkillNode,
  SkinId,
  TreeViewMode,
  User,
  UserProfile,
} from '@/src/types';

function parseSessionQualityHistory(raw: unknown): SessionQualityEntry[] | null {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const entries: SessionQualityEntry[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === 'object' &&
        typeof (item as SessionQualityEntry).fecha === 'string' &&
        typeof (item as SessionQualityEntry).calidad === 'string'
      ) {
        const calidad = (item as SessionQualityEntry).calidad;
        if (calidad === 'parcial' || calidad === 'completa' || calidad === 'extendida') {
          entries.push({ fecha: (item as SessionQualityEntry).fecha, calidad });
        }
      }
    }
    return entries.length > 0 ? entries.slice(-7) : null;
  } catch {
    return null;
  }
}

function parseSessionQuality(raw: unknown): CalidadSesion | null {
  if (raw === 'parcial' || raw === 'completa' || raw === 'extendida') return raw;
  return null;
}

export function mapUser(row: Record<string, unknown>): User {
  return {
    id: row.id as number,
    profile: row.profile as UserProfile,
    xpGainModifier: Number(row.xp_gain_modifier),
    decaySpeedModifier: Number(row.decay_speed_modifier),
    retentionShield: Boolean(row.retention_shield),
    onboardingComplete: Boolean(row.onboarding_complete),
    selectedSkin: row.selected_skin as SkinId,
    treeViewMode: (row.tree_view_mode as TreeViewMode) ?? 'advanced',
    practiceFrequency: (row.practice_frequency as OnboardingAnswers['practiceFrequency']) ?? null,
    focusPreference: (row.focus_preference as OnboardingAnswers['focusPreference']) ?? null,
    retentionConcern:
      row.retention_concern != null ? Boolean(row.retention_concern) : null,
    goalType: (row.goal_type as OnboardingAnswers['goalType']) ?? null,
    practiceReminderEnabled: Boolean(row.practice_reminder_enabled),
    practiceReminderHour: Number(row.practice_reminder_hour ?? 9),
    createdAt: row.created_at as string,
  };
}

export function mapNode(row: Record<string, unknown>): SkillNode {
  const slug = typeof row.slug === 'string' ? row.slug : null;

  return {
    id: row.id as number,
    slug: slug && slug.length > 0 ? slug : null,
    name: row.name as string,
    type: row.type as NodeType,
    layer: row.layer as SkillNode['layer'],
    macroArea: row.macro_area as MacroArea,
    xp: Number(row.xp),
    level: Number(row.level),
    posX: Number(row.pos_x),
    posY: Number(row.pos_y),
    lastPracticeAt: (row.last_practice_at as string) ?? null,
    weeklyXpSessions: Number(row.weekly_xp_sessions ?? 0),
    weekStartAt: (row.week_start_at as string) ?? null,
    dailyVerifiedAt: (row.daily_verified_at as string) ?? null,
    sessionQuality: parseSessionQuality(row.session_quality),
    sessionQualityHistory: parseSessionQualityHistory(row.session_quality_history),
    guideUrl: (row.guide_url as string) ?? null,
    colorRole: (row.color_role as SkillNode['colorRole']) ?? null,
    parentId: row.parent_id != null ? Number(row.parent_id) : null,
    originPosX: row.origin_pos_x != null ? Number(row.origin_pos_x) : null,
    originPosY: row.origin_pos_y != null ? Number(row.origin_pos_y) : null,
    isDeleted: Boolean(Number(row.is_deleted ?? 0)),
    decayCategoria: (row.decay_categoria as DecayCategoria | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export function asRow(row: unknown): Record<string, unknown> {
  return row as Record<string, unknown>;
}
