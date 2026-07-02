import { AppTheme, SkinId } from '@/src/types';
import { cyberpunkTheme } from './cyberpunkTheme';
import { minimalTheme } from './minimalTheme';
import { rpgTheme } from './rpgTheme';

export const themes: Record<SkinId, AppTheme> = {
  rpg: rpgTheme,
  cyberpunk: cyberpunkTheme,
  minimal: minimalTheme,
};

export function getTheme(skinId: SkinId): AppTheme {
  return themes[skinId];
}

export { rpgTheme, cyberpunkTheme, minimalTheme };
