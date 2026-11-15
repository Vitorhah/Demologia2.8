export type CreatureType = "criatura" | "boss";

export interface BossPhase {
  id: string;
  name: string;
  currentHp: number;
  maxHp: number;
  description?: string;
}

export interface CreatureAttack {
  id: string;
  name: string;
  testFormula: string;
  damageFormula: string;
  description?: string;
  cost?: number;
}

export interface CreatureSkill {
  id: number;
  name: string;
  cost: number;
  desc: string;
  test?: string;
  damage?: string;
  testVar?: string;
  damageVar?: string;
  needsTest?: boolean;
}

export interface CreatureBossData {
  id: string;
  name: string;
  type: CreatureType;
  tokenUrl?: string;
  edicao_inicial_concluida: boolean;
  hp: { current: number; max: number };
  pe: { current: number; max: number };
  sm: { current: number; max: number };
  autoMaxStats?: boolean;
  defense?: number;
  dodgeBonus?: number;
  resistances: string;
  initiativeBonus?: number;
  attributes: {
    FOR: number;
    AGL: number;
    INT: number;
    VIT: number;
    SAN: number;
    OCU: number;
  };
  attacks?: CreatureAttack[];
  skills: CreatureSkill[];
  bossPhases?: BossPhase[];
  currentPhaseIndex?: number;
  legendaryActions?: string[];
  notes: string;
  synchronized: boolean;
  last_local_edit?: number;
  createdAt: number;
}

export interface CombatantInstance {
  instanceId: string;
  templateId?: string;
  name: string;
  type: "player" | "criatura" | "boss";
  tokenUrl?: string;
  hp: { current: number; max: number };
  pe?: { current: number; max: number };
  sm?: { current: number; max: number };
  defense?: number;
  initiative: number;
  conditions: string[];
  isTurn: boolean;
  bossPhases?: BossPhase[];
  currentPhaseIndex?: number;
  notes?: string;
  originalData?: CreatureBossData;
}
