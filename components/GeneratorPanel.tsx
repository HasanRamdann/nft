
import React from 'react';
import { Layer, GenerationConfig, LayerRule } from '../types';
import { Play, Settings, Sparkles, RefreshCw, Wand2, Info, Eye, ShieldAlert, SlidersHorizontal, Zap } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface GeneratorPanelProps {
  layers: Layer[];
  config: GenerationConfig;
  totalCombinations: number;
  onConfigChange: (config: Partial<GenerationConfig>) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onRandomizePreview: () => void;
  previewImage: string | null;
  previewBg: 'transparent' | 'dark' | 'light';
  onSetPreviewBg: (bg: 'transparent' | 'dark' | 'light') => void;
  rules?: LayerRule[];
  onOpenRules?: () => void;
}

export const GeneratorPanel: React.FC<GeneratorPanelProps> = ({
  layers,
  config,
  totalCombinations,
  onConfigChange,
  onGenerate,
  isGenerating,
  onRandomizePreview,
  previewImage,
  previewBg,
  onSetPreviewBg,
  rules = [],
  onOpenRules
}) => {
  const [isSuggesting, setIsSuggesting] = React.useState(false);

  const handleSuggestMetadata = async () => {
    const allTraits = layers.flatMap(l => l.traits.map(t => t.name));
    if (allTraits.length === 0) return;
    
    setIsSuggesting(true);
    try {
      const suggestions = await geminiService.suggestThemeMetadata(allTraits);
      if (suggestions.name && suggestions.description) {
        onConfigChange({ 
          collectionName: suggestions.name, 
          description: suggestions.description 
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const bgStyles = {
    transparent: 'bg-[url("https://www.transparenttextures.com/patterns/carbon-fibre.png")] bg-repeat',
    dark: 'bg-[#0f172a]',
    light: 'bg-gray-100'
  };

  return (
    <div className="w-full md:w-80 bg-[#1e293b]/40 backdrop-blur-xl border-l border-white/5 flex flex-col h-full overflow-y-auto">
      <div className="p-6 border-b border-white/5 bg-white/[0.02]">
        <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
          <Settings size={22} className="text-indigo-400" />
          إعدادات الورشة
        </h2>
      </div>

      <div className="p-6 space-y-8">
        <section>
          <div className="flex justify-between items-center mb-3">
             <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-1">
               <Eye size={12}/> معاينة المخطط
             </span>
             <div className="flex gap-1">
                {(['transparent', 'dark', 'light'] as const).map(bg => (
                  <button
                    key={bg}
                    onClick={() => onSetPreviewBg(bg)}
                    className={`w-4 h-4 rounded-full border border-white/10 ${
                      bg === 'transparent' ? 'bg-gray-700' : bg === 'dark' ? 'bg-black' : 'bg-white'
                    } ${previewBg === bg ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#0f172a]' : ''}`}
                    title={`العرض على خلفية ${bg === 'transparent' ? 'شفافة' : bg === 'dark' ? 'داكنة' : 'فاتحة'}`}
                  />
                ))}
             </div>
          </div>
          <div className={`aspect-square rounded-[2rem] overflow-hidden mb-4 relative group border border-white/5 shadow-2xl transition-all duration-500 ${bgStyles[previewBg]}`}>
            {previewImage ? (
              <img src={previewImage} alt="Preview" className="w-full h-full object-contain drop-shadow-2xl" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 p-8 text-center bg-black/20">
                <Sparkles size={48} className="mb-4 opacity-5 animate-pulse" />
                <p className="text-xs font-bold uppercase tracking-widest opacity-30">جاري تجميع المعاينة...</p>
              </div>
            )}
            <button
              onClick={onRandomizePreview}
              className="absolute bottom-4 right-4 p-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl shadow-xl text-white opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
              title="عشوائي"
            >
              <RefreshCw size={20} />
            </button>
          </div>
          
          <div className="bg-[#0f172a]/50 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">مجموع التركيبات</span>
              <span className="text-sm font-mono font-black text-indigo-400">{totalCombinations.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full transition-all" 
                style={{ width: `${Math.min(100, (config.collectionSize / (totalCombinations || 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Layer Rules & Conditions Card */}
          <div className="bg-[#0f172a]/70 border border-white/5 hover:border-indigo-500/30 rounded-2xl p-4 transition-all" dir="rtl">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                  <ShieldAlert size={14} />
                </div>
                <span className="text-xs font-black text-gray-200">شروط وقواعد الطبقات</span>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {rules.filter(r => r.enabled).length} شرط نشط
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
              قواعد التوافق: إلزام لير (✅)، استبعاد لير (❌)، أو دمج واقتران ليرين معاً (🔗) لإتاحة ظهورهما سوياً كاختيار ثالث.
            </p>
            {onOpenRules && (
              <button
                onClick={onOpenRules}
                className="w-full py-2.5 px-3 bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <SlidersHorizontal size={13} />
                إدارة شروط واستثناءات الطبقات
              </button>
            )}
          </div>
        </section>

        <section className="space-y-5">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Fleet Name</label>
              <button 
                onClick={handleSuggestMetadata}
                disabled={isSuggesting}
                className="text-[10px] text-[#c084fc] hover:text-white flex items-center gap-1 font-black uppercase transition-colors"
              >
                <Wand2 size={12} className={isSuggesting ? 'animate-spin' : ''} />
                {isSuggesting ? 'جاري التفكير...' : 'اقتراح ذكاء اصطناعي'}
              </button>
            </div>
            <input
              type="text"
              value={config.collectionName}
              onChange={(e) => onConfigChange({ collectionName: e.target.value })}
              className="w-full bg-[#0f172a]/80 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none transition-all font-bold placeholder:text-gray-700"
              placeholder="مثال: أسطول الفخامة"
            />
          </div>
          
          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">حجم الإنتاج</label>
            <input
              type="number"
              value={config.collectionSize}
              onChange={(e) => onConfigChange({ collectionSize: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#0f172a]/80 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none transition-all font-mono font-bold"
              min="1"
            />
            {config.collectionSize > totalCombinations && (
               <p className="text-[10px] text-amber-500 mt-2 font-bold flex items-center gap-1">
                 <Info size={10}/> محدود بعدد التركيبات المتاحة
               </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-1">
                <Zap size={11} className="text-amber-400" />
                دقة التصدير والتحميل
              </label>
              <span className="text-[10px] text-emerald-400 font-bold">
                {config.outputResolution === 2000 ? '2000×2000 (HD)' : config.outputResolution === 512 ? '512×512' : '1000×1000 (الأسرع)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0f172a] rounded-xl border border-white/5 text-xs font-bold" dir="rtl">
              <button
                type="button"
                onClick={() => onConfigChange({ outputResolution: 1000 })}
                className={`py-2 px-1.5 rounded-lg text-center transition-all ${
                  (config.outputResolution || 1000) === 1000 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                1000px
                <span className="block text-[9px] opacity-75 font-normal">سريع وخفيف</span>
              </button>
              <button
                type="button"
                onClick={() => onConfigChange({ outputResolution: 2000 })}
                className={`py-2 px-1.5 rounded-lg text-center transition-all ${
                  config.outputResolution === 2000 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                2000px
                <span className="block text-[9px] opacity-75 font-normal">فائق الدقة</span>
              </button>
              <button
                type="button"
                onClick={() => onConfigChange({ outputResolution: 512 })}
                className={`py-2 px-1.5 rounded-lg text-center transition-all ${
                  config.outputResolution === 512 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                512px
                <span className="block text-[9px] opacity-75 font-normal">أسرع حجم</span>
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">وصف الأسطول / المواصفات</label>
            <textarea
              value={config.description}
              onChange={(e) => onConfigChange({ description: e.target.value })}
              className="w-full bg-[#0f172a]/80 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none transition-all min-h-[100px] text-gray-300 leading-relaxed text-right"
              placeholder="صف قصة أسطولك أو ميزاته..."
              dir="rtl"
            />
          </div>
        </section>

        <section className="pt-6 border-t border-white/5 space-y-4">
          <button
            onClick={onGenerate}
            disabled={isGenerating || layers.some(l => l.traits.length === 0)}
            className="group relative w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-800 disabled:to-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-lg transition-all shadow-2xl shadow-indigo-500/20 flex items-center justify-center gap-3 overflow-hidden active:scale-95"
          >
            {isGenerating ? (
              <>
                <RefreshCw size={24} className="animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              <>
                <Play size={24} className="group-hover:translate-x-1 transition-transform" />
                بدء الإنتاج
              </>
            )}
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          </button>
          
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 text-center">
            <p className="text-[11px] text-emerald-400 font-bold leading-relaxed" dir="rtl">
              ⚡ يدعم التنزيل على بارتات مجزأة تلقائياً لحماية جهازك ومتصفحك من التهنيج!
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
