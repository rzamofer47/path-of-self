import { NEN_PALETA, NenAxisId } from '@/src/config/nenConfig';

export type NenDestelloPattern = 'cruz' | 'espiral' | 'onda' | 'cristal' | 'flash';

export interface NenFirma {
  colorAura: string;
  patternDestello: NenDestelloPattern;
  velocidadPulso: number;
}

export const NEN_FIRMAS: Record<NenAxisId, NenFirma> = {
  intensification: {
    colorAura: NEN_PALETA.intensification.color,
    patternDestello: 'cruz',
    velocidadPulso: 800,
  },
  manipulation: {
    colorAura: NEN_PALETA.manipulation.color,
    patternDestello: 'espiral',
    velocidadPulso: 1200,
  },
  emission: {
    colorAura: NEN_PALETA.emission.color,
    patternDestello: 'onda',
    velocidadPulso: 600,
  },
  materialization: {
    colorAura: NEN_PALETA.materialization.color,
    patternDestello: 'cristal',
    velocidadPulso: 1500,
  },
  transformation: {
    colorAura: NEN_PALETA.transformation.color,
    patternDestello: 'cruz',
    velocidadPulso: 1000,
  },
  specialization: {
    colorAura: NEN_PALETA.specialization.color,
    patternDestello: 'flash',
    velocidadPulso: 2000,
  },
};

export function getNenFirma(axisId: NenAxisId): NenFirma {
  return NEN_FIRMAS[axisId];
}
