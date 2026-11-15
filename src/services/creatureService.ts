import { CreatureBossData, CreatureType, BossPhase, CreatureAttack, CombatantInstance, CreatureSkill } from "../types/creature";

/**
 * Calcula automaticamente os limites de HP, PE e Sanidade (SM)
 * Fórmulas oficiais de Demologia:
 * PV (HP) = 20 + (VIT * 6)
 * PE = 5 + (AGL * 3) + (SAN * 2)
 * SM = 30 + (SAN * 4)
 */
export function calculateCreatureMaxStats(
  attributes: Partial<CreatureBossData["attributes"]> = {},
  variables: Record<string, number> = {}
) {
  const findVal = (name: "VIT" | "AGL" | "SAN"): number => {
    if (attributes && attributes[name] !== undefined) {
      const parsed = Number(attributes[name]);
      if (!isNaN(parsed)) return parsed;
    }
    const entry = Object.entries(variables).find(
      ([k]) => k.trim().toUpperCase() === name
    );
    if (entry !== undefined) {
      const parsed = Number(entry[1]);
      return isNaN(parsed) ? 1 : parsed;
    }
    return 1;
  };

  const vit = findVal("VIT");
  const agl = findVal("AGL");
  const san = findVal("SAN");

  const hpMax = Math.max(1, 20 + vit * 6);
  const peMax = Math.max(0, 5 + agl * 3 + san * 2);
  const smMax = Math.max(1, 30 + san * 4);

  return { hpMax, peMax, smMax, vit, agl, san };
}

/**
 * Cria uma nova criatura ou boss com valores padrão alinhados às fórmulas de Demologia
 * PV = 20 + (VIT * 6)
 * PE = 5 + (AGL * 3) + (SAN * 2)
 * SM = 30 + (SAN * 4)
 * Iniciativa = d20 + AGL
 * Defesa = 10 + AGL
 */
export function createDefaultCreature(type: CreatureType = "criatura"): CreatureBossData {
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
  const vit = 1;
  const agl = 1;
  const san = 1;
  const forAttr = 1;
  const intAttr = 1;
  const ocu = 1;

  const baseHp = 20 + vit * 6; // 26
  const basePe = 5 + agl * 3 + san * 2; // 10
  const baseSm = 30 + san * 4; // 34

  const isBoss = type === "boss";

  const defaultPhases: BossPhase[] = isBoss
    ? [
        {
          id: "phase_1",
          name: "Fase 1: Despertar",
          currentHp: 50,
          maxHp: 50,
          description: "A presença se manifesta no plano físico.",
        },
        {
          id: "phase_2",
          name: "Fase 2: Manifestação Verdadeira",
          currentHp: 80,
          maxHp: 80,
          description: "A criatura rompe as barreiras da realidade e intensifica seus ataques.",
        },
      ]
    : [];

  const defaultSkills: CreatureSkill[] = isBoss
    ? [
        {
          id: 1,
          name: "Golpe Destruidor",
          cost: 0,
          desc: "Ataque corporal esmagador.",
          test: "2d6+AGL",
          damage: "2d8+FOR",
        },
        {
          id: 2,
          name: "Pulso Paranormal",
          cost: 3,
          desc: "Emissão violenta de energia oculta.",
          test: "2d6+OCU",
          damage: "3d6+OCU",
        },
      ]
    : [
        {
          id: 1,
          name: "Investida",
          cost: 0,
          desc: "Ataque corporal básico.",
          test: "2d6+AGL",
          damage: "1d8+FOR",
        },
        {
          id: 2,
          name: "Bote Feroz",
          cost: 2,
          desc: "Avanço rápido que causa ferimento.",
          test: "2d6+FOR",
          damage: "2d6+FOR",
        },
      ];

  const defaultAttacks: CreatureAttack[] = defaultSkills.map((s) => ({
    id: `atk_${s.id}`,
    name: s.name,
    testFormula: s.test || "2d6+AGL",
    damageFormula: s.damage || "1d8+FOR",
    description: s.desc,
    cost: s.cost,
  }));

  return {
    id,
    name: isBoss ? "Nova Entidade Boss" : "Nova Criatura",
    type,
    tokenUrl: "",
    edicao_inicial_concluida: false,
    autoMaxStats: true,
    hp: {
      current: isBoss ? 50 : baseHp,
      max: isBoss ? 50 : baseHp,
    },
    pe: {
      current: isBoss ? 20 : basePe,
      max: isBoss ? 20 : basePe,
    },
    sm: {
      current: baseSm,
      max: baseSm,
    },
    resistances: isBoss ? "Corte (Resistente 5), Ocultismo (Imune)" : "",
    attributes: {
      FOR: forAttr,
      AGL: agl,
      INT: intAttr,
      VIT: vit,
      SAN: san,
      OCU: ocu,
    },
    skills: defaultSkills,
    attacks: defaultAttacks,
    bossPhases: defaultPhases,
    currentPhaseIndex: 0,
    legendaryActions: isBoss
      ? ["Olhar Penetrante (Reação)", "Retaliação Imediata (1 Ação de Lenda)"]
      : [],
    notes: "",
    synchronized: false,
    createdAt: Date.now(),
  };
}

/**
 * Converte com segurança fichas extras legadas (EXTRA_FICHA_*) para a nova estrutura de Criatura/Boss sem perder nenhum dado
 */
export function migrateExtraFichaToCreature(legacy: Record<string, unknown>): CreatureBossData {
  const legacyId = String(legacy.id || Date.now().toString());
  const cleanId = legacyId.replace(/^EXTRA_FICHA_/, "").replace(/^CREATURE_/, "");

  const vars = (legacy.variables as Record<string, number> | undefined) || {};
  const forAttr = Number(vars["FOR"] ?? 1);
  const agl = Number(vars["AGL"] ?? 1);
  const intAttr = Number(vars["INT"] ?? 1);
  const vit = Number(vars["VIT"] ?? 1);
  const san = Number(vars["SAN"] ?? 1);
  const ocu = Number(vars["OCU"] ?? 1);

  const hpObj = legacy.hp as { current?: number; max?: number } | undefined;
  const hpCurrent = Number(hpObj?.current ?? legacy.hpCurrent ?? (20 + vit * 6));
  const hpMax = Number(hpObj?.max ?? legacy.hpMax ?? (20 + vit * 6));

  const peObj = legacy.pe as { current?: number; max?: number } | undefined;
  const peCurrent = Number(peObj?.current ?? legacy.peCurrent ?? (5 + agl * 3 + san * 2));
  const peMax = Number(peObj?.max ?? legacy.peMax ?? (5 + agl * 3 + san * 2));

  const smObj = (legacy.sm || legacy.san) as { current?: number; max?: number } | undefined;
  const smCurrent = Number(smObj?.current ?? legacy.smCurrent ?? (30 + san * 4));
  const smMax = Number(smObj?.max ?? legacy.smMax ?? (30 + san * 4));

  const rawName = String(legacy.name || "Criatura");
  const isBossDetected =
    legacy.type === "boss" ||
    rawName.toLowerCase().includes("boss") ||
    rawName.toLowerCase().includes("entidade") ||
    rawName.toLowerCase().includes("lorde");

  const legacySkills = Array.isArray(legacy.skills) ? legacy.skills : [];
  const skills: CreatureSkill[] = legacySkills.map((s: Record<string, unknown>, idx: number) => ({
    id: Number(s.id || idx + 1),
    name: String(s.name || `Habilidade ${idx + 1}`),
    cost: Number(s.cost || 0),
    desc: String(s.desc || ""),
    test: String(s.test || "2d6+AGL"),
    damage: String(s.damage || "1d8+FOR"),
    testVar: s.testVar ? String(s.testVar) : undefined,
    damageVar: s.damageVar ? String(s.damageVar) : undefined,
    needsTest: Boolean(s.needsTest ?? false),
  }));

  if (skills.length === 0) {
    skills.push({
      id: 1,
      name: "Ataque Básico",
      cost: 0,
      desc: "Ataque corporal padrão.",
      test: "2d6+AGL",
      damage: "1d8+FOR",
    });
  }

  const attacks: CreatureAttack[] = skills.map((s) => ({
    id: `atk_${s.id}`,
    name: s.name,
    testFormula: s.test || "2d6+AGL",
    damageFormula: s.damage || "1d8+FOR",
    description: s.desc,
    cost: s.cost,
  }));

  const existingPhases = Array.isArray(legacy.bossPhases) ? (legacy.bossPhases as BossPhase[]) : undefined;

  return {
    id: cleanId,
    name: rawName,
    type: isBossDetected ? "boss" : "criatura",
    tokenUrl: String(legacy.tokenUrl || ""),
    edicao_inicial_concluida: Boolean(legacy.edicao_inicial_concluida ?? true),
    autoMaxStats: legacy.autoMaxStats !== undefined ? Boolean(legacy.autoMaxStats) : true,
    hp: { current: hpCurrent, max: hpMax },
    pe: { current: peCurrent, max: peMax },
    sm: { current: smCurrent, max: smMax },
    defense: legacy.defense !== undefined ? Number(legacy.defense) : undefined,
    dodgeBonus: legacy.dodgeBonus !== undefined ? Number(legacy.dodgeBonus) : undefined,
    resistances: String(legacy.resistances || ""),
    initiativeBonus: legacy.initiativeBonus !== undefined ? Number(legacy.initiativeBonus) : undefined,
    attributes: {
      FOR: forAttr,
      AGL: agl,
      INT: intAttr,
      VIT: vit,
      SAN: san,
      OCU: ocu,
    },
    skills,
    attacks,
    bossPhases: existingPhases,
    currentPhaseIndex: Number(legacy.currentPhaseIndex ?? 0),
    legendaryActions: Array.isArray(legacy.legendaryActions) ? (legacy.legendaryActions as string[]) : undefined,
    notes: String(legacy.notes || ""),
    synchronized: Boolean(legacy.synchronized ?? false),
    last_local_edit: legacy.last_local_edit ? Number(legacy.last_local_edit) : undefined,
    createdAt: Number(legacy.createdAt || Date.now()),
  };
}

/**
 * Duplica uma criatura/boss com numeração automática inteligente (e.g. "Goblin 1", "Goblin 2")
 */
export function duplicateCreature(
  source: CreatureBossData,
  existingList: CreatureBossData[]
): CreatureBossData {
  const baseName = source.name.replace(/\s+\d+$/, "").replace(/\s*\(Cópia.*\)$/i, "").trim();

  // Encontra próxima numeração livre
  let nextNumber = 1;
  const namePattern = new RegExp(`^${baseName}(?:\\s+(\\d+))?$`, "i");

  existingList.forEach((item) => {
    const match = item.name.match(namePattern);
    if (match) {
      const num = match[1] ? parseInt(match[1], 10) : 1;
      if (num >= nextNumber) {
        nextNumber = num + 1;
      }
    }
  });

  const newName = `${baseName} ${nextNumber}`;
  const newId = Date.now().toString() + Math.random().toString(36).substring(2, 6);

  return {
    ...source,
    id: newId,
    name: newName,
    synchronized: false,
    last_local_edit: undefined,
    createdAt: Date.now(),
    edicao_inicial_concluida: true,
    hp: { ...source.hp },
    pe: { ...source.pe },
    sm: { ...source.sm },
    attributes: { ...source.attributes },
    skills: source.skills ? source.skills.map((s) => ({ ...s })) : [],
    attacks: (source.attacks || []).map((a) => ({ ...a, id: `atk_${Date.now()}_${Math.random().toString(36).substring(2, 5)}` })),
    bossPhases: source.bossPhases ? source.bossPhases.map((p) => ({ ...p, id: `phase_${Date.now()}_${Math.random().toString(36).substring(2, 5)}` })) : undefined,
  };
}

/**
 * Cria uma instância de combate independente a partir de uma ficha modelo da biblioteca
 */
export function createCombatantInstance(
  creature: CreatureBossData,
  suffixNumber?: number
): CombatantInstance {
  const instanceId = `combatant_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const finalName = suffixNumber !== undefined ? `${creature.name} ${suffixNumber}` : creature.name;

  const bossPhasesCloned = creature.bossPhases
    ? creature.bossPhases.map((p) => ({ ...p }))
    : undefined;

  const currentHp = bossPhasesCloned && bossPhasesCloned.length > 0
    ? bossPhasesCloned[0].currentHp
    : creature.hp.current;

  const maxHp = bossPhasesCloned && bossPhasesCloned.length > 0
    ? bossPhasesCloned[0].maxHp
    : creature.hp.max;

  return {
    instanceId,
    templateId: creature.id,
    name: finalName,
    type: creature.type,
    tokenUrl: creature.tokenUrl,
    hp: {
      current: currentHp,
      max: maxHp,
    },
    pe: { ...creature.pe },
    sm: { ...creature.sm },
    defense: creature.defense,
    initiative: 0,
    conditions: [],
    isTurn: false,
    bossPhases: bossPhasesCloned,
    currentPhaseIndex: 0,
    notes: creature.notes,
    originalData: creature,
  };
}

/**
 * Trata o avanço automático de fase do Boss quando o HP chega a zero
 */
export function applyDamageToCombatant(
  combatant: CombatantInstance,
  damageAmount: number
): { combatant: CombatantInstance; phaseTransition?: { fromPhase: string; toPhase: string } } {
  const updated = { ...combatant };

  // Se for Boss com fases estruturadas
  if (updated.type === "boss" && updated.bossPhases && updated.bossPhases.length > 1) {
    const currentIndex = updated.currentPhaseIndex ?? 0;
    const currentPhase = updated.bossPhases[currentIndex];

    if (currentPhase) {
      const newHp = currentPhase.currentHp - damageAmount;

      if (newHp <= 0 && currentIndex < updated.bossPhases.length - 1) {
        // Transição automática para a próxima fase!
        const nextIndex = currentIndex + 1;
        const nextPhase = updated.bossPhases[nextIndex];
        const prevPhaseName = currentPhase.name;

        currentPhase.currentHp = 0;
        updated.currentPhaseIndex = nextIndex;
        updated.hp = {
          current: nextPhase.currentHp,
          max: nextPhase.maxHp,
        };

        return {
          combatant: updated,
          phaseTransition: {
            fromPhase: prevPhaseName,
            toPhase: nextPhase.name,
          },
        };
      } else {
        currentPhase.currentHp = Math.max(0, Math.min(currentPhase.maxHp, newHp));
        updated.hp = {
          current: currentPhase.currentHp,
          max: currentPhase.maxHp,
        };
      }
    }
  } else {
    // Criatura ou Player comum
    const newHp = Math.max(0, Math.min(updated.hp.max, updated.hp.current - damageAmount));
    updated.hp = { ...updated.hp, current: newHp };
  }

  return { combatant: updated };
}
