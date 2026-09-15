
import React, { useState } from 'react';
import { Layer, Trait } from '../types';
import { Upload, X, Wand2, Percent, Layers, Trash2, Edit2, Check } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface TraitGridProps {
  layer: Layer | null;
  collectionSize: number;
  onAddTraits: (files: File[]) => void;
  onDeleteTrait: (traitId: string) => void;
  onRenameTrait: (traitId: string, newName: string) => void;
  onClearAll: () => void;
  onUpdateRarity: (traitId: string, rarity: number) => void;
  onBulkUpdateRarity: (updates: { traitId: string, rarity: number }[]) => void;
}

export const TraitGrid: React.FC<TraitGridProps> = ({
  layer,
  collectionSize,
  onAddTraits,
  onDeleteTrait,
  onRenameTrait,
  onClearAll,
  onUpdateRarity,
  onBulkUpdateRarity
}) => {
  const [isOptimizing, setIsOptimizing] = React.useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  if (!layer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[#0f172a]/50 backdrop-blur-sm">
        <div className="relative mb-6">
          <Layers size={80} className="opacity-10" />
          <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-full" />
        </div>
        <p className="text-2xl font-medium tracking-tight">Select a component to start building</p>
        <p className="text-sm mt-2 opacity-50">Upload parts or import your folder structure</p>
      </div>
    );
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onAddTraits(Array.from(e.target.files));
    }
  };

  const handleOptimizeRarity = async () => {
    if (layer.traits.length === 0) return;
    setIsOptimizing(true);
    try {
      const traitsData = layer.traits.map(t => ({ name: t.name, currentRarity: t.rarity }));
      const optimized = await geminiService.optimizeRarity(traitsData);
      
      const updates = layer.traits.map(t => {
        const opt = optimized.find((o: any) => o.name === t.name);
        return { traitId: t.id, rarity: opt ? opt.optimizedRarity : t.rarity };
      });
      onBulkUpdateRarity(updates);
    } catch (err) {
      console.error(err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const startEditing = (trait: Trait) => {
    setEditingId(trait.id);
    setTempName(trait.name);
  };

  const saveRename = (id: string) => {
    if (tempName.trim()) {
      onRenameTrait(id, tempName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-transparent pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 md:mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-black tracking-tight">{layer.name}</h2>
            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20">
              {layer.traits.length} Parts
            </span>
          </div>
          <p className="text-gray-400 text-sm">Organize and balance availability for this component's parts.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {layer.traits.length > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all font-bold text-sm border border-red-500/20"
            >
              <Trash2 size={16} /> Clear All
            </button>
          )}
          <button
            onClick={handleOptimizeRarity}
            disabled={isOptimizing || layer.traits.length < 2}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#7c3aed]/10 hover:bg-[#7c3aed]/20 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-[#c084fc] rounded-xl transition-all font-bold text-sm border border-[#7c3aed]/30 shadow-lg shadow-purple-500/5"
          >
            <Wand2 size={18} className={isOptimizing ? 'animate-spin' : ''} />
            {isOptimizing ? 'Thinking...' : 'AI Smart Balance'}
          </button>
          <label className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer transition-all font-bold text-sm shadow-xl shadow-indigo-500/20 active:scale-95">
            <Upload size={18} />
            Upload PNGs
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      {layer.traits.length === 0 ? (
        <div className="border-2 border-dashed border-white/5 bg-white/[0.02] rounded-[2.5rem] h-80 flex flex-col items-center justify-center text-gray-500 group hover:border-indigo-500/20 transition-all">
           <div className="relative mb-6">
             <Upload size={56} className="opacity-10 group-hover:scale-110 transition-transform" />
             <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
           </div>
           <p className="text-lg font-medium">Empty Component</p>
           <p className="text-sm mt-1 opacity-50">Drag and drop PNG parts to populate this component.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {layer.traits.map((trait) => (
            <div key={trait.id} className="bg-[#1e293b]/50 backdrop-blur-sm rounded-3xl overflow-hidden border border-white/5 group hover:border-indigo-500/30 hover:bg-[#1e293b]/80 transition-all duration-300">
              <div className="aspect-square bg-[#0f172a] relative p-6 flex items-center justify-center">
                <img src={trait.imageData} alt={trait.name} className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-2xl" />
                <button
                  onClick={() => onDeleteTrait(trait.id)}
                  className="absolute top-4 right-4 p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-red-500/20"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 border-t border-white/5">
                <div className="flex justify-between items-center mb-4 min-h-[1.5rem]">
                  {editingId === trait.id ? (
                    <div className="flex items-center gap-1 w-full">
                      <input 
                        autoFocus
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onBlur={() => saveRename(trait.id)}
                        onKeyDown={(e) => e.key === 'Enter' && saveRename(trait.id)}
                        className="bg-[#0f172a] border border-indigo-500/50 rounded-lg px-2 py-1 text-xs w-full focus:outline-none"
                      />
                      <button onClick={() => saveRename(trait.id)} className="text-green-500"><Check size={14}/></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full group/name">
                      <span className="text-sm font-bold text-gray-200 truncate pr-2" title={trait.name}>{trait.name}</span>
                      <button onClick={() => startEditing(trait)} className="opacity-0 group-hover/name:opacity-100 text-indigo-400">
                        <Edit2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-[#0f172a]/50 rounded-2xl px-4 py-2 border border-white/5 focus-within:border-indigo-500/30 transition-all">
                    <Percent size={14} className="text-indigo-400 shrink-0" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={trait.rarity}
                      onChange={(e) => onUpdateRarity(trait.id, parseFloat(e.target.value) || 0)}
                      className="bg-transparent text-sm w-full focus:outline-none text-white font-mono font-bold"
                    />
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Est. Production</span>
                    <span className="text-[10px] text-indigo-400 font-mono font-bold">
                      ~{Math.round((trait.rarity / 100) * collectionSize)} units
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
