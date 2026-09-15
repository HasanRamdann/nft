
import React, { useState } from 'react';
import { Layer } from '../types';
import { Plus, Trash2, Layers, FolderInput, Edit2, Check, GripVertical, Percent, FileUp, ImagePlus, ShieldAlert } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface LayerSidebarProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onReorderLayers: (startIndex: number, endIndex: number) => void;
  onRenameLayer: (id: string, newName: string) => void;
  onUpdateLayerRarity: (id: string, rarity: number) => void;
  onBulkFolderUpload: (files: FileList) => void;
  onImportFile: (file: File) => void;
  onImportImages: (files: FileList) => void;
  onOpenRules?: () => void;
  activeRulesCount?: number;
}

export const LayerSidebar: React.FC<LayerSidebarProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onReorderLayers,
  onRenameLayer,
  onUpdateLayerRarity,
  onBulkFolderUpload,
  onImportFile,
  onImportImages,
  onOpenRules,
  activeRulesCount = 0
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  const startEditing = (layer: Layer) => {
    setEditingId(layer.id);
    setTempName(layer.name);
  };

  const saveRename = (id: string) => {
    if (tempName.trim()) {
      onRenameLayer(id, tempName.trim());
    }
    setEditingId(null);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    onReorderLayers(result.source.index, result.destination.index);
  };

  return (
    <div className="w-full md:w-80 bg-[#1e293b]/60 backdrop-blur-xl border-r border-white/5 flex flex-col h-full shadow-2xl">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <h2 className="text-xl font-black flex items-center gap-2 tracking-tight">
          <Layers size={22} className="text-indigo-400" />
          الطبقات
        </h2>
        <div className="flex gap-1.5 items-center">
          {onOpenRules && (
            <button
              onClick={onOpenRules}
              className="p-2 hover:bg-white/5 rounded-xl transition-all text-amber-400 border border-transparent hover:border-amber-400/20 relative"
              title="شروط وقواعد الطبقات (Layer Rules)"
            >
              <ShieldAlert size={20} />
              {activeRulesCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              )}
            </button>
          )}
          <label className="p-2 hover:bg-white/5 rounded-xl transition-all text-purple-400 cursor-pointer border border-transparent hover:border-purple-400/20" title="Import Images as Individual Components">
            <ImagePlus size={20} />
            <input 
              type="file" 
              className="hidden" 
              multiple
              accept="image/*"
              onChange={(e) => e.target.files && onImportImages(e.target.files)} 
            />
          </label>
          <label className="p-2 hover:bg-white/5 rounded-xl transition-all text-blue-400 cursor-pointer border border-transparent hover:border-blue-400/20" title="Import PSD/ZIP">
            <FileUp size={20} />
            <input 
              type="file" 
              className="hidden" 
              accept=".psd,.zip"
              onChange={(e) => e.target.files?.[0] && onImportFile(e.target.files[0])} 
            />
          </label>
          <label className="p-2 hover:bg-white/5 rounded-xl transition-all text-emerald-400 cursor-pointer border border-transparent hover:border-emerald-400/20" title="Bulk Import Folder">
            <FolderInput size={20} />
            <input 
              type="file" 
              className="hidden" 
              // @ts-ignore
              webkitdirectory="" 
              directory="" 
              multiple 
              onChange={(e) => e.target.files && onBulkFolderUpload(e.target.files)} 
            />
          </label>
          <button
            onClick={onAddLayer}
            className="p-2 hover:bg-white/5 rounded-xl transition-all text-indigo-400 border border-transparent hover:border-indigo-400/20"
            title="إضافة طبقة جديدة"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="layers-list">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="space-y-3"
              >
                {layers.sort((a, b) => a.order - b.order).map((layer, index) => (
                  <Draggable key={layer.id} draggableId={layer.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        onClick={() => onSelectLayer(layer.id)}
                        className={`group relative p-4 rounded-2xl cursor-pointer transition-all border duration-300 ${
                          snapshot.isDragging ? 'dragging bg-indigo-600 border-indigo-400 z-50 shadow-2xl' : 
                          selectedLayerId === layer.id
                            ? 'bg-indigo-600/20 border-indigo-500/40 text-white ring-1 ring-indigo-500/20'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-gray-400'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div {...provided.dragHandleProps} className="text-gray-600 group-hover:text-gray-400 p-1">
                              <GripVertical size={16} />
                            </div>
                            
                            {editingId === layer.id ? (
                              <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                                <input
                                  autoFocus
                                  className="bg-[#0f172a] border border-indigo-500 rounded-lg px-2 py-1 text-sm w-full focus:outline-none text-white font-bold"
                                  value={tempName}
                                  onChange={e => setTempName(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && saveRename(layer.id)}
                                  onBlur={() => saveRename(layer.id)}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 truncate flex-1 pr-2">
                                 <span className="font-bold truncate text-sm tracking-tight">{layer.name}</span>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); startEditing(layer); }}
                                   className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity p-1"
                                 >
                                   <Edit2 size={12} />
                                 </button>
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                            title="Delete Component"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-3 pl-8">
                           <div className="flex items-center gap-1.5 bg-[#0f172a]/50 rounded-lg px-2 py-1 border border-white/5 focus-within:border-indigo-500/30 transition-all" onClick={e => e.stopPropagation()}>
                             <Percent size={10} className="text-indigo-400 shrink-0" />
                             <input 
                               type="number" 
                               min="0" 
                               max="100" 
                               value={layer.rarity}
                               onChange={(e) => onUpdateLayerRarity(layer.id, parseInt(e.target.value) || 0)}
                               className="bg-transparent text-[10px] w-8 focus:outline-none text-white font-mono font-bold"
                               title="Part Availability (Chance to appear)"
                             />
                           </div>
                           <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest bg-black/20 px-2 py-1 rounded">
                             {layer.traits.length} parts
                           </div>
                        </div>

                        {layer.rarity < 100 && (
                          <div className="absolute top-2 right-2 flex gap-1">
                             <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
};
