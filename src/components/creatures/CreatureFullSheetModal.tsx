import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Skull,
  Shield,
  Zap,
  Sword,
  Dices,
  Eye,
  EyeOff,
  Copy,
  Plus,
  Trash2,
  Edit2,
  Heart,
  Cloud,
  CloudOff,
  Layers,
  Flame,
  Check,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CreatureBossData, BossPhase, CreatureAttack, CreatureSkill } from "../../types/creature";
import { calculateCreatureMaxStats } from "../../services/creatureService";
import { StatMathInput } from "../StatMathInput";
import { QuickDiceSection } from "../QuickDiceSection";
import { RollingTerminal } from "../RollingTerminal";
import { addMessage } from "../chat/chatStorage";
import demologiaLogoUrl from "../../assets/demologia_logo.png";

interface CreatureFullSheetModalProps {
  creature: CreatureBossData;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCreature: (updated: CreatureBossData) => void;
  onDuplicateCreature: (creature: CreatureBossData) => void;
  onSwitchToQuickEdit: () => void;
  onAddToCombat: (creature: CreatureBossData, quantity: number) => void;
  onUpdateInitiativeValue?: (name: string, value: number) => void;
  isOnline?: boolean;
}

const icons = ["X", "O", "∆", "□"];

export function CreatureFullSheetModal({
  creature,
  isOpen,
  onClose,
  onUpdateCreature,
  onDuplicateCreature,
  onSwitchToQuickEdit,
  onAddToCombat,
  onUpdateInitiativeValue,
  isOnline = true,
}: CreatureFullSheetModalProps) {
  const [data, setData] = useState<CreatureBossData>(creature);
  const [isSecretRoll, setIsSecretRoll] = useState(true);
  const [activeSkill, setActiveSkill] = useState<number | null>(null);
  const [editingSkill, setEditingSkill] = useState<number | null>(null);
  const [useSkillModalId, setUseSkillModalId] = useState<number | null>(null);
  const [skillModalTested, setSkillModalTested] = useState<boolean>(false);
  const [activeTributo, setActiveTributo] = useState(false);
  const [diceInput, setDiceInput] = useState("");
  const [quickDiceQty, setQuickDiceQty] = useState<number>(1);
  const [lastRollResult, setLastRollResult] = useState<{
    formula: string;
    result: number;
    details: string;
    critical?: "crit" | "fumble" | "normal";
  } | null>(null);
  const [history, setHistory] = useState<string[]>(() => {
    return creature.notes
      ? [`<span style="color:#888;">${creature.notes}</span>`]
      : [];
  });
  const historyRef = useRef<HTMLDivElement>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [addCombatQty, setAddCombatQty] = useState(1);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseHp, setNewPhaseHp] = useState(60);
  const [showAddPhase, setShowAddPhase] = useState(false);

  useEffect(() => {
    setData(creature);
  }, [creature]);

  if (!isOpen) return null;

  const isBoss = data.type === "boss";

  const updateField = <K extends keyof CreatureBossData>(
    field: K,
    val: CreatureBossData[K]
  ) => {
    const updated = {
      ...data,
      [field]: val,
      last_local_edit: Date.now(),
    };
    setData(updated);
    onUpdateCreature(updated);
  };

  const updateStat = (
    stat: "hp" | "pe",
    field: "current" | "max",
    val: number
  ) => {
    const updatedStat = {
      ...data[stat],
      [field]: Math.max(0, val),
    };
    updateField(stat, updatedStat);
  };

  const applyAutoMaxToCreature = (
    prevData: CreatureBossData,
    nextAttrs: CreatureBossData["attributes"],
    nextVars: Record<string, number> = (prevData as any).variables || {}
  ): CreatureBossData => {
    if (prevData.autoMaxStats === false) {
      return {
        ...prevData,
        attributes: nextAttrs,
        last_local_edit: Date.now(),
      };
    }

    const { hpMax, peMax, smMax } = calculateCreatureMaxStats(nextAttrs, nextVars);

    const updatedHp = {
      max: hpMax,
      current: Math.min(prevData.hp?.current ?? hpMax, hpMax),
    };
    const updatedPe = {
      max: peMax,
      current: Math.min(prevData.pe?.current ?? peMax, peMax),
    };
    const updatedSm = {
      max: smMax,
      current: Math.min(prevData.sm?.current ?? smMax, smMax),
    };

    const updated: CreatureBossData = {
      ...prevData,
      attributes: nextAttrs,
      hp: updatedHp,
      pe: updatedPe,
      sm: updatedSm,
      last_local_edit: Date.now(),
    };

    if (prevData.type === "boss" && updated.bossPhases && updated.bossPhases.length > 0) {
      const newPhases = [...updated.bossPhases];
      if (newPhases[0] && currentPhaseIndex === 0) {
        newPhases[0] = {
          ...newPhases[0],
          maxHp: hpMax,
          currentHp: Math.min(newPhases[0].currentHp, hpMax),
        };
        updated.bossPhases = newPhases;
      }
    }

    return updated;
  };

  const updateAttribute = (
    attr: keyof CreatureBossData["attributes"],
    val: number
  ) => {
    const updatedAttrs = {
      ...data.attributes,
      [attr]: val,
    };
    const updated = applyAutoMaxToCreature(data, updatedAttrs);
    setData(updated);
    onUpdateCreature(updated);
  };

  const toggleAutoMaxStats = () => {
    const nextMode = data.autoMaxStats === false;
    if (nextMode) {
      const { hpMax, peMax, smMax } = calculateCreatureMaxStats(
        data.attributes,
        (data as any).variables || {}
      );
      const updated: CreatureBossData = {
        ...data,
        autoMaxStats: true,
        hp: {
          max: hpMax,
          current: Math.min(data.hp?.current ?? hpMax, hpMax),
        },
        pe: {
          max: peMax,
          current: Math.min(data.pe?.current ?? peMax, peMax),
        },
        sm: {
          max: smMax,
          current: Math.min(data.sm?.current ?? smMax, smMax),
        },
        last_local_edit: Date.now(),
      };
      if (isBoss && updated.bossPhases && updated.bossPhases[currentPhaseIndex]) {
        const newPhases = [...updated.bossPhases];
        newPhases[currentPhaseIndex] = {
          ...newPhases[currentPhaseIndex],
          maxHp: hpMax,
          currentHp: Math.min(newPhases[currentPhaseIndex].currentHp, hpMax),
        };
        updated.bossPhases = newPhases;
      }
      setData(updated);
      onUpdateCreature(updated);
      addToHistory(`<i>Cálculo automático de HP e PE ativado (HP: ${hpMax}, PE: ${peMax})</i>`);
    } else {
      const updated: CreatureBossData = {
        ...data,
        autoMaxStats: false,
        last_local_edit: Date.now(),
      };
      setData(updated);
      onUpdateCreature(updated);
      addToHistory(`<i>Cálculo automático desativado (Valores manuais permitidos)</i>`);
    }
  };

  const forceRecalculateMaxStats = () => {
    const { hpMax, peMax, smMax } = calculateCreatureMaxStats(
      data.attributes,
      (data as any).variables || {}
    );
    const updated: CreatureBossData = {
      ...data,
      autoMaxStats: true,
      hp: { max: hpMax, current: hpMax },
      pe: { max: peMax, current: peMax },
      sm: { max: smMax, current: smMax },
      last_local_edit: Date.now(),
    };
    if (isBoss && updated.bossPhases && updated.bossPhases[currentPhaseIndex]) {
      const newPhases = [...updated.bossPhases];
      newPhases[currentPhaseIndex] = {
        ...newPhases[currentPhaseIndex],
        maxHp: hpMax,
        currentHp: hpMax,
      };
      updated.bossPhases = newPhases;
    }
    setData(updated);
    onUpdateCreature(updated);
    addToHistory(`<i>HP e PE recalculados: HP ${hpMax} [20+(VIT×6)], PE ${peMax} [5+(AGL×3)+(SAN×2)]</i>`);
  };

  const addCustomVariable = () => {
    const extraVars = (data as any).variables || {};
    let counter = 1;
    let newName = `VAR${counter}`;
    while (extraVars[newName] !== undefined) {
      counter++;
      newName = `VAR${counter}`;
    }
    const updatedVars = { ...extraVars, [newName]: 0 };
    updateField("variables" as any, updatedVars);
  };

  const updateCustomVariable = (key: string, val: number) => {
    const extraVars = (data as any).variables || {};
    const updatedVars = { ...extraVars, [key]: val };
    const cleanKey = key.trim().toUpperCase();

    let updatedAttrs = { ...data.attributes };
    if (["FOR", "AGL", "INT", "VIT", "SAN", "OCU"].includes(cleanKey)) {
      updatedAttrs = {
        ...updatedAttrs,
        [cleanKey as keyof CreatureBossData["attributes"]]: val,
      };
    }

    const updated = applyAutoMaxToCreature(data, updatedAttrs, updatedVars);
    (updated as any).variables = updatedVars;
    setData(updated);
    onUpdateCreature(updated);
  };

  const removeCustomVariable = (key: string) => {
    const extraVars = { ...((data as any).variables || {}) };
    delete extraVars[key];
    const updated = applyAutoMaxToCreature(data, data.attributes, extraVars);
    (updated as any).variables = extraVars;
    setData(updated);
    onUpdateCreature(updated);
  };

  const renameCustomVariable = (oldKey: string, newKey: string) => {
    const trimmed = newKey.trim().toUpperCase();
    if (!trimmed || trimmed === oldKey) return;
    const extraVars = { ...((data as any).variables || {}) };
    extraVars[trimmed] = extraVars[oldKey] ?? 0;
    delete extraVars[oldKey];
    const updated = applyAutoMaxToCreature(data, data.attributes, extraVars);
    (updated as any).variables = extraVars;
    setData(updated);
    onUpdateCreature(updated);
  };

  const parseAndRoll = (
    formulaStr: string,
    vars: Record<string, number> = {}
  ) => {
    let stringToEval = formulaStr.toUpperCase().trim();
    const logDetails: string[] = [];

    const allVars: Record<string, number> = {
      ...(data.attributes || {}),
      ...((data as any).variables || {}),
      ...vars,
    };

    Object.entries(allVars).forEach(([key, val]) => {
      const regex = new RegExp(`\\b${key}\\b`, "g");
      if (regex.test(stringToEval)) {
        logDetails.push(`${key}(${val})`);
        stringToEval = stringToEval.replace(regex, String(val));
      }
    });

    const diceRegex = /(\d+)D(\d+)/g;
    stringToEval = stringToEval.replace(diceRegex, (match, count, sides) => {
      let sum = 0;
      const rolls: number[] = [];
      const numCount = parseInt(count, 10);
      const numSides = parseInt(sides, 10);
      for (let i = 0; i < numCount; i++) {
        const r = Math.floor(Math.random() * numSides) + 1;
        sum += r;
        rolls.push(r);
      }
      logDetails.push(`${match}[${rolls.join(",")}]`);
      return String(sum);
    });

    try {
      let safeMath = stringToEval.replace(/[^0-9+\-*/(). ]/g, "");
      if (safeMath.trim() === "") return null;
      safeMath = safeMath
        .replace(/\)(?=\d|\()/g, ")*")
        .replace(/(\d)(?=\()/g, "$1*");

      // eslint-disable-next-line no-new-func
      const result = new Function("return " + safeMath)();
      return {
        result: Math.floor(result),
        details: logDetails.length > 0 ? logDetails.join(" | ") : "Valor fixo",
        formula: formulaStr,
      };
    } catch {
      return null;
    }
  };

  const triggerShake = () => {
    setIsShaking(false);
    setTimeout(() => setIsShaking(true), 10);
  };

  const addToHistory = (text: string) => {
    setHistory((prev) => [text, ...prev].slice(0, 30));
  };

  const executeRoll = (formulaToRoll: string, label: string = "Rolagem") => {
    const trimmed = formulaToRoll.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/(^|[^0-9])d(\d+)/gi, "$11d$2");
    const roll = parseAndRoll(normalized);

    if (roll) {
      let critical: "crit" | "fumble" | "normal" = "normal";
      const upper = normalized.toUpperCase();
      if (upper.includes("1D20") && roll.details.includes("1D20")) {
        if (roll.details.includes("[20]")) critical = "crit";
        else if (roll.details.includes("[1]")) critical = "fumble";
      }

      setLastRollResult({ ...roll, critical });

      const visBadge = isSecretRoll
        ? '<span style="color:#d8b4fe;font-size:10px;border:1px solid #7e22ce;padding:1px 4px;margin-left:6px;background:rgba(126,34,206,0.3)">OCULTO</span>'
        : '<span style="color:#ff6b81;font-size:10px;border:1px solid #b91c1c;padding:1px 4px;margin-left:6px;background:rgba(185,28,28,0.3)">PÚBLICO</span>';

      addToHistory(
        `<b>${data.name}</b> // ${label} ${visBadge}<br>Fórmula: <b>${roll.formula}</b> <br><span style="font-size:11px;color:#999;">${roll.details}</span> <br><span class="log-result" style="color:${
          critical === "crit" ? "#facc15" : critical === "fumble" ? "#ef4444" : "var(--op-red-bright)"
        };font-weight:bold;font-size:16px;">Resultado: ${roll.result}</span>`
      );

      triggerShake();

      if (!isSecretRoll) {
        const roomId =
          localStorage.getItem("demologia_current_room_id") || "mesa_principal";
        addMessage(
          roomId,
          {
            id: `msg_roll_${Date.now()}`,
            senderId: "mestre",
            senderName: `${data.name} (Mestre)`,
            text: `🎲 ${label}: [${roll.formula}] ➔ ${roll.result} (${roll.details})`,
            timestamp: Date.now(),
            isMaster: true,
          },
          isOnline
        );
      }

      return roll.result;
    } else {
      addToHistory(
        '<span style="color: #ffaa00;">Fórmula de rolagem inválida.</span>'
      );
      return null;
    }
  };

  const processManualRoll = () => {
    executeRoll(diceInput, "Fórmula Manual");
  };

  const currentSkills: CreatureSkill[] =
    data.skills && data.skills.length > 0
      ? data.skills
      : data.attacks && data.attacks.length > 0
      ? data.attacks.map((a, i) => ({
          id: i + 1,
          name: a.name,
          cost: a.cost || 0,
          desc: a.description || "",
          test: (a.testFormula || "2d6+AGL").replace(/1d20/gi, "2d6"),
          damage: a.damageFormula || "1d8+FOR",
        }))
      : [
          {
            id: 1,
            name: isBoss ? "Golpe Destruidor" : "Investida",
            cost: 0,
            desc: isBoss ? "Ataque corporal esmagador." : "Ataque corporal básico.",
            test: "2d6+AGL",
            damage: isBoss ? "2d8+FOR" : "1d8+FOR",
          },
        ];

  const handleAddSkill = () => {
    const nextId = (currentSkills.length > 0 ? Math.max(...currentSkills.map((s) => s.id)) : 0) + 1;
    const newSkill: CreatureSkill = {
      id: nextId,
      name: "Nova Habilidade",
      cost: 0,
      desc: "",
      test: "2d6+AGL",
      damage: "1d8+FOR",
    };
    const updated = [...currentSkills, newSkill];
    updateField("skills", updated);
    setActiveSkill(nextId);
    setEditingSkill(nextId);
  };

  const handleUpdateSkill = (id: number, field: keyof CreatureSkill, val: any) => {
    const updated = currentSkills.map((s) => (s.id === id ? { ...s, [field]: val } : s));
    updateField("skills", updated);
  };

  const handleRemoveSkill = (id: number) => {
    const updated = currentSkills.filter((s) => s.id !== id);
    updateField("skills", updated);
    if (activeSkill === id) setActiveSkill(null);
    if (editingSkill === id) setEditingSkill(null);
  };

  const handleUseSkill = (skill: CreatureSkill) => {
    const cost = skill.cost || 0;
    if (cost > 0) {
      const curPe = data.pe?.current ?? 0;
      const newPe = Math.max(0, curPe - cost);
      updateStat("pe", "current", newPe);
      addToHistory(`<i>Gastou <b>${cost} PE</b> para ativar <b>${skill.name}</b></i>`);
    }
    setUseSkillModalId(skill.id);
    setSkillModalTested(false);
  };

  const handleRollSkillAction = (
    skill: CreatureSkill,
    type: "test" | "damage"
  ) => {
    const formula = type === "test" ? skill.test : skill.damage;
    const tipoStr = type === "test" ? "Teste" : "Dano";
    if (!formula || !formula.trim()) return;

    const res = executeRoll(formula, `${tipoStr}: ${skill.name}`);
    if (res !== null && res !== undefined) {
      if (type === "test") {
        setSkillModalTested(true);
      }
      const varTarget = type === "test" ? skill.testVar : skill.damageVar;
      if (varTarget && varTarget.trim() !== "") {
        const vName = varTarget.trim().toUpperCase();
        updateCustomVariable(vName, res);
        addToHistory(`<i>Variável <b>${vName}</b> definida para ${res}</i>`);
      }
    }
  };

  const handleAddBossPhase = () => {
    if (!newPhaseName.trim()) return;
    const existingPhases = data.bossPhases || [];
    const newPhase: BossPhase = {
      id: `phase_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: newPhaseName.trim(),
      currentHp: newPhaseHp,
      maxHp: newPhaseHp,
    };
    updateField("bossPhases", [...existingPhases, newPhase]);
    setNewPhaseName("");
    setShowAddPhase(false);
  };

  const handleUpdatePhaseHp = (phaseIdx: number, val: number) => {
    const phases = [...(data.bossPhases || [])];
    if (phases[phaseIdx]) {
      phases[phaseIdx] = {
        ...phases[phaseIdx],
        currentHp: Math.max(0, Math.min(phases[phaseIdx].maxHp, val)),
      };
      updateField("bossPhases", phases);
      if (phaseIdx === currentPhaseIndex) {
        updateStat("hp", "current", val);
      }
    }
  };

  const currentHp = data.hp?.current ?? 26;
  const maxHp = data.hp?.max ?? 26;
  const hpPercent =
    Math.max(0, Math.min(100, (currentHp / (maxHp || 1)) * 100)) || 0;

  const currentPe = data.pe?.current ?? 10;
  const maxPe = data.pe?.max ?? 10;
  const pePercent =
    Math.max(0, Math.min(100, (currentPe / (maxPe || 1)) * 100)) || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md p-1.5 sm:p-4 md:p-6 flex justify-center items-start">
      <div className="relative w-full max-w-7xl bg-[#09090c] border border-[#22222a] shadow-2xl my-2 sm:my-4 text-[#dedede] overflow-hidden">
        {/* Top Header Bar: Clean, sleek, mobile-friendly */}
        <div className="flex items-center justify-between p-2.5 sm:p-4 bg-[#111116] border-b border-[#22222c] gap-2">
          {/* Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            {data.tokenUrl ? (
              <img
                src={data.tokenUrl}
                alt={data.name}
                className="w-10 h-10 sm:w-11 sm:h-11 object-cover border border-[#333] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#15151e] border border-[#333] flex items-center justify-center shrink-0">
                <Skull
                  size={20}
                  className={isBoss ? "text-purple-400" : "text-[var(--op-red-bright)]"}
                />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {isBoss ? (
                  <span className="text-[10px] bg-purple-950/80 text-purple-200 font-bold uppercase tracking-wider px-2 py-0.5 border border-purple-500/50 flex items-center gap-1">
                    <Flame size={10} className="text-purple-400" /> Boss
                  </span>
                ) : (
                  <span className="text-[10px] bg-[#1a1a24] text-zinc-300 font-bold uppercase tracking-wider px-2 py-0.5 border border-[#2e2e3e]">
                    Criatura
                  </span>
                )}
                {data.synchronized && (
                  <span className="text-[9px] bg-emerald-950/70 text-emerald-300 font-bold uppercase px-1.5 py-0.2 border border-emerald-600/40 hidden sm:inline-flex items-center gap-1">
                    <Cloud size={9} /> Nuvem
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold uppercase tracking-wide font-mono text-white truncate mt-0.5">
                {data.name || "Sem Nome"}
              </h2>
            </div>
          </div>

          {/* Controls: Compact, touch-friendly min 40px height */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Visibility Toggle */}
            <div className="flex items-center bg-[#15151c] p-0.5 border border-[#262632]">
              <button
                type="button"
                onClick={() => setIsSecretRoll(true)}
                className={`min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                  isSecretRoll
                    ? "bg-purple-950 text-purple-200 border border-purple-500/60 shadow-sm"
                    : "text-zinc-500 hover:text-white"
                }`}
                title="Rolagens visíveis apenas para você"
              >
                <EyeOff size={13} />
                <span className="hidden sm:inline">Oculta</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSecretRoll(false)}
                className={`min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                  !isSecretRoll
                    ? "bg-red-950 text-red-200 border border-red-500/60 shadow-sm"
                    : "text-zinc-500 hover:text-white"
                }`}
                title="Rolagens enviadas para o Chat da Mesa"
              >
                <Eye size={13} />
                <span className="hidden sm:inline">Pública</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onSwitchToQuickEdit}
              className="min-h-[36px] px-2.5 sm:px-3 bg-[#15151d] hover:bg-[#1d1d28] text-zinc-300 hover:text-white border border-[#2c2c3a] text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
              title="Voltar ao formulário rápido"
            >
              <Edit2 size={13} />
              <span className="hidden md:inline">Edição Rápida</span>
            </button>

            <button
              type="button"
              onClick={() => onDuplicateCreature(data)}
              className="min-h-[36px] px-2.5 sm:px-3 bg-[#15151d] hover:bg-[#1d1d28] text-zinc-300 hover:text-white border border-[#2c2c3a] text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
              title="Duplicar ficha com numeração automática"
            >
              <Copy size={13} />
              <span className="hidden md:inline">Duplicar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[36px] min-w-[36px] sm:min-w-[40px] p-2 text-zinc-400 hover:text-white border border-[#2c2c3a] bg-[#15151d] hover:bg-[#20202c] transition-colors cursor-pointer flex items-center justify-center"
              title="Fechar"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Home Sheet Layout */}
        <div className="home-sheet-container w-full p-2.5 sm:p-5 lg:p-6 flex flex-col lg:flex-row gap-3.5 sm:gap-5 lg:gap-8 items-start">
          {/* Left Column: HUD, Attributes, Skills, Special Powers */}
          <div className="flex-1 w-full flex flex-col gap-3.5 sm:gap-5 lg:gap-6">
            {/* HUD */}
            <div className="hud-wrapper-box relative">
              <div className="hud-container relative pointer-events-auto !py-4 sm:!py-6">
                <img
                  className="eye-logo !w-[130px] sm:!w-[160px]"
                  src={demologiaLogoUrl}
                  alt="Símbolo Demologia"
                />

                <div className="status-numbers relative">
                  <input
                    className="bg-transparent text-white font-bold text-center text-[22px] sm:text-[32px] md:text-[38px] uppercase outline-none w-full drop-shadow-[0_0_10px_rgba(211,0,0,0.6)] px-2 font-mono"
                    style={{
                      textShadow: "2px 2px 0px #500",
                      marginBottom: "-6px",
                      zIndex: 10,
                    }}
                    value={data.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="NOME"
                  />

                  <div className="hp-text z-0 font-mono">
                    <span>
                      {currentHp}/{maxHp}
                    </span>{" "}
                    HP
                  </div>
                  <div className="pe-text z-0 font-mono">
                    <span>
                      {currentPe}/{maxPe}
                    </span>{" "}
                    PE
                  </div>
                </div>

                <div className="status-bars !px-3 sm:!px-6">
                  {/* Fases do Boss (se houver) */}
                  {isBoss && data.bossPhases && data.bossPhases.length > 0 && (
                    <div className="mb-3 p-2 bg-[#0c0c12] border border-purple-500/25">
                      <div className="flex items-center justify-between text-[11px] font-mono text-purple-300 font-bold mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Layers size={12} className="text-purple-400" />
                          Fase {currentPhaseIndex + 1} de {data.bossPhases.length}:{" "}
                          <strong className="text-white uppercase">
                            {data.bossPhases[currentPhaseIndex]?.name}
                          </strong>
                        </span>
                        <span>
                          {data.bossPhases[currentPhaseIndex]?.currentHp} /{" "}
                          {data.bossPhases[currentPhaseIndex]?.maxHp} HP
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {data.bossPhases.map((phase, pIdx) => {
                          const isCur = pIdx === currentPhaseIndex;
                          const pPct =
                            Math.max(
                              0,
                              Math.min(100, (phase.currentHp / (phase.maxHp || 1)) * 100)
                            ) || 0;
                          return (
                            <button
                              key={phase.id || pIdx}
                              type="button"
                              onClick={() => {
                                setCurrentPhaseIndex(pIdx);
                                updateStat("hp", "current", phase.currentHp);
                                updateStat("hp", "max", phase.maxHp);
                              }}
                              className={`p-1.5 text-left border transition-all cursor-pointer font-mono min-h-[38px] ${
                                isCur
                                  ? "bg-purple-950/80 border-purple-400 text-white shadow-sm"
                                  : "bg-[#13131b] border-[#222230] text-zinc-400 hover:text-white"
                              }`}
                            >
                              <div className="text-[10px] truncate uppercase font-bold flex justify-between">
                                <span>{phase.name}</span>
                                <span>{phase.currentHp}HP</span>
                              </div>
                              <div className="h-1.5 w-full bg-black/60 mt-1 border border-white/10 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-700 to-purple-400"
                                  style={{ width: `${pPct}%` }}
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Barra de HP */}
                  <div className="bar-wrapper">
                    <div
                      className="bar-fill hp-fill"
                      style={{ width: `${hpPercent}%` }}
                    />
                  </div>
                  <div className="status-inputs font-mono">
                    <span className="inline-flex items-center gap-1">
                      HP:{" "}
                      <StatMathInput
                        value={currentHp}
                        className="w-14 bg-transparent border-none text-white text-center font-bold font-mono outline-none"
                        onSave={(val) => {
                          updateStat("hp", "current", val);
                          if (isBoss && data.bossPhases && data.bossPhases[currentPhaseIndex]) {
                            handleUpdatePhaseHp(currentPhaseIndex, val);
                          }
                        }}
                        ariaLabel="Editar Vida Atual"
                        title="Editar Vida Atual"
                      />{" "}
                      /{" "}
                      <StatMathInput
                        value={maxHp}
                        className="w-14 bg-transparent border-none text-white text-center font-bold font-mono outline-none"
                        onSave={(val) => updateStat("hp", "max", val)}
                        ariaLabel="Editar Vida Máxima"
                        title="Editar Vida Máxima"
                      />
                      {data.autoMaxStats !== false && (
                        <span className="text-[9px] text-zinc-500 font-normal ml-1">
                          (20+VIT×6)
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Barra de PE */}
                  <div className="bar-wrapper mt-2 sm:mt-2.5">
                    <div
                      className="bar-fill pe-fill"
                      style={{ width: `${pePercent}%` }}
                    />
                  </div>
                  <div className="status-inputs font-mono">
                    <span className="inline-flex items-center gap-1">
                      PE:{" "}
                      <StatMathInput
                        value={currentPe}
                        className="w-14 bg-transparent border-none text-white text-center font-bold font-mono outline-none"
                        onSave={(val) => updateStat("pe", "current", val)}
                        ariaLabel="Editar Energia Atual"
                        title="Editar Energia Atual"
                      />{" "}
                      /{" "}
                      <StatMathInput
                        value={maxPe}
                        className="w-14 bg-transparent border-none text-white text-center font-bold font-mono outline-none"
                        onSave={(val) => updateStat("pe", "max", val)}
                        ariaLabel="Editar Energia Máxima"
                        title="Editar Energia Máxima"
                      />
                      {data.autoMaxStats !== false && (
                        <span className="text-[9px] text-zinc-500 font-normal ml-1">
                          (5+AGL×3+SAN×2)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Variáveis de Status & Atributos */}
            <div className="section font-mono">
              <div className="section-title flex items-center justify-between flex-wrap gap-2">
                <span>Atributos & Variáveis</span>
                <div className="flex items-center gap-1.5 font-normal">
                  <button
                    type="button"
                    onClick={toggleAutoMaxStats}
                    className={`text-[9px] sm:text-[10px] px-2 py-0.5 border font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                      data.autoMaxStats !== false
                        ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
                        : "bg-[#181820] border-[#333] text-zinc-400 hover:text-white"
                    }`}
                    title={
                      data.autoMaxStats !== false
                        ? "Cálculo automático ativo: PV = 20+(VIT×6) | PE = 5+(AGL×3)+(SAN×2)"
                        : "Cálculo automático desativado. Clique para reativar"
                    }
                  >
                    <Sparkles size={10} className={data.autoMaxStats !== false ? "text-emerald-400" : "text-zinc-500"} />
                    Auto HP/PE: {data.autoMaxStats !== false ? "ON" : "OFF"}
                  </button>

                  <button
                    type="button"
                    onClick={forceRecalculateMaxStats}
                    className="text-[9px] sm:text-[10px] px-2 py-0.5 border border-[#3a3a4c] bg-[#14141e] hover:bg-[#20202e] text-zinc-300 hover:text-white font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                    title="Recalcular HP e PE agora com base nos atributos atuais"
                  >
                    <RotateCcw size={10} />
                    Recalcular
                  </button>
                </div>
              </div>

              {/* 6 Atributos em 3 colunas no mobile e 6 no desktop - Sem dados rápidos */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3.5">
                {(["FOR", "AGL", "INT", "VIT", "SAN", "OCU"] as const).map(
                  (attr) => {
                    const val = data.attributes?.[attr] ?? 1;
                    return (
                      <div className="var-box !p-2 flex flex-col items-center justify-center text-center" key={attr}>
                        <div className="text-[var(--op-red-bright)] font-bold text-xs uppercase tracking-wider mb-1">
                          {attr}
                        </div>

                        <StatMathInput
                          value={val}
                          onSave={(newVal) => updateAttribute(attr, newVal)}
                          className="w-12 bg-transparent text-center text-white font-mono font-bold text-lg outline-none border-b border-dashed border-[#555] focus:border-[var(--op-red)]"
                        />
                      </div>
                    );
                  }
                )}
              </div>

              {/* Variáveis Extras */}
              {((data as any).variables && Object.keys((data as any).variables).length > 0) && (
                <div className="var-grid mb-3">
                  {Object.entries((data as any).variables).map(([key, value]) => (
                    <div className="var-box !p-2" key={key}>
                      <button
                        type="button"
                        className="btn-remove-var"
                        onClick={() => removeCustomVariable(key)}
                        title="Remover"
                      >
                        X
                      </button>
                      <input
                        type="text"
                        defaultValue={key}
                        onBlur={(e) => renameCustomVariable(key, e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && e.currentTarget.blur()
                        }
                      />
                      <StatMathInput
                        value={(value as number) || 0}
                        onSave={(val) => updateCustomVariable(key, val)}
                        className="w-12 bg-transparent text-center text-white font-mono outline-none border-b border-dashed border-[#555] focus:border-blood-red"
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="btn-add font-mono min-h-[38px]"
                onClick={addCustomVariable}
              >
                + ADICIONAR VARIÁVEL
              </button>
            </div>

            {/* Habilidades (Skills) - Equivalente às fichas dos players */}
            <div className="section skills-section font-mono">
              <div className="section-title">
                <span>Habilidades (Skills)</span>
              </div>

              <div className="skill-list space-y-2">
                {currentSkills.length > 0 ? (
                  currentSkills.map((skill, index) => {
                    const icon = icons[index % icons.length];
                    const isActive = activeSkill === skill.id;
                    const isEditing = editingSkill === skill.id;

                    return (
                      <div key={skill.id} className="relative">
                        <div
                          className="paper-bar cursor-pointer"
                          onClick={() =>
                            setActiveSkill(isActive ? null : skill.id)
                          }
                        >
                          <div className="skill-header">
                            <div className="skill-name-area">
                              <span
                                className="skill-icon"
                                style={
                                  icon === "X"
                                    ? { color: "#00a8ff", borderColor: "#00a8ff" }
                                    : icon === "O"
                                    ? { color: "#d30000", borderColor: "#d30000" }
                                    : {}
                                }
                              >
                                {icon}
                              </span>
                              {skill.name || "Nova Habilidade"}
                            </div>
                            <div className="skill-cost">
                              {skill.cost || 0}PE
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: "12px",
                              color: "#888",
                              marginTop: "4px",
                              marginLeft: "35px",
                            }}
                          >
                            {skill.desc || `${skill.test || "2d6+AGL"} • ${skill.damage || "1d8+FOR"}`}
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        {isActive && !isEditing && (
                          <div
                            className="skill-details active flex flex-wrap items-center gap-2 p-2.5 bg-[#0a0a0f] border border-t-0 border-[#222]"
                          >
                            <button
                              type="button"
                              className="min-h-[40px] px-3 bg-[#1e1e2c] hover:bg-[#28283a] border border-[#38384e] hover:border-gray-400 text-white uppercase font-bold text-xs tracking-wider transition-all cursor-pointer font-mono"
                              onClick={() => handleUseSkill(skill)}
                            >
                              USAR ({skill.cost || 0}PE)
                            </button>

                            {skill.test && skill.test.trim() !== "" && (
                              <button
                                type="button"
                                className="flex-1 min-h-[40px] bg-[#161620] hover:bg-[#20202e] border border-[#303040] hover:border-[#505060] text-zinc-300 hover:text-white uppercase font-bold text-xs tracking-wider py-2 px-2 transition-all cursor-pointer font-mono"
                                onClick={() => handleRollSkillAction(skill, "test")}
                              >
                                TESTE ({skill.test})
                              </button>
                            )}

                            {skill.damage && skill.damage.trim() !== "" && (
                              <button
                                type="button"
                                className="flex-1 min-h-[40px] bg-gradient-to-r from-[#7a0e14] to-[var(--op-red-bright)] hover:brightness-125 text-white uppercase font-bold text-xs tracking-wider py-2 px-2 transition-all cursor-pointer font-mono shadow-md"
                                onClick={() => handleRollSkillAction(skill, "damage")}
                              >
                                DANO ({skill.damage})
                              </button>
                            )}

                            <button
                              type="button"
                              className="min-h-[40px] min-w-[40px] flex items-center justify-center text-zinc-400 hover:text-white bg-[#14141c] hover:bg-[#1f1f2a] border border-[#2c2c3c] cursor-pointer"
                              onClick={() => setEditingSkill(skill.id)}
                              title="Editar Skill"
                            >
                              <Edit2 size={15} />
                            </button>

                            <button
                              type="button"
                              className="min-h-[40px] min-w-[40px] flex items-center justify-center text-red-500 hover:text-red-300 bg-[#180a0d] hover:bg-[#250d12] border border-red-950 cursor-pointer"
                              onClick={() => handleRemoveSkill(skill.id)}
                              title="Excluir Skill"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}

                        {/* Formulário de Edição de Skill */}
                        {isEditing && (
                          <div className="skill-details active p-3 bg-[#0c0c12] border border-t-0 border-[#2a2a38] space-y-2.5">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-2">
                                <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                                  Nome da Skill
                                </label>
                                <input
                                  type="text"
                                  className="w-full bg-[#12121a] border border-[#282838] p-2 text-white text-xs font-mono outline-none focus:border-[var(--op-red)]"
                                  value={skill.name}
                                  onChange={(e) =>
                                    handleUpdateSkill(skill.id, "name", e.target.value)
                                  }
                                  placeholder="Nome da habilidade"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                                  Custo PE
                                </label>
                                <input
                                  type="number"
                                  className="w-full bg-[#12121a] border border-[#282838] p-2 text-white text-xs font-mono outline-none focus:border-[var(--op-red)]"
                                  value={skill.cost || 0}
                                  onChange={(e) =>
                                    handleUpdateSkill(
                                      skill.id,
                                      "cost",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                                Descrição
                              </label>
                              <textarea
                                className="w-full bg-[#12121a] border border-[#282838] p-2 text-white text-xs font-mono outline-none focus:border-[var(--op-red)]"
                                rows={2}
                                value={skill.desc || ""}
                                onChange={(e) =>
                                  handleUpdateSkill(
                                    skill.id,
                                    "desc",
                                    e.target.value
                                  )
                                }
                                placeholder="Efeitos, custo adicional e detalhes..."
                              />
                            </div>

                            <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={skill.needsTest || false}
                                onChange={(e) =>
                                  handleUpdateSkill(skill.id, "needsTest", e.target.checked)
                                }
                                className="bg-black border-zinc-700"
                              />
                              Necessita Teste (Exige Rolar Teste antes de Dano)
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                                  Fórmula de Teste
                                </label>
                                <input
                                  type="text"
                                  className="w-full bg-[#12121a] border border-[#282838] p-2 text-white text-xs font-mono outline-none focus:border-[var(--op-red)]"
                                  value={skill.test || ""}
                                  onChange={(e) =>
                                    handleUpdateSkill(
                                      skill.id,
                                      "test",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Ex: 2D6+AGL"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                                  Fórmula de Dano
                                </label>
                                <input
                                  type="text"
                                  className="w-full bg-[#12121a] border border-[#282838] p-2 text-white text-xs font-mono outline-none focus:border-[var(--op-red)]"
                                  value={skill.damage || ""}
                                  onChange={(e) =>
                                    handleUpdateSkill(
                                      skill.id,
                                      "damage",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Ex: 1D8+FOR"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                                  Salvar Teste Em Var: (Opcional)
                                </label>
                                <select
                                  className="w-full bg-[#12121a] border border-[#282838] p-2 text-white text-xs font-mono outline-none"
                                  value={skill.testVar || ""}
                                  onChange={(e) =>
                                    handleUpdateSkill(skill.id, "testVar", e.target.value)
                                  }
                                >
                                  <option value="">-- Nenhuma --</option>
                                  {Object.keys((data as any).variables || {}).map((v) => (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                                  Salvar Dano Em Var: (Opcional)
                                </label>
                                <select
                                  className="w-full bg-[#12121a] border border-[#282838] p-2 text-white text-xs font-mono outline-none"
                                  value={skill.damageVar || ""}
                                  onChange={(e) =>
                                    handleUpdateSkill(skill.id, "damageVar", e.target.value)
                                  }
                                >
                                  <option value="">-- Nenhuma --</option>
                                  {Object.keys((data as any).variables || {}).map((v) => (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                className="flex-1 min-h-[38px] bg-[#1a1a24] hover:bg-[#252536] text-white py-2 text-xs font-bold uppercase tracking-wider border border-[#333346] cursor-pointer"
                                onClick={() => setEditingSkill(null)}
                              >
                                Salvar
                              </button>
                              <button
                                type="button"
                                className="min-h-[38px] bg-[#240c0f] hover:bg-[#341116] text-red-300 py-2 px-3 text-xs font-bold uppercase tracking-wider border border-red-900 cursor-pointer"
                                onClick={() => handleRemoveSkill(skill.id)}
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-xs text-zinc-500 italic border border-dashed border-[#20202a]">
                    Nenhuma habilidade cadastrada.
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn-add font-mono min-h-[38px]"
                onClick={handleAddSkill}
              >
                + ADICIONAR HABILIDADE (SKILL)
              </button>
            </div>

            {/* Anotações e Fases de Boss */}
            <div className="font-mono">
              <div
                className="paper-bar tributo-bar cursor-pointer"
                onClick={() => setActiveTributo(!activeTributo)}
              >
                <div className="tributo-header flex items-center justify-between">
                  <span>Anotações & Características</span>
                  <span className="text-xs opacity-75">
                    {activeTributo ? "▲ Recolher" : "▼ Expandir"}
                  </span>
                </div>
                <div style={{ fontSize: "12px", opacity: 0.9 }}>
                  {data.notes || "Resistências, fraquezas e observações."}
                </div>
              </div>

              {activeTributo && (
                <div className="p-3.5 bg-[#121218] border border-[#282836] space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                      Anotações
                    </label>
                    <textarea
                      className="w-full bg-[#0a0a0f] border border-[#282838] p-2.5 text-white text-xs outline-none focus:border-[var(--op-red)]"
                      rows={3}
                      value={data.notes || ""}
                      onChange={(e) => updateField("notes", e.target.value)}
                      placeholder="Informações adicionais, fraquezas..."
                    />
                  </div>

                  {isBoss && (
                    <div className="pt-2 border-t border-[#1f1f2c]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-purple-300 uppercase flex items-center gap-1.5">
                          <Layers size={13} /> Fases ({data.bossPhases?.length || 0})
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddPhase(!showAddPhase)}
                          className="text-[10px] bg-purple-950 text-purple-200 border border-purple-500/50 px-2 py-1 hover:bg-purple-900 cursor-pointer font-bold uppercase min-h-[32px]"
                        >
                          + Nova Fase
                        </button>
                      </div>

                      {showAddPhase && (
                        <div className="p-2.5 bg-[#0a0a0f] border border-purple-500/40 space-y-2 mb-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={newPhaseName}
                              onChange={(e) => setNewPhaseName(e.target.value)}
                              placeholder="Nome da Fase"
                              className="bg-[#12121a] border border-[#2d2d3d] p-2 text-white text-xs outline-none"
                            />
                            <input
                              type="number"
                              value={newPhaseHp}
                              onChange={(e) => setNewPhaseHp(parseInt(e.target.value) || 50)}
                              placeholder="HP da Fase"
                              className="bg-[#12121a] border border-[#2d2d3d] p-2 text-white text-xs outline-none"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowAddPhase(false)}
                              className="px-3 py-1.5 text-zinc-400 hover:text-white text-xs cursor-pointer min-h-[34px]"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleAddBossPhase}
                              className="px-3 py-1.5 bg-purple-800 text-white text-xs font-bold uppercase cursor-pointer min-h-[34px]"
                            >
                              Salvar Fase
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Dice Roller, Rolling Terminal, Combat & System Actions */}
          <div className="w-full lg:w-[400px] xl:w-[440px] flex flex-col gap-3.5 sm:gap-5 lg:gap-6 shrink-0">
            {/* Quick Dice Module */}
            <QuickDiceSection
              quickDiceQty={quickDiceQty}
              setQuickDiceQty={setQuickDiceQty}
              onRoll={(formula) => executeRoll(formula, "Dado Rápido")}
              lastRoll={lastRollResult}
              isRlMode={false}
            />

            {/* Rolling Terminal */}
            <RollingTerminal
              diceInput={diceInput}
              setDiceInput={setDiceInput}
              onRoll={processManualRoll}
              history={history}
              historyRef={historyRef}
              isShaking={isShaking}
              title={`Terminal de Rolagem // ${data.name}`}
              isRlMode={false}
            />

            {/* Combate & Opções */}
            <div className="section font-mono">
              <div className="section-title">Combate & Opções</div>

              <div className="space-y-3">
                {/* Adicionar ao Combate */}
                <div className="p-3 bg-[#12121a] border border-[#252535]">
                  <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1.5">
                    Adicionar à Lista de Combate
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={addCombatQty}
                      onChange={(e) =>
                        setAddCombatQty(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-14 sm:w-16 bg-[#0a0a0f] border border-[#303040] text-center text-white font-bold p-2 text-xs min-h-[44px]"
                      title="Quantidade"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onAddToCombat(data, addCombatQty);
                        addToHistory(
                          `<span style="color:#4ade80;">✔ +${addCombatQty}x ${data.name} adicionado ao combate!</span>`
                        );
                      }}
                      className="flex-1 bg-gradient-to-r from-[var(--op-red)] to-[var(--op-red-bright)] hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider py-2 px-3 border border-red-500/50 cursor-pointer shadow-md flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      <Plus size={15} />
                      <span>Adicionar ao Combate ({addCombatQty}x)</span>
                    </button>
                  </div>
                </div>

                {/* Opções Rápidas */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="btn-menu text-xs min-h-[42px] flex items-center justify-center"
                    onClick={() => onDuplicateCreature(data)}
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    className="btn-menu text-xs min-h-[42px] flex items-center justify-center"
                    onClick={onSwitchToQuickEdit}
                  >
                    Edição Rápida
                  </button>
                  <button
                    type="button"
                    className="btn-menu text-xs min-h-[42px] flex items-center justify-center"
                    onClick={() => {
                      const dataStr =
                        "data:text/json;charset=utf-8," +
                        encodeURIComponent(JSON.stringify(data));
                      const a = document.createElement("a");
                      a.href = dataStr;
                      a.download = `criatura_${data.name.toLowerCase().replace(/\s+/g, "_")}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                  >
                    Exportar JSON
                  </button>
                  <button
                    type="button"
                    className="btn-menu text-xs min-h-[42px] flex items-center justify-center"
                    style={{ color: "#ffaa00" }}
                    onClick={() => {
                      setHistory([]);
                    }}
                  >
                    Limpar Terminal
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Uso de Habilidade (Skill) */}
      {useSkillModalId !== null &&
        (() => {
          const modalSkill = currentSkills.find((s) => s.id === useSkillModalId);
          if (!modalSkill) return null;
          return (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 font-mono">
              <div className="bg-[#0c0c10] border border-[#2c2c3c] w-full max-w-sm flex flex-col p-4 gap-3.5 shadow-[0_0_30px_rgba(0,0,0,0.9)] text-[#dedede]">
                <div className="flex justify-between items-center border-b border-[#20202a] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Skull size={15} className="text-[var(--op-red-bright)]" />
                    <h3 className="font-bold text-white uppercase text-xs tracking-wider">
                      {modalSkill.name || "Habilidade"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseSkillModalId(null)}
                    className="text-zinc-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="text-[11px] text-zinc-400 bg-[#121218] p-2.5 border border-[#1e1e28]">
                  <div className="flex justify-between mb-1">
                    <span className="text-zinc-500 uppercase font-bold">Custo:</span>
                    <span className="text-yellow-400 font-bold">{modalSkill.cost || 0} PE</span>
                  </div>
                  {modalSkill.desc && (
                    <div className="text-zinc-300 italic">{modalSkill.desc}</div>
                  )}
                </div>

                <div className="flex gap-2">
                  {modalSkill.test?.trim() !== "" && (
                    <button
                      type="button"
                      className="flex-1 bg-[#161622] border border-[#2a2a3c] hover:bg-[#222232] text-zinc-300 hover:text-white uppercase font-bold text-xs tracking-wider py-2.5 px-2 transition-all cursor-pointer font-mono"
                      onClick={() => {
                        handleRollSkillAction(modalSkill, "test");
                        setSkillModalTested(true);
                      }}
                    >
                      TESTE ({modalSkill.test})
                    </button>
                  )}
                  {modalSkill.damage?.trim() !== "" && (
                    <button
                      type="button"
                      className="flex-1 bg-gradient-to-r from-[#7a0e14] to-[var(--op-red-bright)] text-white hover:brightness-125 uppercase font-bold text-xs tracking-wider py-2.5 px-2 transition-all border border-red-900 cursor-pointer font-mono shadow-md"
                      onClick={() => {
                        if (modalSkill.needsTest && !skillModalTested) {
                          addToHistory(
                            '<span style="color: #ffaa00;">Realize o teste antes do dano!</span>'
                          );
                          return;
                        }
                        handleRollSkillAction(modalSkill, "damage");
                      }}
                    >
                      DANO ({modalSkill.damage})
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setUseSkillModalId(null)}
                  className="w-full py-2 bg-[#121218] hover:bg-[#1a1a22] text-zinc-400 hover:text-white text-xs font-mono uppercase tracking-wider border border-[#22222e] transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
