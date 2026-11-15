import React, { useState, useRef } from "react";
import {
  X,
  Skull,
  Shield,
  Zap,
  Sword,
  FileText,
  Dices,
  Image as ImageIcon,
  Flame,
} from "lucide-react";
import { CreatureBossData, CreatureType } from "../../types/creature";
import { createDefaultCreature, calculateCreatureMaxStats } from "../../services/creatureService";

interface CreatureQuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndAddToCombat: (creature: CreatureBossData) => void;
  onSaveToLibrary: (creature: CreatureBossData) => void;
}

export function CreatureQuickCreateModal({
  isOpen,
  onClose,
  onSaveAndAddToCombat,
  onSaveToLibrary,
}: CreatureQuickCreateModalProps) {
  const [formData, setFormData] = useState<CreatureBossData>(() => createDefaultCreature("criatura"));
  const inputRefs = useRef<Array<HTMLInputElement | HTMLTextAreaElement | null>>([]);

  if (!isOpen) return null;

  const handleTypeChange = (type: CreatureType) => {
    const updated = createDefaultCreature(type);
    setFormData({
      ...updated,
      name: formData.name === "Nova Criatura" || formData.name === "Novo Boss" || formData.name === "Nova Entidade Boss"
        ? updated.name
        : formData.name,
      tokenUrl: formData.tokenUrl,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleAttributeChange = (attr: keyof CreatureBossData["attributes"], val: number) => {
    const clamped = Math.max(-5, Math.min(20, val));
    const nextAttrs = { ...formData.attributes, [attr]: clamped };

    const { hpMax, peMax, smMax } = calculateCreatureMaxStats(nextAttrs);

    setFormData((prev) => ({
      ...prev,
      attributes: nextAttrs,
      hp: { current: hpMax, max: hpMax },
      pe: { current: peMax, max: peMax },
      sm: { current: smMax, max: smMax },
    }));
  };

  const handlePrimaryAttackChange = (field: "name" | "testFormula" | "damageFormula", val: string) => {
    const updatedAttacks = [...(formData.attacks || [])];
    const updatedSkills = [...(formData.skills || [])];
    if (updatedAttacks.length === 0) {
      updatedAttacks.push({
        id: "atk_1",
        name: "Habilidade Principal",
        testFormula: "2d6+AGL",
        damageFormula: "1d8+FOR",
      });
    }
    if (updatedSkills.length === 0) {
      updatedSkills.push({
        id: 1,
        name: "Habilidade Principal",
        cost: 0,
        desc: "Habilidade principal da criatura.",
        test: "2d6+AGL",
        damage: "1d8+FOR",
      });
    }
    updatedAttacks[0] = { ...updatedAttacks[0], [field]: val };
    if (field === "name") updatedSkills[0].name = val;
    if (field === "testFormula") updatedSkills[0].test = val;
    if (field === "damageFormula") updatedSkills[0].damage = val;
    setFormData((prev) => ({ ...prev, attacks: updatedAttacks, skills: updatedSkills }));
  };

  const handleSave = (addToCombat: boolean) => {
    const finalData: CreatureBossData = {
      ...formData,
      edicao_inicial_concluida: true,
      last_local_edit: Date.now(),
    };
    if (addToCombat) {
      onSaveAndAddToCombat(finalData);
    } else {
      onSaveToLibrary(finalData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto font-mono">
      <div className="relative w-full max-w-2xl bg-[#0c0c10] border border-[#262632] shadow-2xl my-4 text-[#dedede]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-[#111116] border-b border-[#202028]">
          <div className="flex items-center gap-2">
            <Skull size={16} className={formData.type === "boss" ? "text-purple-400" : "text-[var(--op-red-bright)]"} />
            <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Nova Ficha — {formData.type === "boss" ? "Boss" : "Criatura"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Fechar"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-3 sm:p-5 space-y-3.5 max-h-[82vh] overflow-y-auto no-scrollbar">
          {/* Seletor de Tipo */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 uppercase font-bold w-14">Tipo:</span>
            <div className="flex-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange("criatura")}
                className={`py-2 px-3 text-xs uppercase font-bold tracking-wider border cursor-pointer transition-all flex items-center justify-center gap-2 min-h-[40px] ${
                  formData.type === "criatura"
                    ? "bg-[rgba(181,42,48,0.2)] text-white border-[var(--op-red)] shadow-sm"
                    : "bg-[#101015] text-zinc-400 hover:text-white border-[#202028]"
                }`}
              >
                <Skull size={13} />
                <span>Criatura</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("boss")}
                className={`py-2 px-3 text-xs uppercase font-bold tracking-wider border cursor-pointer transition-all flex items-center justify-center gap-2 min-h-[40px] ${
                  formData.type === "boss"
                    ? "bg-purple-950/50 text-purple-200 border-purple-500 shadow-sm"
                    : "bg-[#101015] text-zinc-400 hover:text-white border-[#202028]"
                }`}
              >
                <Flame size={13} className="text-purple-400" />
                <span>Boss</span>
              </button>
            </div>
          </div>

          {/* Nome e Token */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] text-zinc-400 uppercase font-bold block">
                Nome *
              </label>
              <input
                ref={(el) => { inputRefs.current[0] = el; }}
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, 0)}
                placeholder="Nome..."
                className="w-full bg-[#101015] border border-[#242430] focus:border-[var(--op-red)] text-white text-xs font-bold uppercase tracking-wider px-3 py-2 outline-none min-h-[40px]"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 uppercase font-bold block flex items-center gap-1">
                <ImageIcon size={11} /> URL da Imagem
              </label>
              <input
                ref={(el) => { inputRefs.current[1] = el; }}
                type="text"
                value={formData.tokenUrl || ""}
                onChange={(e) => setFormData({ ...formData, tokenUrl: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, 1)}
                placeholder="https://..."
                className="w-full bg-[#101015] border border-[#242430] focus:border-[var(--op-red)] text-white text-xs px-3 py-2 outline-none truncate min-h-[40px]"
              />
            </div>
          </div>

          {/* Atributos Principais Demologia */}
          <div className="bg-[#101015] border border-[#202028] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Dices size={12} className="text-[var(--op-red-bright)]" /> Atributos
              </span>
              <span className="text-[10px] text-zinc-500">Cálculos automáticos</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(["FOR", "AGL", "INT", "VIT", "SAN", "OCU"] as const).map((attr) => (
                <div key={attr} className="bg-[#0a0a0e] border border-[#1e1e28] p-2 text-center">
                  <span className="text-[10px] text-zinc-400 font-bold block uppercase">{attr}</span>
                  <input
                    type="number"
                    value={formData.attributes[attr]}
                    onChange={(e) => handleAttributeChange(attr, parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-transparent text-center text-white text-sm font-bold outline-none py-1 border-b border-transparent focus:border-[var(--op-red)] min-h-[30px]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Status Equivalentes aos Players: HP, PE, SM */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-[#101015] border border-[#202028] p-2.5 space-y-1">
              <label className="text-[10px] font-bold text-[var(--op-red-bright)] uppercase tracking-wider flex items-center justify-between">
                <span>Vida (HP)</span>
                <span className="text-zinc-500 text-[9px]">20+(VIT×6)</span>
              </label>
              <input
                ref={(el) => { inputRefs.current[2] = el; }}
                type="number"
                value={formData.hp.max}
                onChange={(e) => {
                  const max = Math.max(1, parseInt(e.target.value, 10) || 1);
                  setFormData({
                    ...formData,
                    hp: { current: max, max },
                  });
                }}
                onKeyDown={(e) => handleKeyDown(e, 2)}
                className="w-full bg-[#0a0a0e] border border-[#22222e] text-center text-white font-bold text-xs py-2 outline-none focus:border-[var(--op-red)] min-h-[38px]"
                placeholder="Máx HP"
              />
            </div>

            <div className="bg-[#101015] border border-[#202028] p-2.5 space-y-1">
              <label className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider flex items-center justify-between">
                <span>Esforço (PE)</span>
                <span className="text-zinc-500 text-[9px]">5+(AGL×3)+(SAN×2)</span>
              </label>
              <input
                ref={(el) => { inputRefs.current[3] = el; }}
                type="number"
                value={formData.pe.max}
                onChange={(e) => {
                  const max = Math.max(0, parseInt(e.target.value, 10) || 0);
                  setFormData({
                    ...formData,
                    pe: { current: max, max },
                  });
                }}
                onKeyDown={(e) => handleKeyDown(e, 3)}
                className="w-full bg-[#0a0a0e] border border-[#22222e] text-center text-white font-bold text-xs py-2 outline-none focus:border-yellow-500 min-h-[38px]"
                placeholder="Máx PE"
              />
            </div>

            <div className="bg-[#101015] border border-[#202028] p-2.5 space-y-1">
              <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center justify-between">
                <span>Sanidade (SM)</span>
                <span className="text-zinc-500 text-[9px]">30+(SAN×4)</span>
              </label>
              <input
                type="number"
                value={formData.sm.max}
                onChange={(e) => {
                  const max = Math.max(1, parseInt(e.target.value, 10) || 1);
                  setFormData({
                    ...formData,
                    sm: { current: max, max },
                  });
                }}
                className="w-full bg-[#0a0a0e] border border-[#22222e] text-center text-white font-bold text-xs py-2 outline-none focus:border-purple-500 min-h-[38px]"
                placeholder="Máx SM"
              />
            </div>
          </div>

          {/* Habilidade / Ataque Principal */}
          <div className="bg-[#101015] border border-[#202028] p-3 space-y-2">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sword size={12} className="text-[var(--op-red-bright)]" /> Habilidade Principal (Skill)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                ref={(el) => { inputRefs.current[4] = el; }}
                type="text"
                value={formData.skills?.[0]?.name || formData.attacks?.[0]?.name || ""}
                onChange={(e) => handlePrimaryAttackChange("name", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 4)}
                placeholder="Nome da Skill (ex: Golpe)"
                className="bg-[#0a0a0e] border border-[#22222e] text-white text-xs px-2.5 py-2 outline-none focus:border-[var(--op-red)] min-h-[38px]"
              />
              <input
                ref={(el) => { inputRefs.current[5] = el; }}
                type="text"
                value={formData.skills?.[0]?.test || formData.attacks?.[0]?.testFormula || ""}
                onChange={(e) => handlePrimaryAttackChange("testFormula", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 5)}
                placeholder="Teste (ex: 2d6+AGL)"
                className="bg-[#0a0a0e] border border-[#22222e] text-white text-xs px-2.5 py-2 outline-none focus:border-[var(--op-red)] min-h-[38px]"
              />
              <input
                ref={(el) => { inputRefs.current[6] = el; }}
                type="text"
                value={formData.skills?.[0]?.damage || formData.attacks?.[0]?.damageFormula || ""}
                onChange={(e) => handlePrimaryAttackChange("damageFormula", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 6)}
                placeholder="Dano (ex: 1d8+FOR)"
                className="bg-[#0a0a0e] border border-[#22222e] text-white text-xs px-2.5 py-2 outline-none focus:border-[var(--op-red)] min-h-[38px]"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                <Shield size={10} /> Resistências
              </label>
              <input
                ref={(el) => { inputRefs.current[7] = el; }}
                type="text"
                value={formData.resistances}
                onChange={(e) => setFormData({ ...formData, resistances: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, 7)}
                placeholder="Ex: Corte 5, Fogo 10..."
                className="w-full bg-[#101015] border border-[#242430] text-white text-xs px-3 py-2 outline-none focus:border-[var(--op-red)] min-h-[38px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                <FileText size={10} /> Anotações
              </label>
              <input
                ref={(el) => { inputRefs.current[8] = el; }}
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Detalhes..."
                className="w-full bg-[#101015] border border-[#242430] text-white text-xs px-3 py-2 outline-none focus:border-[var(--op-red)] min-h-[38px]"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-3 sm:px-4 py-3 bg-[#111116] border-t border-[#202028] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 bg-transparent hover:bg-white/[0.05] text-zinc-400 hover:text-white text-xs font-mono uppercase tracking-wider border border-[#242430] transition-colors cursor-pointer min-h-[40px]"
          >
            Cancelar
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#161620] hover:bg-[#20202e] text-zinc-300 hover:text-white text-xs font-mono font-bold uppercase tracking-wider border border-[#2e2e3e] transition-colors cursor-pointer min-h-[40px]"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[var(--op-red)] hover:bg-red-700 text-white text-xs font-mono font-bold uppercase tracking-wider border border-red-950 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md min-h-[40px]"
            >
              <Zap size={14} />
              <span>Criar e Entrar em Combate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
