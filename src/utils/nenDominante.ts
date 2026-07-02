import { getDominantNenAxis, NenAxisId } from '@/src/config/nenConfig';
import { loadSmoothedNenProfile } from '@/src/database/queryEngine';

/** Tipo de Nen dominante según el perfil suavizado actual. */
export type NenTipo = NenAxisId;

export async function getNenDominante(): Promise<NenTipo> {
  const profile = await loadSmoothedNenProfile();
  return getDominantNenAxis(profile);
}
