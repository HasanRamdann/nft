
import React, { useState } from 'react';
import { GeneratedCar, Layer } from '../types';
import { X, Archive, Car as CarIcon, Info, LayoutGrid, Maximize2, Percent, Check, RefreshCw, FolderDown } from 'lucide-react';

interface CollectionGalleryProps {
  items: GeneratedCar[];
  onClose: () => void;
  onDownload: () => void;
  onOpenPartsDownload?: () => void;
  collectionName: string;
  isDownloading?: boolean;
  downloadProgress?: { percent: number; status: string };
  layers?: Layer[];
}

export const CollectionGallery: React.FC<CollectionGalleryProps> = ({
  items,
  onClose,
  onDownload,
  onOpenPartsDownload,
  collectionName,
  isDownloading = false,
  downloadProgress
}) => {
  const [selectedItem, setSelectedItem] = useState<GeneratedCar | null>(null);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b0f1a] flex flex-col overflow-hidden animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-white/5 bg-[#161b2e]/80 backdrop-blur-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-2xl relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20 border border-white/10">
            <LayoutGrid className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">{collectionName}</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[10px] text-indigo-400/70 font-black uppercase tracking-widest">{items.length} Masterpieces Assembled</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {onOpenPartsDownload && (
            <button 
              onClick={onOpenPartsDownload}
              className="flex-1 md:flex-none px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 border border-emerald-400/30"
              title="تحميل المجموعة مقسمة لبارتات خفيفة لمنع التهنيج"
            >
              <FolderDown size={18} />
              <span>تحميل بارتات (سريع وآمن) 📦</span>
            </button>
          )}

          <button 
            onClick={onDownload}
            disabled={isDownloading}
            className="flex-1 md:flex-none px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:opacity-75 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 active:scale-95 border border-white/10"
          >
            {isDownloading ? (
              <>
                <RefreshCw size={18} className="animate-spin text-indigo-300" />
                <span>جاري الضغط {downloadProgress?.percent ? `(${downloadProgress.percent}%)` : '...'}</span>
              </>
            ) : (
              <>
                <Archive size={18} /> ملف واحد (ZIP)
              </>
            )}
          </button>
          <button 
            onClick={onClose}
            className="p-3.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl transition-all border border-white/5 active:scale-95 group"
          >
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </div>

      {/* Simplified Grid for Performance */}
      <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-[#0b0f1a] custom-scrollbar scroll-smooth">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-8 max-w-[2400px] mx-auto pb-20">
          {items.map((item) => (
            <div 
              key={item.id} 
              onClick={() => setSelectedItem(item)}
              className="group cursor-pointer bg-[#161b2e]/40 hover:bg-[#1e2540] border border-white/5 rounded-[2rem] overflow-hidden transition-all duration-500 hover:border-indigo-500/50 hover:shadow-[0_0_40px_rgba(79,70,229,0.15)] flex flex-col relative"
            >
              <div className="aspect-square p-4 flex items-center justify-center relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent skew-y-12 translate-y-10" />
                
                <img 
                  src={item.image} 
                  alt={item.metadata.name} 
                  className="w-full h-full object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform duration-700 ease-out z-10" 
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                
                <div className="absolute top-4 left-4 z-20">
                   <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[9px] font-black border border-white/10 text-indigo-400 shadow-xl">
                    #{item.id.toString().padStart(3, '0')}
                   </div>
                </div>

                <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-all duration-300 flex items-center justify-center z-20">
                   <div className="bg-white text-black p-3 rounded-full shadow-2xl scale-50 group-hover:scale-100 transition-transform duration-500 delay-100">
                      <Maximize2 size={24} />
                   </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-white/5 flex items-center justify-between gap-3 bg-black/10">
                <span className="font-black text-[11px] text-gray-300 tracking-tight truncate">{item.metadata.name}</span>
                <div className="shrink-0 p-1.5 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500 transition-colors">
                  <Info size={12} className="text-indigo-400 group-hover:text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* High-Resolution Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-10 animate-in fade-in zoom-in-95 duration-300">
          <div 
            className="absolute inset-0 bg-[#050811]/95 backdrop-blur-xl cursor-default" 
            onClick={() => setSelectedItem(null)} 
          />
          
          <div className="relative w-full max-w-6xl aspect-[16/10] bg-[#161b2e] rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row animate-in slide-in-from-bottom-20">
            {/* Image Preview Side */}
            <div className="flex-1 bg-gradient-to-br from-black/40 via-indigo-900/5 to-black/60 p-12 relative flex items-center justify-center overflow-hidden border-r border-white/5">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                
                {/* Visual Effects */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/20 via-transparent to-white/5" />

                <img 
                  src={selectedItem.image} 
                  className="w-full h-full object-contain drop-shadow-[0_45px_100px_rgba(0,0,0,0.8)] relative z-10 transition-transform duration-1000 animate-in zoom-in-75"
                  referrerPolicy="no-referrer"
                />

                <div className="absolute bottom-10 left-10 z-20">
                    <h2 className="text-4xl font-black tracking-tighter text-white mb-2">{selectedItem.metadata.name}</h2>
                    <div className="flex items-center gap-3">
                        <span className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/40">MASTERPIECE EDITION</span>
                        <span className="text-white/30 font-bold text-sm tracking-[0.2em]">VIN#{selectedItem.id.toString().padStart(6, '0')}</span>
                    </div>
                </div>
            </div>

            {/* Sidebar Data */}
            <div className="w-full md:w-[400px] bg-[#0b0f1a]/80 backdrop-blur-md p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8 border-l border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                            <CarIcon size={20} className="text-indigo-400" />
                        </div>
                        <span className="font-black text-sm uppercase tracking-widest text-indigo-400">Specifications</span>
                    </div>
                    <button 
                        onClick={() => setSelectedItem(null)}
                        className="p-3 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white rounded-2xl transition-all border border-white/10 active:scale-90"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    {selectedItem.metadata.attributes.map((attr: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="p-5 bg-black/40 rounded-[1.5rem] border border-white/[0.03] group hover:border-indigo-500/30 transition-all duration-300 hover:translate-x-1"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                         <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">{attr.trait_type}</span>
                           <span className="p-1 px-2.5 bg-indigo-500/10 rounded-md text-[9px] font-black text-indigo-400 border border-indigo-500/20">VERIFIED</span>
                         </div>
                         <div className="flex items-center justify-between gap-4">
                           <span className="text-lg font-black text-gray-100 tracking-tight truncate">{attr.value}</span>
                           <Check size={18} className="text-emerald-500/50 group-hover:text-emerald-400 transition-colors" />
                         </div>
                      </div>
                    ))}
                </div>

                <div className="mt-auto p-6 bg-indigo-600/5 border border-indigo-500/10 rounded-3xl">
                    <div className="flex items-center gap-3 mb-2">
                        <Percent size={14} className="text-indigo-400" />
                        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Rarity Integrity</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                        This unique configuration has been verified against the current production fleet standards.
                    </p>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

