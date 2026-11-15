import React, { useState } from "react";
import {
  Users,
  Trash2,
  Maximize2,
  Heart,
  Zap,
  Brain,
  Plus,
  Minus,
  MessageSquare,
  Flame,
  Skull,
  Play,
  RotateCcw,
  SkipForward,
  Layers,
  Shield,
  Activity,
  Check,
} from "lucide-react";
import { GameMode } from "../types";
import { CombatantInstance, CreatureBossData } from "../types/creature";
import { applyDamageToCombatant } from "../services/creatureService";
import { StatMathInput } from "./StatMathInput";

export interface MasterPlayersViewProps {
  players: any[];
  extraFichas?: any[];
  combatants?: CombatantInstance[];
  initiatives: Record<string, number>;
  onKickPlayer: (player: any) => void;
  onOpenInteractiveSheet: (sheetId: string) => void;
  onOpenCreatureSheet?: (creature: CreatureBossData) => void;
  onUpdateStat: (
    player: any,
    stat: "hp" | "pe" | "sm",
    val: number,
    isExtraSheet?: boolean,
    rawExtraSheetId?: string,
  ) => void;
  onUpdateCombatant?: (combatant: CombatantInstance) => void;
  onRemoveCombatant?: (instanceId: string) => void;
  onUpdateInitiative?: (id: string, val: number) => void;
  activeTurnId?: string | null;
  onSetTurn?: (id: string) => void;
  onNextTurn?: () => void;
  onPrevTurn?: () => void;
  onClearInitiatives?: () => void;
  viewMode?: "grid" | "list";
  onClearChatHistory?: () => void;
  playerModes?: Record<string, GameMode>;
  currentGlobalMode?: GameMode;
  onTogglePlayerMode?: (playerId: string) => void;
}

const CONDITIONS_LIST = [
  { code: "SANG", name: "Sangrando", color: "bg-red-950/80 text-red-300 border-red-700/60" },
  { code: "FRAT", name: "Fraturado", color: "bg-amber-950/80 text-amber-300 border-amber-700/60" },
  { code: "MED", name: "Amedrontado", color: "bg-blue-950/80 text-blue-300 border-blue-700/60" },
  { code: "CORR", name: "Corrompido", color: "bg-purple-950/80 text-purple-300 border-purple-700/60" },
  { code: "LOUC", name: "Enlouquecido", color: "bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-700/60" },
  { code: "ATOR", name: "Atordoado", color: "bg-yellow-950/80 text-yellow-300 border-yellow-700/60" },
  { code: "INCO", name: "Inconsciente", color: "bg-zinc-900 text-zinc-400 border-zinc-700" },
];

interface UnifiedCombatParticipant {
  id: string;
  name: string;
  type: "player" | "criatura" | "boss";
  tokenUrl?: string;
  hp: { current: number; max: number };
  pe: { current: number; max: number };
  sm: { current: number; max: number };
  defense?: number;
  variables: Record<string, any>;
  conditions: string[];
  history: string[];
  isCombatant: boolean;
  combatantData?: CombatantInstance;
  isExtraSheet?: boolean;
  rawExtraSheetId?: string;
  rawPlayer?: any;
  bossPhases?: any[];
  currentPhaseIndex?: number;
}

export function MasterPlayersView({
  players,
  extraFichas = [],
  combatants = [],
  initiatives,
  onKickPlayer,
  onOpenInteractiveSheet,
  onOpenCreatureSheet,
  onUpdateStat,
  onUpdateCombatant,
  onRemoveCombatant,
  onUpdateInitiative,
  activeTurnId,
  onSetTurn,
  onNextTurn,
  onPrevTurn,
  onClearInitiatives,
  viewMode = "grid",
  onClearChatHistory,
  playerModes = {},
  currentGlobalMode = "demologia",
  onTogglePlayerMode,
}: MasterPlayersViewProps) {
  // Mapeia jogadores
  const mappedPlayers: UnifiedCombatParticipant[] = players.map((p) => ({
    id: p.id,
    name: p.name || "Jogador",
    type: "player",
    tokenUrl: p.tokenUrl,
    hp: p.hp || { current: 0, max: 100 },
    pe: p.pe || { current: 0, max: 100 },
    sm: p.sm || p.san || { current: 100, max: 100 },
    variables: p.variables || {},
    conditions: p.status || p.conditions || [],
    history: p.history || [],
    isCombatant: false,
    rawPlayer: p,
  }));

  // Mapeia instâncias de combate (criaturas e bosses adicionados ao combate)
  const mappedCombatants: UnifiedCombatParticipant[] = combatants.map((c) => ({
    id: c.instanceId,
    name: c.name,
    type: c.type,
    tokenUrl: c.tokenUrl,
    hp: c.hp || { current: 20, max: 20 },
    pe: c.pe || { current: 10, max: 10 },
    sm: c.sm || { current: 30, max: 30 },
    defense: c.defense,
    variables: c.originalData?.attributes || {},
    conditions: c.conditions || [],
    bossPhases: c.bossPhases,
    currentPhaseIndex: c.currentPhaseIndex ?? 0,
    history: c.notes ? [`<span style="color: #888;">${c.notes}</span>`] : [],
    isCombatant: true,
    combatantData: c,
  }));

  // Mapeia fichas extras legadas caso não estejam já presentes em combatants
  const syncedExtrasAsPlayers: UnifiedCombatParticipant[] = extraFichas
    .filter((f) => f.synchronized && !combatants.some((c) => c.templateId === f.id))
    .map((f) => ({
      id: `EXTRA_FICHA_${f.id}`,
      name: f.name || "Ficha Extra",
      type: "criatura",
      tokenUrl: f.tokenUrl,
      hp: f.hp || { current: 0, max: 100 },
      pe: f.pe || { current: 0, max: 100 },
      sm: f.sm || f.san || { current: 100, max: 100 },
      variables: f.variables || {},
      conditions: f.status || [],
      history: f.history || (f.notes ? [`<span style="color: #888;">${f.notes}</span>`] : []),
      isCombatant: false,
      isExtraSheet: true,
      rawExtraSheetId: f.id,
    }));

  // Ordena por Iniciativa (d20 + AGL), desempata por AGL maior, depois INT maior
  const combined: UnifiedCombatParticipant[] = [...mappedPlayers, ...mappedCombatants, ...syncedExtrasAsPlayers].sort(
    (a, b) => {
      const initA = initiatives[a.id] ?? (a.combatantData?.initiative ?? -1);
      const initB = initiatives[b.id] ?? (b.combatantData?.initiative ?? -1);
      if (initB !== initA) {
        return initB - initA;
      }
      // Desempate por AGL
      const aglA = Number(a.variables?.["AGL"] ?? 0);
      const aglB = Number(b.variables?.["AGL"] ?? 0);
      if (aglB !== aglA) {
        return aglB - aglA;
      }
      // Desempate por INT
      const intA = Number(a.variables?.["INT"] ?? 0);
      const intB = Number(b.variables?.["INT"] ?? 0);
      return intB - intA;
    }
  );

  const handleToggleCondition = (target: any, code: string) => {
    if (target.isCombatant && target.combatantData && onUpdateCombatant) {
      const currentConds: string[] = target.combatantData.conditions || [];
      const updatedConds = currentConds.includes(code)
        ? currentConds.filter((c) => c !== code)
        : [...currentConds, code];
      onUpdateCombatant({
        ...target.combatantData,
        conditions: updatedConds,
      });
    }
  };

  const handleUpdateCombatantHp = (combatant: CombatantInstance, newCurrentHp: number) => {
    if (!onUpdateCombatant) return;
    const diff = combatant.hp.current - newCurrentHp;
    if (diff > 0 && combatant.type === "boss" && combatant.bossPhases && combatant.bossPhases.length > 1) {
      const res = applyDamageToCombatant(combatant, diff);
      onUpdateCombatant(res.combatant);
    } else {
      onUpdateCombatant({
        ...combatant,
        hp: { ...combatant.hp, current: Math.max(0, newCurrentHp) },
      });
    }
  };

  const handleStepStat = (target: any, stat: "hp" | "pe" | "sm", delta: number) => {
    if (target.isCombatant && target.combatantData && onUpdateCombatant) {
      const cur = (target.combatantData[stat]?.current ?? 0) + delta;
      if (stat === "hp") {
        handleUpdateCombatantHp(target.combatantData, cur);
      } else {
        onUpdateCombatant({
          ...target.combatantData,
          [stat]: { ...target.combatantData[stat], current: Math.max(0, cur) },
        });
      }
    } else {
      const current = (target[stat]?.current ?? 0) + delta;
      const max = target[stat]?.max ?? 100;
      const clamped = Math.max(0, Math.min(max * 2, current));
      onUpdateStat(target.rawPlayer || target, stat, clamped, target.isExtraSheet, target.rawExtraSheetId);
    }
  };

  if (combined.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 text-center flex flex-col items-center justify-center bg-[#0c0c10] border border-[#202028] outline outline-1 outline-[#181820] font-mono">
        <Users size={32} className="text-[#626475] mb-3" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Nenhum participante conectado ou em combate
        </h3>
        <p className="text-xs text-[#828392] max-w-sm mt-1 leading-relaxed">
          Jogadores conectados ou criaturas adicionadas da aba "Criaturas & Bosses" aparecerão aqui organizados por iniciativa.
        </p>
      </div>
    );
  }

  // Renderizador de Badge de Tipo
  const renderParticipantBadge = (p: any) => {
    if (p.type === "boss") {
      return (
        <span className="text-[10px] bg-purple-950/60 text-purple-300 font-bold uppercase tracking-wider px-2 py-0.5 border border-purple-500/50 flex items-center gap-1 shrink-0">
          <Flame size={10} className="text-purple-400" /> BOSS
        </span>
      );
    }
    if (p.type === "criatura" || p.isCombatant) {
      return (
        <span className="text-[10px] bg-red-950/50 text-[var(--op-red-bright)] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-red-900/50 flex items-center gap-1 shrink-0">
          <Skull size={10} /> CRIATURA
        </span>
      );
    }
    if (p.isExtraSheet) {
      return (
        <span className="text-[10px] text-[#60a5fa] font-bold uppercase shrink-0">
          NPC
        </span>
      );
    }
    return (
      <span className="text-[10px] text-[#4ade80] font-bold uppercase shrink-0">
        JOGADOR
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 font-mono my-4 space-y-4">
      {/* Banner de Ordem de Iniciativa */}
      <div className="bg-[#0c0c10] border border-[#202028] outline outline-1 outline-[#181820] p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <Activity size={16} className="text-[var(--op-red-bright)] shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Iniciativa (Maior ➔ Menor)
              </span>
              <span className="text-[10px] bg-[#161620] text-[#8e8e9c] px-2 py-0.2 border border-[#242430]">
                {combined.length} combatentes
              </span>
            </div>
            <p className="text-xs text-[#828392] mt-0.5">
              Ordem automática decrescente de iniciativa (maior valor no topo).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onClearInitiatives && (
            <button
              type="button"
              onClick={onClearInitiatives}
              className="px-3 py-1.5 bg-[#121217] hover:bg-red-950/40 text-[#8e8e9c] hover:text-red-400 border border-[#202028] text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors"
              title="Zerar valores de iniciativa"
            >
              <RotateCcw size={13} />
              <span>Zerar Iniciativas</span>
            </button>
          )}
        </div>
      </div>

      {/* MODO LISTA */}
      {viewMode === "list" ? (
        <div className="bg-[#0c0c10] border border-[#202028] outline outline-1 outline-[#181820] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#202028] bg-[#101015] text-[11px] uppercase font-bold tracking-wider text-[#828392]">
                <th className="py-3 px-3 sm:px-4 w-16 text-center">Inic</th>
                <th className="py-3 px-3 sm:px-4">Combatente</th>
                <th className="py-3 px-3 sm:px-4 w-48">Vida (HP)</th>
                <th className="py-3 px-3 sm:px-4 w-44">
                  {currentGlobalMode === "rl" ? "SN" : "PE"}
                </th>
                <th className="py-3 px-3 sm:px-4">Condições</th>
                <th className="py-3 px-3 sm:px-4 text-right w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181820] text-xs">
              {combined.map((p) => {
                const initVal = initiatives[p.id] ?? (p.combatantData?.initiative);
                const isCurrentTurn = p.id === activeTurnId;

                const hpCurrent = p.hp?.current ?? 0;
                const hpMax = p.hp?.max ?? 100;
                const hpPct = Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100)) || 0;

                const peCurrent = p.pe?.current ?? 0;
                const peMax = p.pe?.max ?? 100;
                const pePct = Math.max(0, Math.min(100, (peCurrent / peMax) * 100)) || 0;

                const smCurrent = p.sm?.current ?? 0;
                const smMax = p.sm?.max ?? 100;
                const smPct = Math.max(0, Math.min(100, (smCurrent / smMax) * 100)) || 0;

                const isPlayerRl = (playerModes[p.id] || currentGlobalMode) === "rl";

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-[#121217] transition-colors"
                  >
                    {/* Iniciativa com edição manual */}
                    <td className="py-3 px-3 sm:px-4 text-center">
                      <input
                        type="number"
                        value={initVal !== undefined ? initVal : ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && onUpdateInitiative) {
                            onUpdateInitiative(p.id, val);
                          }
                        }}
                        placeholder="-"
                        className="w-12 h-6 bg-[#121217] border border-[#202028] text-white font-bold text-center text-xs outline-none focus:border-[var(--op-red)]"
                      />
                    </td>

                    {/* Nome & Tipo */}
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center gap-2">
                        {p.tokenUrl ? (
                          <img
                            src={p.tokenUrl}
                            alt={p.name}
                            className="w-6 h-6 object-cover border border-[#242430] shrink-0"
                          />
                        ) : null}
                        <div>
                          <div className="font-bold text-white truncate max-w-[200px] uppercase">
                            {p.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {renderParticipantBadge(p)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Barra de HP com suporte a Boss Multi-Fase */}
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center justify-between text-[11px] text-[#9ca3af] mb-1">
                        <span className="text-[#ef4444] font-bold">HP</span>
                        <span>{hpCurrent}/{hpMax}</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#181820] border border-[#242430] overflow-hidden mb-1.5">
                        <div
                          className={`h-full transition-all duration-200 ${
                            p.type === "boss" ? "bg-gradient-to-r from-purple-700 to-purple-500" : "bg-[#8f171c]"
                          }`}
                          style={{ width: `${hpPct}%` }}
                        />
                      </div>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handleStepStat(p, "hp", -1)}
                          className="w-6 h-6 flex items-center justify-center bg-[#121217] hover:bg-[#1a1a24] text-[#9ca3af] hover:text-white border border-[#202028] text-xs font-bold"
                          title="Diminuir HP"
                        >
                          <Minus size={10} />
                        </button>
                        <StatMathInput
                          value={hpCurrent}
                          onSave={(val) => {
                            if (p.isCombatant && p.combatantData) {
                              handleUpdateCombatantHp(p.combatantData, val);
                            } else {
                              onUpdateStat(p.rawPlayer || p, "hp", val, p.isExtraSheet, p.rawExtraSheetId);
                            }
                          }}
                          className="w-14 h-6 bg-[#0c0c10] border-y border-[#202028] text-center text-xs text-white font-bold outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleStepStat(p, "hp", 1)}
                          className="w-6 h-6 flex items-center justify-center bg-[#121217] hover:bg-[#1a1a24] text-[#9ca3af] hover:text-white border border-[#202028] text-xs font-bold"
                          title="Aumentar HP"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </td>

                    {/* PE / Sanidade */}
                    {isPlayerRl ? (
                      <td className="py-3 px-3 sm:px-4">
                        <div className="flex items-center justify-between text-[11px] text-[#9ca3af] mb-1">
                          <span className="text-purple-300 font-bold flex items-center gap-1">
                            <Brain size={11} /> SN
                          </span>
                          <span>{smCurrent}/{smMax}</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#181820] border border-[#242430] overflow-hidden mb-1.5">
                          <div
                            className="h-full bg-gradient-to-r from-purple-700 to-purple-500 transition-all duration-200"
                            style={{ width: `${smPct}%` }}
                          />
                        </div>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => handleStepStat(p, "sm", -1)}
                            className="w-6 h-6 flex items-center justify-center bg-[#121217] hover:bg-[#1a1a24] text-[#9ca3af] hover:text-white border border-[#202028] text-xs font-bold"
                          >
                            <Minus size={10} />
                          </button>
                          <StatMathInput
                            value={smCurrent}
                            onSave={(val) => {
                              if (p.isCombatant && p.combatantData && onUpdateCombatant) {
                                onUpdateCombatant({
                                  ...p.combatantData,
                                  sm: { ...p.combatantData.sm!, current: val },
                                });
                              } else {
                                onUpdateStat(p.rawPlayer || p, "sm", val, p.isExtraSheet, p.rawExtraSheetId);
                              }
                            }}
                            className="w-14 h-6 bg-[#0c0c10] border-y border-[#202028] text-center text-xs text-white font-bold outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepStat(p, "sm", 1)}
                            className="w-6 h-6 flex items-center justify-center bg-[#121217] hover:bg-[#1a1a24] text-[#9ca3af] hover:text-white border border-[#202028] text-xs font-bold"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </td>
                    ) : (
                      <td className="py-3 px-3 sm:px-4">
                        <div className="flex items-center justify-between text-[11px] text-[#9ca3af] mb-1">
                          <span className="text-yellow-500 font-bold flex items-center gap-1">
                            <Zap size={11} /> PE
                          </span>
                          <span>{peCurrent}/{peMax}</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#181820] border border-[#242430] overflow-hidden mb-1.5">
                          <div
                            className="h-full bg-yellow-500 transition-all duration-200"
                            style={{ width: `${pePct}%` }}
                          />
                        </div>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => handleStepStat(p, "pe", -1)}
                            className="w-6 h-6 flex items-center justify-center bg-[#121217] hover:bg-[#1a1a24] text-[#9ca3af] hover:text-white border border-[#202028] text-xs font-bold"
                          >
                            <Minus size={10} />
                          </button>
                          <StatMathInput
                            value={peCurrent}
                            onSave={(val) => {
                              if (p.isCombatant && p.combatantData && onUpdateCombatant) {
                                onUpdateCombatant({
                                  ...p.combatantData,
                                  pe: { ...p.combatantData.pe!, current: val },
                                });
                              } else {
                                onUpdateStat(p.rawPlayer || p, "pe", val, p.isExtraSheet, p.rawExtraSheetId);
                              }
                            }}
                            className="w-14 h-6 bg-[#0c0c10] border-y border-[#202028] text-center text-xs text-white font-bold outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepStat(p, "pe", 1)}
                            className="w-6 h-6 flex items-center justify-center bg-[#121217] hover:bg-[#1a1a24] text-[#9ca3af] hover:text-white border border-[#202028] text-xs font-bold"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </td>
                    )}

                    {/* Condições Clínicas */}
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {CONDITIONS_LIST.map((cond) => {
                          const isActive = (p.conditions || []).includes(cond.code);
                          return (
                            <button
                              key={cond.code}
                              type="button"
                              onClick={() => handleToggleCondition(p, cond.code)}
                              className={`text-[9px] uppercase font-bold px-1.5 py-0.5 border transition-all cursor-pointer ${
                                isActive ? cond.color : "bg-[#101015] text-[#5c5d6e] border-[#1e1e28] hover:text-white"
                              }`}
                              title={cond.name}
                            >
                              {cond.code}
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-3 sm:px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.isCombatant && p.combatantData?.originalData && onOpenCreatureSheet && (
                          <button
                            type="button"
                            onClick={() => onOpenCreatureSheet(p.combatantData.originalData!)}
                            className="p-1.5 bg-[#121217] hover:bg-[#1a1a24] text-[#60a5fa] border border-[#202028] cursor-pointer"
                            title="Abrir ficha completa da criatura"
                          >
                            <Maximize2 size={12} />
                          </button>
                        )}

                        {p.isExtraSheet && (
                          <button
                            type="button"
                            onClick={() => onOpenInteractiveSheet(p.rawExtraSheetId)}
                            className="p-1.5 bg-[#121217] hover:bg-[#1a1a24] text-[#60a5fa] border border-[#202028] cursor-pointer"
                            title="Abrir ficha extra"
                          >
                            <Maximize2 size={12} />
                          </button>
                        )}

                        {p.isCombatant && onRemoveCombatant ? (
                          <button
                            type="button"
                            onClick={() => onRemoveCombatant(p.id)}
                            className="p-1.5 bg-[#121217] hover:bg-red-950 text-[#8e8e9c] hover:text-red-400 border border-[#202028] cursor-pointer"
                            title="Remover do combate (mantém o modelo salvo na biblioteca)"
                          >
                            <Trash2 size={12} />
                          </button>
                        ) : !p.isCombatant && !p.isExtraSheet ? (
                          <button
                            type="button"
                            onClick={() => onKickPlayer(p.rawPlayer || p)}
                            className="p-1.5 bg-[#121217] hover:bg-[#1a1215] text-[#8e8e9c] hover:text-[var(--op-red-bright)] border border-[#202028] cursor-pointer"
                            title="Remover da sessão"
                          >
                            <Trash2 size={12} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* MODO GRADE */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {combined.map((p) => {
            const initVal = initiatives[p.id] ?? (p.combatantData?.initiative);
            const isCurrentTurn = p.id === activeTurnId;

            const hpCurrent = p.hp?.current ?? 0;
            const hpMax = p.hp?.max ?? 100;
            const hpPct = Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100)) || 0;

            const peCurrent = p.pe?.current ?? 0;
            const peMax = p.pe?.max ?? 100;
            const pePct = Math.max(0, Math.min(100, (peCurrent / peMax) * 100)) || 0;

            const smCurrent = p.sm?.current ?? 0;
            const smMax = p.sm?.max ?? 100;
            const smPct = Math.max(0, Math.min(100, (smCurrent / smMax) * 100)) || 0;

            const isPlayerRl = (playerModes[p.id] || currentGlobalMode) === "rl";

            return (
              <div
                key={p.id}
                className={`bg-[#0c0c10] border p-3.5 sm:p-4 flex flex-col justify-between transition-all ${
                  p.type === "boss"
                    ? "border-purple-800/40 outline outline-1 outline-purple-500/20"
                    : "border-[#202028] outline outline-1 outline-[#181820] hover:outline-[#3c3c4a]"
                }`}
              >
                <div>
                  {/* Header Card */}
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {p.tokenUrl ? (
                        <img
                          src={p.tokenUrl}
                          alt={p.name}
                          className="w-8 h-8 object-cover border border-[#242430] shrink-0"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {renderParticipantBadge(p)}
                        </div>
                        <h4 className="text-white font-bold text-sm truncate uppercase tracking-wider mt-1">
                          {p.name}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Input Iniciativa */}
                      <div className="flex items-center bg-[#121217] border border-[#202028] px-1.5 py-0.5">
                        <span className="text-[10px] text-[#707180] mr-1">Inic:</span>
                        <input
                          type="number"
                          value={initVal !== undefined ? initVal : ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && onUpdateInitiative) {
                              onUpdateInitiative(p.id, val);
                            }
                          }}
                          placeholder="-"
                          className="w-8 bg-transparent text-white font-bold text-center text-xs outline-none"
                        />
                      </div>

                      {p.isCombatant && onRemoveCombatant && (
                        <button
                          type="button"
                          onClick={() => onRemoveCombatant(p.id)}
                          className="p-1.5 bg-[#121217] hover:bg-red-950 text-[#8e8e9c] hover:text-red-400 border border-[#202028] min-h-[30px] min-w-[30px] flex items-center justify-center cursor-pointer"
                          title="Remover do combate"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* HP & PE/SN */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {/* HP */}
                    <div className="bg-[#101015] border border-[#202028] p-2">
                      <div className="flex items-center justify-between text-[10px] text-[#9ca3af] mb-1 font-bold uppercase tracking-wider">
                        <span className="text-[#ef4444] flex items-center gap-1">
                          <Heart size={10} /> HP
                        </span>
                        <span>{hpCurrent}/{hpMax}</span>
                      </div>
                      <div className="h-1.5 bg-[#181820] border border-[#242430] overflow-hidden mb-2">
                        <div
                          className={`h-full transition-all duration-200 ${
                            p.type === "boss" ? "bg-gradient-to-r from-purple-700 to-purple-500" : "bg-[#8f171c]"
                          }`}
                          style={{ width: `${hpPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleStepStat(p, "hp", -1)}
                          className="w-6 h-6 flex items-center justify-center bg-[#14141c] hover:bg-[#1e1e28] text-[#9ca3af] hover:text-white border border-[#202028] text-xs font-bold"
                        >
                          <Minus size={10} />
                        </button>
                        <StatMathInput
                          value={hpCurrent}
                          onSave={(val) => {
                            if (p.isCombatant && p.combatantData) {
                              handleUpdateCombatantHp(p.combatantData, val);
                            } else {
                              onUpdateStat(p.rawPlayer || p, "hp", val, p.isExtraSheet, p.rawExtraSheetId);
                            }
                          }}
                          className="w-12 h-6 bg-[#0c0c10] border-y border-[#202028] text-white text-xs font-bold text-center outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleStepStat(p, "hp", 1)}
                          className="w-6 h-6 flex items-center justify-center bg-[#14141c] hover:bg-[#1e1e28] text-[#9ca3af] hover:text-white border border-[#202028] text-xs font-bold"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>

                    {/* PE ou SN */}
                    {isPlayerRl ? (
                      <div className="bg-[#101015] border border-purple-900/40 p-2">
                        <div className="flex items-center justify-between text-[10px] text-[#9ca3af] mb-1 font-bold uppercase tracking-wider">
                          <span className="text-purple-300 flex items-center gap-1">
                            <Brain size={10} /> SN
                          </span>
                          <span>{smCurrent}/{smMax}</span>
                        </div>
                        <div className="h-1.5 bg-[#181820] border border-[#242430] overflow-hidden mb-2">
                          <div
                            className="h-full bg-gradient-to-r from-purple-700 to-purple-500 transition-all duration-200"
                            style={{ width: `${smPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleStepStat(p, "sm", -1)}
                            className="w-6 h-6 flex items-center justify-center bg-[#14141c] hover:bg-[#1e1e28] text-[#9ca3af] hover:text-white border border-[#202028] text-xs font-bold"
                          >
                            <Minus size={10} />
                          </button>
                          <StatMathInput
                            value={smCurrent}
                            onSave={(val) => {
                              if (p.isCombatant && p.combatantData && onUpdateCombatant) {
                                onUpdateCombatant({
                                  ...p.combatantData,
                                  sm: { ...p.combatantData.sm!, current: val },
                                });
                              } else {
                                onUpdateStat(p.rawPlayer || p, "sm", val, p.isExtraSheet, p.rawExtraSheetId);
                              }
                            }}
                            className="w-12 h-6 bg-[#0c0c10] border-y border-[#202028] text-white text-xs font-bold text-center outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepStat(p, "sm", 1)}
                            className="w-6 h-6 flex items-center justify-center bg-[#14141c] hover:bg-[#1e1e28] text-[#9ca3af] hover:text-white border border-[#202028] text-xs font-bold"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#101015] border border-[#202028] p-2">
                        <div className="flex items-center justify-between text-[10px] text-[#9ca3af] mb-1 font-bold uppercase tracking-wider">
                          <span className="text-yellow-500 flex items-center gap-1">
                            <Zap size={10} /> PE
                          </span>
                          <span>{peCurrent}/{peMax}</span>
                        </div>
                        <div className="h-1.5 bg-[#181820] border border-[#242430] overflow-hidden mb-2">
                          <div
                            className="h-full bg-yellow-500 transition-all duration-200"
                            style={{ width: `${pePct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleStepStat(p, "pe", -1)}
                            className="w-6 h-6 flex items-center justify-center bg-[#14141c] hover:bg-[#1e1e28] text-[#9ca3af] hover:text-white border border-[#202028] text-xs font-bold"
                          >
                            <Minus size={10} />
                          </button>
                          <StatMathInput
                            value={peCurrent}
                            onSave={(val) => {
                              if (p.isCombatant && p.combatantData && onUpdateCombatant) {
                                onUpdateCombatant({
                                  ...p.combatantData,
                                  pe: { ...p.combatantData.pe!, current: val },
                                });
                              } else {
                                onUpdateStat(p.rawPlayer || p, "pe", val, p.isExtraSheet, p.rawExtraSheetId);
                              }
                            }}
                            className="w-12 h-6 bg-[#0c0c10] border-y border-[#202028] text-white text-xs font-bold text-center outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepStat(p, "pe", 1)}
                            className="w-6 h-6 flex items-center justify-center bg-[#14141c] hover:bg-[#1e1e28] text-[#9ca3af] hover:text-white border border-[#202028] text-xs font-bold"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Condições / Status */}
                  <div className="mb-2.5">
                    <span className="text-[10px] text-[#8e8e9c] uppercase font-bold block mb-1">
                      Condições:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {CONDITIONS_LIST.map((cond) => {
                        const isActive = (p.conditions || []).includes(cond.code);
                        return (
                          <button
                            key={cond.code}
                            type="button"
                            onClick={() => handleToggleCondition(p, cond.code)}
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 border transition-all cursor-pointer ${
                              isActive ? cond.color : "bg-[#101015] text-[#5c5d6e] border-[#1e1e28] hover:text-white"
                            }`}
                            title={cond.name}
                          >
                            {cond.code}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Botões do Rodapé */}
                <div className="pt-2 border-t border-[#1a1a24] flex items-center gap-2">
                  {p.isCombatant && p.combatantData?.originalData && onOpenCreatureSheet && (
                    <button
                      type="button"
                      onClick={() => onOpenCreatureSheet(p.combatantData.originalData!)}
                      className="flex-1 py-1.5 bg-[#121217] hover:bg-[#181820] border border-[#202028] text-[#60a5fa] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Maximize2 size={12} />
                      <span>Ficha Completa</span>
                    </button>
                  )}

                  {p.isExtraSheet && (
                    <button
                      type="button"
                      onClick={() => onOpenInteractiveSheet(p.rawExtraSheetId)}
                      className="flex-1 py-1.5 bg-[#121217] hover:bg-[#181820] border border-[#202028] text-[#60a5fa] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Maximize2 size={12} />
                      <span>Abrir Ficha</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Limpar chat da mesa no rodapé */}
      {onClearChatHistory && (
        <div className="mt-8 p-3.5 bg-[#0c0c10] border border-[#202028] outline outline-1 outline-[#181820] flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2.5">
            <MessageSquare size={16} className="text-[var(--op-red-bright)] shrink-0" />
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">
                Chat da Mesa Coletivo
              </div>
              <div className="text-[11px] text-[#828392]">
                Histórico sincronizado em tempo real entre jogadores e mestre.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearChatHistory}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#121218] hover:bg-red-950/50 text-[#9ca3af] hover:text-red-400 border border-[#262632] hover:border-red-900/60 outline outline-1 outline-[#181820] text-xs uppercase tracking-wider transition-all cursor-pointer"
            title="Apagar mensagens do chat da mesa"
          >
            <Trash2 size={13} className="text-red-500" />
            <span>Limpar Histórico do Chat</span>
          </button>
        </div>
      )}
    </div>
  );
}
