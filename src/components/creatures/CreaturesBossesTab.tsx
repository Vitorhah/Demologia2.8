import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  Copy,
  Trash2,
  Maximize2,
  Skull,
  Flame,
  Cloud,
  CloudOff,
  Download,
  Upload,
  Swords,
  Heart,
  Zap,
  Shield,
  Layers,
} from "lucide-react";
import { CreatureBossData, CreatureType } from "../../types/creature";
import { duplicateCreature, createDefaultCreature } from "../../services/creatureService";
import { StatMathInput } from "../StatMathInput";

export interface CreaturesBossesTabProps {
  creatures: CreatureBossData[];
  setCreatures: React.Dispatch<React.SetStateAction<CreatureBossData[]>>;
  onOpenQuickCreate: () => void;
  onOpenSheet: (creature: CreatureBossData) => void;
  onAddToCombat: (creature: CreatureBossData, quantity: number) => void;
  onToggleSync: (creature: CreatureBossData) => void;
  supabase: any;
}

export function CreaturesBossesTab({
  creatures,
  setCreatures,
  onOpenQuickCreate,
  onOpenSheet,
  onAddToCombat,
  onToggleSync,
  supabase,
}: CreaturesBossesTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "criatura" | "boss">("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "hp">("name");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [batchQuantities, setBatchQuantities] = useState<Record<string, number>>({});

  const filteredCreatures = useMemo(() => {
    return creatures
      .filter((c) => {
        const matchesSearch =
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.notes.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === "all" || c.type === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "hp") return (b.hp?.max ?? 0) - (a.hp?.max ?? 0);
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [creatures, searchTerm, typeFilter, sortBy]);

  const handleDuplicate = (c: CreatureBossData) => {
    const duplicated = duplicateCreature(c, creatures);
    setCreatures((prev) => [duplicated, ...prev]);
  };

  const handleDelete = async (c: CreatureBossData) => {
    if (c.synchronized) {
      try {
        await supabase
          .from("players")
          .delete()
          .eq("id", `CREATURE_${c.id}`);
        await supabase
          .from("players")
          .delete()
          .eq("id", `EXTRA_FICHA_${c.id}`);
      } catch (err) {
        console.warn("Erro ao remover criatura do Supabase:", err);
      }
    }
    setCreatures((prev) => prev.filter((item) => item.id !== c.id));
    setDeletingId(null);
  };

  const handleExportJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(creatures, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `demologia_criaturas_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportJson = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re: any) => {
        try {
          const content = JSON.parse(re.target.result);
          if (Array.isArray(content)) {
            setCreatures((prev) => {
              const existingIds = new Set(prev.map((c) => c.id));
              const validNew = content.filter((item) => item && item.id && !existingIds.has(item.id));
              return [...validNew, ...prev];
            });
          }
        } catch {
          alert("Arquivo JSON inválido.");
        }
      };
      reader.readAsText(file, "UTF-8");
    };
    input.click();
  };

  const handleBatchAdd = (creature: CreatureBossData) => {
    const qty = batchQuantities[creature.id] || 1;
    onAddToCombat(creature, qty);
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-3 sm:gap-4 px-2 sm:px-4 font-mono my-3 sm:my-4">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0c0c10] border border-[#202028] p-3 sm:p-4">
        <div className="flex items-center gap-2.5">
          <Skull size={18} className="text-[var(--op-red-bright)] shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
            Criaturas & Bosses
          </h2>
          <span className="text-[10px] bg-[#161620] text-zinc-400 px-2 py-0.5 border border-[#242430]">
            {creatures.length}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportJson}
            className="p-2 sm:px-3 bg-[#121217] hover:bg-[#1a1a22] text-zinc-400 hover:text-white border border-[#22222e] text-xs uppercase cursor-pointer min-h-[38px] flex items-center gap-1.5"
            title="Exportar JSON"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button
            type="button"
            onClick={handleImportJson}
            className="p-2 sm:px-3 bg-[#121217] hover:bg-[#1a1a22] text-zinc-400 hover:text-white border border-[#22222e] text-xs uppercase cursor-pointer min-h-[38px] flex items-center gap-1.5"
            title="Importar JSON"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Importar</span>
          </button>

          <button
            type="button"
            onClick={onOpenQuickCreate}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[var(--op-red)] hover:bg-red-700 text-white text-xs font-mono font-bold uppercase tracking-wider border border-red-950 transition-colors cursor-pointer min-h-[38px] shadow-sm"
          >
            <Plus size={15} />
            <span>Nova Ficha</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtro, Busca e Ordenação */}
      <div className="bg-[#0c0c10] border border-[#202028] p-2.5 sm:p-3 flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center justify-between">
        {/* Campo de Busca */}
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar ficha..."
            className="w-full bg-[#101015] border border-[#22222e] text-white text-xs pl-8 pr-3 py-2 outline-none focus:border-[var(--op-red)] min-h-[38px]"
          />
        </div>

        {/* Filtros de Tipo e Ordenação */}
        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-between md:justify-end">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`px-2.5 py-1.5 text-xs uppercase font-bold border transition-colors cursor-pointer min-h-[36px] ${
                typeFilter === "all"
                  ? "bg-[#181822] text-white border-[var(--op-red)]"
                  : "bg-[#101015] text-zinc-400 border-[#202028] hover:text-white"
              }`}
            >
              Todas ({creatures.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("criatura")}
              className={`px-2.5 py-1.5 text-xs uppercase font-bold border transition-colors cursor-pointer flex items-center gap-1 min-h-[36px] ${
                typeFilter === "criatura"
                  ? "bg-[#181822] text-white border-[var(--op-red)]"
                  : "bg-[#101015] text-zinc-400 border-[#202028] hover:text-white"
              }`}
            >
              <Skull size={12} />
              <span>Criaturas</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("boss")}
              className={`px-2.5 py-1.5 text-xs uppercase font-bold border transition-colors cursor-pointer flex items-center gap-1 min-h-[36px] ${
                typeFilter === "boss"
                  ? "bg-purple-950/70 text-purple-200 border-purple-500"
                  : "bg-[#101015] text-zinc-400 border-[#202028] hover:text-white"
              }`}
            >
              <Flame size={12} className="text-purple-400" />
              <span>Bosses</span>
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#101015] border border-[#202028] text-xs text-zinc-300 px-2 py-1.5 outline-none min-h-[36px] cursor-pointer"
          >
            <option value="name">Nome</option>
            <option value="hp">Maior HP</option>
            <option value="date">Recentes</option>
          </select>
        </div>
      </div>

      {/* Grid de Cards da Biblioteca */}
      {filteredCreatures.length === 0 ? (
        <div className="py-12 text-center flex flex-col items-center justify-center bg-[#0c0c10] border border-[#202028]">
          <Skull size={28} className="text-zinc-600 mb-2 opacity-60" />
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Nenhuma criatura encontrada
          </h4>
          <p className="text-xs text-zinc-500 mt-1">
            Clique em "Nova Ficha" para criar uma criatura ou boss.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCreatures.map((creature) => {
            const isBoss = creature.type === "boss";
            const hpCurrent = creature.hp?.current ?? 26;
            const hpMax = creature.hp?.max ?? 26;
            const hpPct = Math.max(0, Math.min(100, (hpCurrent / (hpMax || 1)) * 100)) || 0;
            const batchQty = batchQuantities[creature.id] || 1;

            return (
              <div
                key={creature.id}
                className={`bg-[#0c0c10] border p-3 sm:p-4 flex flex-col justify-between transition-all ${
                  isBoss
                    ? "border-purple-800/40"
                    : creature.synchronized
                    ? "border-[var(--op-red)]"
                    : "border-[#202028] hover:border-[#333342]"
                }`}
              >
                <div>
                  {/* Topo do Card */}
                  <div className="flex justify-between items-start mb-2.5 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {creature.tokenUrl ? (
                        <img
                          src={creature.tokenUrl}
                          alt={creature.name}
                          className="w-9 h-9 object-cover border border-[#282834] shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-[#14141c] border border-[#282834] flex items-center justify-center shrink-0">
                          <Skull size={15} className={isBoss ? "text-purple-400" : "text-[var(--op-red-bright)]"} />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isBoss ? (
                            <span className="text-[9px] bg-purple-950/70 text-purple-300 font-bold uppercase tracking-wider px-1.5 py-0.2 border border-purple-800/40">
                              BOSS
                            </span>
                          ) : (
                            <span className="text-[9px] bg-[#161620] text-zinc-400 font-bold uppercase tracking-wider px-1.5 py-0.2 border border-[#262634]">
                              CRIATURA
                            </span>
                          )}
                          {creature.synchronized && (
                            <span className="text-[9px] text-[var(--op-red-bright)] font-bold uppercase">
                              • Nuvem
                            </span>
                          )}
                        </div>
                        <h3 className="text-white font-bold text-sm truncate uppercase tracking-wider mt-0.5">
                          {creature.name}
                        </h3>
                      </div>
                    </div>

                    {/* Ações do Topo */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleSync(creature)}
                        title={creature.synchronized ? "Sincronizado" : "Sincronizar"}
                        className={`p-1.5 transition-all cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center ${
                          creature.synchronized
                            ? "text-[var(--op-red-bright)] bg-[rgba(181,42,48,0.2)] border border-[var(--op-red)]"
                            : "text-zinc-500 hover:text-white bg-[#121217] border border-[#202028]"
                        }`}
                      >
                        {creature.synchronized ? <Cloud size={13} /> : <CloudOff size={13} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicate(creature)}
                        title="Duplicar"
                        className="p-1.5 text-zinc-500 hover:text-white bg-[#121217] border border-[#202028] min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                      >
                        <Copy size={13} />
                      </button>

                      {deletingId === creature.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(creature)}
                            className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white text-[10px] font-bold uppercase"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="px-2 py-1 bg-[#181820] text-zinc-400 text-[10px] font-bold uppercase"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingId(creature.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 bg-[#121217] border border-[#202028] min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status: Vida & Fases */}
                  <div className="bg-[#101015] border border-[#202028] p-2.5 mb-2.5">
                    <div className="flex items-center justify-between text-[11px] mb-1 font-bold">
                      <span className="text-[var(--op-red-bright)] flex items-center gap-1">
                        <Heart size={11} /> HP: {hpCurrent}/{hpMax}
                      </span>
                      {isBoss && creature.bossPhases && creature.bossPhases.length > 1 ? (
                        <span className="text-purple-400 text-[10px] flex items-center gap-1">
                          <Layers size={10} /> {creature.bossPhases.length} Fases
                        </span>
                      ) : (
                        <span className="text-yellow-500 text-[10px] flex items-center gap-1 font-bold">
                          <Zap size={10} /> PE: {creature.pe?.current ?? 0}/{creature.pe?.max ?? 0}
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 bg-[#181820] border border-[#242430] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${
                          isBoss ? "bg-gradient-to-r from-purple-700 to-purple-500" : "bg-[var(--op-red)]"
                        }`}
                        style={{ width: `${hpPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Atributos Resumidos */}
                  <div className="grid grid-cols-6 gap-1 text-center mb-2.5">
                    {(["FOR", "AGL", "INT", "VIT", "SAN", "OCU"] as const).map((attr) => (
                      <div key={attr} className="bg-[#101015] border border-[#1e1e28] py-1">
                        <span className="text-[9px] text-zinc-500 block font-bold">{attr}</span>
                        <span className="text-xs text-white font-bold">{creature.attributes[attr]}</span>
                      </div>
                    ))}
                  </div>

                  {/* Habilidade / Ataque */}
                  {creature.skills && creature.skills.length > 0 ? (
                    <div className="text-[10px] text-zinc-400 border-t border-[#1a1a24] pt-2 mb-2">
                      <div className="flex items-center justify-between bg-[#0a0a0e] p-1.5 border border-[#1e1e28]">
                        <span className="text-white font-bold truncate pr-1">{creature.skills[0].name}</span>
                        <span className="text-[var(--op-red-bright)] font-bold shrink-0">
                          {creature.skills[0].test || "2d6+AGL"} • {creature.skills[0].damage || "1d8+FOR"}
                        </span>
                      </div>
                    </div>
                  ) : creature.attacks && creature.attacks.length > 0 ? (
                    <div className="text-[10px] text-zinc-400 border-t border-[#1a1a24] pt-2 mb-2">
                      <div className="flex items-center justify-between bg-[#0a0a0e] p-1.5 border border-[#1e1e28]">
                        <span className="text-white font-bold truncate pr-1">{creature.attacks[0].name}</span>
                        <span className="text-[var(--op-red-bright)] font-bold shrink-0">
                          {creature.attacks[0].testFormula} • {creature.attacks[0].damageFormula}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {creature.notes && (
                    <p className="text-[10px] text-zinc-500 line-clamp-1 italic mb-2">
                      "{creature.notes}"
                    </p>
                  )}
                </div>

                {/* Rodapé: Abrir Ficha & Adicionar ao Combate */}
                <div className="mt-2.5 pt-2 border-t border-[#1a1a24] flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenSheet(creature)}
                    className="flex-1 py-2 bg-[#14141c] hover:bg-[#1c1c28] border border-[#242432] text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
                  >
                    <Maximize2 size={13} />
                    <span>Ficha</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={batchQty}
                      onChange={(e) =>
                        setBatchQuantities({
                          ...batchQuantities,
                          [creature.id]: Math.max(1, parseInt(e.target.value, 10) || 1),
                        })
                      }
                      className="w-10 bg-[#121217] border border-[#22222e] text-center text-xs text-white font-bold py-2 outline-none min-h-[38px]"
                      title="Quantidade"
                    />
                    <button
                      type="button"
                      onClick={() => handleBatchAdd(creature)}
                      className="px-3 py-2 bg-[var(--op-red)] hover:bg-red-700 text-white border border-red-950 text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer min-h-[38px]"
                      title="Adicionar ao combate"
                    >
                      <Swords size={13} />
                      <span className="hidden sm:inline">+ Lutar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
