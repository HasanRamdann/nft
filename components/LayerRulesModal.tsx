import React, { useState } from 'react';
import { Layer, LayerRule, RuleAction } from '../types';
import { 
  X, Plus, Trash2, Ban, CheckCircle, Check, AlertCircle, Sparkles, 
  ShieldAlert, CheckCheck, Link2, Sliders, Copy, ClipboardPaste, 
  ClipboardCheck, Download, Upload, RefreshCw, FileText
} from 'lucide-react';

interface LayerRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  layers: Layer[];
  rules: LayerRule[];
  onUpdateRules: (newRules: LayerRule[]) => void;
  onAddLayer?: (name: string) => void;
}

export const LayerRulesModal: React.FC<LayerRulesModalProps> = ({
  isOpen,
  onClose,
  layers,
  rules,
  onUpdateRules,
  onAddLayer
}) => {
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  const [copiedRuleId, setCopiedRuleId] = useState<string | null>(null);
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pastedText, setPastedText] = useState<string>('');
  const [pasteMode, setPasteMode] = useState<'append' | 'replace'>('append');
  const [pasteError, setPasteError] = useState<string | null>(null);

  if (!isOpen) return null;

  const headLayer = layers.find(l => l.name.toLowerCase() === 'head');

  const showNotification = (msg: string) => {
    setCopyNotification(msg);
    setTimeout(() => {
      setCopyNotification(null);
    }, 3000);
  };

  const handleAddRule = (type: RuleAction = 'exclude', sourceId?: string, targetId?: string) => {
    const target = targetId || headLayer?.id || (layers.length > 1 ? layers[1].id : layers[0]?.id || '');
    const source = sourceId || layers.find(l => l.id !== target)?.id || layers[0]?.id || '';

    const newRule: LayerRule = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      sourceLayerId: source,
      sourceTraitId: 'all',
      targetLayerId: target,
      targetTraitId: 'any',
      combineMode: 'always',
      combinePercentage: 100,
      enabled: true
    };

    onUpdateRules([...rules, newRule]);
  };

  const handleToggleRule = (id: string) => {
    onUpdateRules(
      rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    );
  };

  const handleDeleteRule = (id: string) => {
    onUpdateRules(rules.filter(r => r.id !== id));
  };

  const handleUpdateRuleField = (id: string, updates: Partial<LayerRule>) => {
    onUpdateRules(
      rules.map(r => r.id === id ? { ...r, ...updates } : r)
    );
  };

  const handleCreateHeadLayer = () => {
    if (onAddLayer) {
      onAddLayer('Head');
    }
  };

  // Duplicate a rule directly
  const handleDuplicateRule = (ruleToDuplicate: LayerRule) => {
    const newRule: LayerRule = {
      ...ruleToDuplicate,
      id: Math.random().toString(36).substr(2, 9),
      enabled: true
    };
    onUpdateRules([...rules, newRule]);
    setCopiedRuleId(ruleToDuplicate.id);
    showNotification('تم تكرار ونسخ هذا الشرط بنجاح!');
    setTimeout(() => setCopiedRuleId(null), 1500);
  };

  // Copy single rule to clipboard
  const handleCopySingleRule = async (rule: LayerRule) => {
    const sourceLayer = layers.find(l => l.id === rule.sourceLayerId);
    const targetLayer = layers.find(l => l.id === rule.targetLayerId);

    const enrichedRule = {
      ...rule,
      _sourceLayerName: sourceLayer?.name,
      _targetLayerName: targetLayer?.name
    };

    const textToCopy = JSON.stringify(enrichedRule, null, 2);

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        fallbackCopyTextToClipboard(textToCopy);
      }
      setCopiedRuleId(rule.id);
      showNotification('تم نسخ هذا الشرط إلى الحافظة كـ JSON!');
      setTimeout(() => setCopiedRuleId(null), 2000);
    } catch (e) {
      fallbackCopyTextToClipboard(textToCopy);
      showNotification('تم نسخ الشرط إلى الحافظة!');
    }
  };

  // Copy all rules to clipboard
  const handleCopyAllRules = async () => {
    if (rules.length === 0) {
      showNotification('لا توجد شروط لنسخها حالياً!');
      return;
    }

    const enrichedRules = rules.map(rule => {
      const sourceLayer = layers.find(l => l.id === rule.sourceLayerId);
      const targetLayer = layers.find(l => l.id === rule.targetLayerId);
      return {
        ...rule,
        _sourceLayerName: sourceLayer?.name,
        _targetLayerName: targetLayer?.name
      };
    });

    const textToCopy = JSON.stringify(enrichedRules, null, 2);

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        fallbackCopyTextToClipboard(textToCopy);
      }
      showNotification(`تم نسخ جميع الشروط (${rules.length} شرط) إلى الحافظة بنجاح!`);
    } catch (e) {
      fallbackCopyTextToClipboard(textToCopy);
      showNotification(`تم نسخ جميع الشروط (${rules.length} شرط) إلى الحافظة!`);
    }
  };

  // Fallback copy using textarea
  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  // Open Paste Modal and attempt reading clipboard directly
  const handleOpenPasteModal = async () => {
    setPasteError(null);
    setShowPasteModal(true);

    // Try reading clipboard if available
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().startsWith('{') || text.trim().startsWith('[')) {
          setPastedText(text);
        }
      } catch (err) {
        // User permission denied or unsupported in iframe, let user paste manually into textarea
      }
    }
  };

  // Process and apply pasted rules
  const handleApplyPastedRules = () => {
    setPasteError(null);

    if (!pastedText.trim()) {
      setPasteError('يرجى لصق كود الشروط (JSON) أولاً في المربع أدناه.');
      return;
    }

    try {
      const parsed = JSON.parse(pastedText);
      const itemsToProcess = Array.isArray(parsed) ? parsed : [parsed];

      if (itemsToProcess.length === 0) {
        setPasteError('لم يتم العثور على أي شروط صالحة في البيانات الملصوقة.');
        return;
      }

      const validatedRules: LayerRule[] = [];

      itemsToProcess.forEach(item => {
        if (!item || typeof item !== 'object') return;

        // Try to map layers: if ID doesn't exist in current layers, check by layer name
        let sourceId = item.sourceLayerId;
        let targetId = item.targetLayerId;

        const sourceExists = layers.some(l => l.id === sourceId);
        if (!sourceExists && item._sourceLayerName) {
          const matched = layers.find(l => l.name.toLowerCase() === item._sourceLayerName.toLowerCase());
          if (matched) sourceId = matched.id;
        }

        const targetExists = layers.some(l => l.id === targetId);
        if (!targetExists && item._targetLayerName) {
          const matched = layers.find(l => l.name.toLowerCase() === item._targetLayerName.toLowerCase());
          if (matched) targetId = matched.id;
        }

        // Fallback if still not valid
        if (!layers.some(l => l.id === sourceId)) {
          sourceId = layers[0]?.id || '';
        }
        if (!layers.some(l => l.id === targetId)) {
          targetId = layers.find(l => l.id !== sourceId)?.id || layers[0]?.id || '';
        }

        const validRule: LayerRule = {
          id: Math.random().toString(36).substr(2, 9),
          type: item.type === 'require' || item.type === 'combine' ? item.type : 'exclude',
          sourceLayerId: sourceId,
          sourceTraitId: item.sourceTraitId || 'all',
          targetLayerId: targetId,
          targetTraitId: item.targetTraitId || 'any',
          combineMode: item.combineMode === 'percentage' ? 'percentage' : 'always',
          combinePercentage: typeof item.combinePercentage === 'number' ? item.combinePercentage : 100,
          enabled: item.enabled !== false
        };

        validatedRules.push(validRule);
      });

      if (validatedRules.length === 0) {
        setPasteError('البيانات التي قمت بلصقها لا تحتوي على بنية شروط صالحة.');
        return;
      }

      if (pasteMode === 'replace') {
        onUpdateRules(validatedRules);
        showNotification(`تم استبدال الشروط ولصق ${validatedRules.length} شرط بنجاح!`);
      } else {
        onUpdateRules([...rules, ...validatedRules]);
        showNotification(`تمت إضافة ولصق ${validatedRules.length} شرط جديد بنجاح!`);
      }

      setShowPasteModal(false);
      setPastedText('');
    } catch (e: any) {
      setPasteError('صيغة JSON غير صحيحة. يرجى التأكد من نسخ كود الشروط بالكامل وبشكل سليم.');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-4xl bg-[#131929] border border-white/10 rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] z-10"
        dir="rtl"
      >
        {/* Toast / Notification Banner */}
        {copyNotification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-black font-black text-xs px-5 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200 border border-emerald-400">
            <CheckCircle size={16} />
            <span>{copyNotification}</span>
          </div>
        )}

        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-[#1a2238]/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                شروط وتوافق الطبقات (Layer Rules)
                <span className="text-xs bg-indigo-500/20 text-indigo-300 font-bold px-2.5 py-0.5 rounded-full">
                  {rules.filter(r => r.enabled).length} شرط نشط
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                تحديد شروط الإلزام (✅ إجباري)، الاستبعاد (❌ لا يُستخدم)، والدمج والتوافق (🔗 تتيح الاثنين معاً) مع إمكانية النسخ واللصق (Copy & Paste).
              </p>
            </div>
          </div>

          {/* Header Action Buttons (Copy All, Paste, Close) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAllRules}
              disabled={rules.length === 0}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                rules.length === 0
                  ? 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed'
                  : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border-indigo-500/30 hover:border-indigo-500/50 active:scale-95'
              }`}
              title="نسخ جميع الشروط إلى الحافظة (Copy All Rules)"
            >
              <Copy size={15} />
              <span>نسخ الشروط</span>
            </button>

            <button
              onClick={handleOpenPasteModal}
              className="px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 hover:border-purple-500/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
              title="لصق واستيراد الشروط (Paste Rules)"
            >
              <ClipboardPaste size={15} />
              <span>لصق شروط</span>
            </button>

            <button 
              onClick={onClose}
              className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all border border-white/5"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Info Banner & Quick Action */}
        <div className="p-4 md:px-6 bg-gradient-to-r from-indigo-950/40 via-[#131929] to-purple-950/20 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-300">
            <AlertCircle size={16} className="text-amber-400 shrink-0" />
            <span>
              <b>خيارات متقدمة للشروط:</b> إلزام (✅)، استبعاد (❌)، أو <b>دمج الاثنين معاً (🔗)</b>. يمكنك أيضاً <b>نسخ ولصق الشروط (Copy & Paste)</b> سواء لشرط مفرد أو لجميع الشروط معاً!
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!headLayer && (
              <button
                onClick={handleCreateHeadLayer}
                className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 rounded-lg font-bold flex items-center gap-1.5 transition-all"
              >
                <Sparkles size={13} />
                إضافة لير "Head"
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
          {rules.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                <ShieldAlert size={30} />
              </div>
              <h3 className="text-base font-black text-gray-200 mb-1">لا توجد شروط محددة حتى الآن</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
                حدد علاقات وقواعد بين الطبقات: إلزام استخدام لير، أو استبعاد أحدهما، أو دمج ليرين/قطعتين للظهور معاً كاختيار ثالث متوافق. يمكنك أيضاً لصق شروط منسوخة سابقة بنقرة واحدة!
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => handleAddRule('combine')}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2"
                >
                  <Link2 size={16} />
                  إضافة شرط دمج وتوافق (تتيح الاثنين معاً 🔗)
                </button>
                <button
                  onClick={() => handleAddRule('require')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                >
                  <CheckCheck size={16} />
                  إضافة شرط إلزام (إذا استخدم لير 👈 يستخدم لير)
                </button>
                <button
                  onClick={() => handleAddRule('exclude')}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2"
                >
                  <Ban size={16} />
                  إضافة شرط استبعاد (إذا استخدم لير ❌ لا يستخدم لير)
                </button>
                <button
                  onClick={handleOpenPasteModal}
                  className="px-5 py-2.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-xl font-bold text-xs transition-all flex items-center gap-2"
                >
                  <ClipboardPaste size={16} />
                  لصق شروط من الحافظة (Paste Rules)
                </button>
              </div>
            </div>
          ) : (
            rules.map((rule, idx) => {
              const ruleType = rule.type || 'exclude';
              const isRequire = ruleType === 'require';
              const isExclude = ruleType === 'exclude';
              const isCombine = ruleType === 'combine';

              const sourceLayer = layers.find(l => l.id === rule.sourceLayerId);
              const targetLayer = layers.find(l => l.id === rule.targetLayerId);
              const isThisCopied = copiedRuleId === rule.id;

              return (
                <div 
                  key={rule.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    !rule.enabled
                      ? 'bg-[#121624] border-white/5 opacity-60'
                      : isCombine
                        ? 'bg-[#1b142c] border-purple-500/30 shadow-lg shadow-purple-500/5'
                        : isRequire 
                          ? 'bg-[#142323] border-emerald-500/30 shadow-lg shadow-emerald-500/5' 
                          : 'bg-[#22161b] border-rose-500/30 shadow-lg shadow-rose-500/5'
                  }`}
                >
                  {/* Top Bar of Rule Card */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-white/5 text-gray-400 text-xs font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      
                      {/* Rule Type Selector - 3 Choices */}
                      <div className="inline-flex rounded-xl p-0.5 bg-black/40 border border-white/10">
                        {/* 1. Require */}
                        <button
                          type="button"
                          onClick={() => handleUpdateRuleField(rule.id, { type: 'require' })}
                          className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                            isRequire 
                              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20' 
                              : 'text-gray-400 hover:text-emerald-300'
                          }`}
                        >
                          <CheckCheck size={14} />
                          شرط إلزام (يستخدم إجبارياً)
                        </button>

                        {/* 2. Exclude */}
                        <button
                          type="button"
                          onClick={() => handleUpdateRuleField(rule.id, { type: 'exclude' })}
                          className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                            isExclude 
                              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' 
                              : 'text-gray-400 hover:text-rose-300'
                          }`}
                        >
                          <Ban size={14} />
                          شرط استبعاد (لا يستخدم)
                        </button>

                        {/* 3. Combine / Pair - Option 3 */}
                        <button
                          type="button"
                          onClick={() => handleUpdateRuleField(rule.id, { 
                            type: 'combine',
                            combineMode: rule.combineMode || 'always',
                            combinePercentage: rule.combinePercentage ?? 100
                          })}
                          className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                            isCombine 
                              ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20' 
                              : 'text-gray-400 hover:text-purple-300'
                          }`}
                        >
                          <Link2 size={14} />
                          دمج وتوافق (تتيح الاثنين معاً)
                        </button>
                      </div>
                      
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
                          rule.enabled 
                            ? isCombine
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : isRequire
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-gray-700/50 text-gray-400 border border-white/10'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          rule.enabled 
                            ? isCombine ? 'bg-purple-400' : isRequire ? 'bg-emerald-400' : 'bg-rose-400'
                            : 'bg-gray-500'
                        }`} />
                        {rule.enabled ? 'مُفعّل' : 'مُعطّل'}
                      </button>
                    </div>

                    {/* Action buttons: Duplicate / Copy JSON / Delete */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDuplicateRule(rule)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                          isThisCopied
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/10'
                        }`}
                        title="تكرار ونسخ هذا الشرط مباشرة"
                      >
                        {isThisCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span className="text-[11px] hidden sm:inline">نسخ الشرط</span>
                      </button>

                      <button
                        onClick={() => handleCopySingleRule(rule)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-indigo-300 rounded-xl transition-all border border-white/10"
                        title="نسخ كود الشرط إلى الحافظة (Copy as JSON)"
                      >
                        <FileText size={15} />
                      </button>

                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                        title="حذف هذا الشرط"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Conditions Logic Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-4">
                    {/* Source Layer Selection */}
                    <div className="space-y-2 bg-black/30 p-3.5 rounded-xl border border-white/5">
                      <label className="text-[11px] font-black text-indigo-300 block">
                        {isCombine ? 'اللير الأول في الدمج:' : 'إذا استُخدم لير (المشروط):'}
                      </label>
                      <select
                        value={rule.sourceLayerId}
                        onChange={(e) => handleUpdateRuleField(rule.id, { 
                          sourceLayerId: e.target.value,
                          sourceTraitId: 'all' 
                        })}
                        className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-colors"
                      >
                        {layers.map(l => (
                          <option key={l.id} value={l.id} disabled={l.id === rule.targetLayerId}>
                            {l.name} {l.id === rule.targetLayerId ? '(محدد كطرف ثانٍ)' : ''}
                          </option>
                        ))}
                      </select>

                      {/* Optional source trait filter */}
                      {sourceLayer && sourceLayer.traits.length > 0 && (
                        <div className="pt-1">
                          <label className="text-[10px] text-gray-400 block mb-1">
                            {isCombine ? 'قطعة معينة (أو أي قطعة باللير):' : 'تطبيق عند اختيار:'}
                          </label>
                          <select
                            value={rule.sourceTraitId || 'all'}
                            onChange={(e) => handleUpdateRuleField(rule.id, { sourceTraitId: e.target.value })}
                            className="w-full bg-[#0f172a]/60 border border-white/5 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-300 outline-none focus:border-indigo-500"
                          >
                            <option value="all">أي قطعة في اللير ({sourceLayer.traits.length} قطع)</option>
                            {sourceLayer.traits.map(t => (
                              <option key={t.id} value={t.id}>
                                قطعة محددة: {t.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Visual Connection Indicator */}
                    <div className="flex md:flex-col items-center justify-center gap-1 text-center py-2">
                      {isCombine ? (
                        <div className="px-3 py-1.5 bg-purple-500/15 border border-purple-500/40 text-purple-300 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                          <Link2 size={14} className="text-purple-400 animate-pulse" />
                          دمج معاً (سوياً)
                        </div>
                      ) : isRequire ? (
                        <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                          <CheckCheck size={14} />
                          يُستخدم إجبارياً
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                          <Ban size={14} />
                          لا يُستخدم (يُستبعد)
                        </div>
                      )}
                    </div>

                    {/* Target Layer (Required, Excluded, or Combined) */}
                    <div className={`space-y-2 bg-black/30 p-3.5 rounded-xl border ${
                      isCombine 
                        ? 'border-purple-500/20' 
                        : isRequire 
                          ? 'border-emerald-500/20' 
                          : 'border-rose-500/20'
                    }`}>
                      <div className="flex items-center justify-between">
                        <label className={`text-[11px] font-black block ${
                          isCombine 
                            ? 'text-purple-300' 
                            : isRequire 
                              ? 'text-emerald-300' 
                              : 'text-rose-300'
                        }`}>
                          {isCombine 
                            ? 'اللير الثاني المدمج معه:' 
                            : isRequire 
                              ? 'يُستخدم لير (المطلوب إجبارياً):' 
                              : 'لا يُستخدم لير (المستبعد):'}
                        </label>
                        {targetLayer?.name.toLowerCase() === 'head' && (
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md font-black">
                            لير Head
                          </span>
                        )}
                      </div>
                      
                      <select
                        value={rule.targetLayerId}
                        onChange={(e) => handleUpdateRuleField(rule.id, { targetLayerId: e.target.value, targetTraitId: 'any' })}
                        className={`w-full bg-[#0f172a] rounded-lg px-3 py-2 text-xs font-bold text-white outline-none transition-colors border ${
                          isCombine
                            ? 'border-purple-500/30 focus:border-purple-500'
                            : isRequire 
                              ? 'border-emerald-500/30 focus:border-emerald-500' 
                              : 'border-rose-500/30 focus:border-rose-500'
                        }`}
                      >
                        {layers.map(l => (
                          <option key={l.id} value={l.id} disabled={l.id === rule.sourceLayerId}>
                            {l.name} {l.name.toLowerCase() === 'head' ? '⭐ (Head)' : ''}
                          </option>
                        ))}
                      </select>

                      {/* Target trait filter */}
                      {targetLayer && targetLayer.traits.length > 0 && (
                        <div className="pt-1">
                          <label className={`text-[10px] block mb-1 font-medium ${
                            isCombine 
                              ? 'text-purple-400/90' 
                              : isRequire 
                                ? 'text-emerald-400/90' 
                                : 'text-rose-400/90'
                          }`}>
                            {isCombine
                              ? 'قطعة محددة للدمج (أو أي قطعة في اللير):'
                              : isRequire 
                                ? 'تحديد القطعة المطلوبة في اللير:' 
                                : 'استبعاد قطعة معينة (أو اللير بالكامل):'}
                          </label>
                          <select
                            value={rule.targetTraitId || 'any'}
                            onChange={(e) => handleUpdateRuleField(rule.id, { targetTraitId: e.target.value })}
                            className={`w-full bg-[#0f172a]/60 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-200 outline-none border ${
                              isCombine
                                ? 'border-purple-500/20 focus:border-purple-500'
                                : isRequire 
                                  ? 'border-emerald-500/20 focus:border-emerald-500' 
                                  : 'border-rose-500/20 focus:border-rose-500'
                            }`}
                          >
                            <option value="any">
                              {isCombine
                                ? `أي قطعة في لير (${targetLayer.name})`
                                : isRequire 
                                  ? 'أي قطعة في اللير (حسب نسب الظهور)' 
                                  : `كامل اللير (${targetLayer.name}) لن يظهر نهائياً`}
                            </option>
                            {targetLayer.traits.map(t => (
                              <option key={t.id} value={t.id}>
                                {isCombine
                                  ? `قطعة مدمجة محددة: ${t.name}`
                                  : isRequire 
                                    ? `قطعة محددة: ${t.name}` 
                                    : `استبعاد هذه القطعة فقط: ${t.name} (والباقي متاح)`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <p className="text-[10px] text-gray-400 pt-1 leading-relaxed">
                        {isCombine ? (
                          <>
                            تتيح الورشة <span className="font-bold text-purple-300">دمج الاثنين معاً</span> كخيار متوافق سوياً: عند اختيار <span className="font-bold text-white">{sourceLayer?.name || 'اللير الأول'}</span> يتم تضمين <span className="font-bold text-purple-300">{targetLayer?.name || 'اللير الثاني'}</span> كزوج مدمج ومتناسق.
                          </>
                        ) : isRequire ? (
                          <>
                            عند اختيار <span className="font-bold text-white">{sourceLayer?.name || 'اللير'}</span> {rule.sourceTraitId && rule.sourceTraitId !== 'all' ? `(قطعة: ${sourceLayer?.traits.find(t => t.id === rule.sourceTraitId)?.name})` : ''}، سيتم تضمين لير <span className="font-bold text-emerald-300">{targetLayer?.name || 'المحدد'}</span> إجبارياً دائماً.
                          </>
                        ) : rule.targetTraitId && rule.targetTraitId !== 'any' ? (
                          <>
                            عند معالجة واختيار هذه القطعة، <span className="font-bold text-rose-300">تُستبعد فقط القطعة ({targetLayer?.traits.find(t => t.id === rule.targetTraitId)?.name})</span> ويبقى باقي لير <span className="font-bold text-white">{targetLayer?.name}</span> متاحاً للاستخدام الطبيعي.
                          </>
                        ) : (
                          <>
                            عند اختيار هذا الشرط، يتم تعطيل لير <span className="font-bold text-white">{targetLayer?.name || 'المحدد'}</span> بالكامل ولن يظهر.
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Combine Settings Sub-panel (when type === 'combine') */}
                  {isCombine && (
                    <div className="mt-4 pt-3 border-t border-purple-500/20 bg-purple-950/20 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Link2 size={15} className="text-purple-400 shrink-0" />
                        <div>
                          <span className="font-black text-purple-200 block">
                            طريقة إتاحة الدمج معاً:
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {rule.combineMode === 'percentage'
                              ? `ظهور مدمج بنسبة (${rule.combinePercentage ?? 50}%) كخيار ثالث بجانب الظهور الفردي`
                              : 'ظهور مدمج دائم بنسبة 100% (يظهران معاً دائماً ولا يتفرقان)'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="inline-flex rounded-lg p-0.5 bg-black/40 border border-white/10 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleUpdateRuleField(rule.id, { combineMode: 'always', combinePercentage: 100 })}
                            className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                              rule.combineMode !== 'percentage'
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            دائم 100% معاً
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateRuleField(rule.id, { combineMode: 'percentage', combinePercentage: rule.combinePercentage || 50 })}
                            className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                              rule.combineMode === 'percentage'
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            إتاحة كخيار ثالث بنسبة %
                          </button>
                        </div>

                        {rule.combineMode === 'percentage' && (
                          <div className="flex items-center gap-2 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
                            <input
                              type="range"
                              min="10"
                              max="100"
                              step="5"
                              value={rule.combinePercentage ?? 50}
                              onChange={(e) => handleUpdateRuleField(rule.id, { combinePercentage: parseInt(e.target.value) })}
                              className="w-20 accent-purple-500 cursor-pointer h-1.5"
                            />
                            <span className="font-mono font-bold text-purple-300 text-[11px] w-8">
                              {rule.combinePercentage ?? 50}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-white/10 bg-[#1a2238]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* 3 Add Rule Buttons */}
            <button
              onClick={() => handleAddRule('combine')}
              className="px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Link2 size={15} />
              + إضافة دمج وتوافق
            </button>
            <button
              onClick={() => handleAddRule('require')}
              className="px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <CheckCheck size={15} />
              + إضافة إلزام
            </button>
            <button
              onClick={() => handleAddRule('exclude')}
              className="px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Ban size={15} />
              + إضافة استبعاد
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleOpenPasteModal}
              className="px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <ClipboardPaste size={15} />
              لصق شروط
            </button>

            <button
              onClick={onClose}
              className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Check size={16} />
              تأكيد وحفظ الشروط
            </button>
          </div>
        </div>
      </div>

      {/* Paste / Import Rules Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-xl bg-[#131929] border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col space-y-4"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                  <ClipboardPaste size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">لصق واستيراد شروط الطبقات</h3>
                  <p className="text-[11px] text-gray-400">الصق كود الشروط (JSON) المنسوخ من نفس المشروع أو مشروع آخر</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPasteModal(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>

            {/* Paste mode selection */}
            <div className="flex items-center justify-between bg-black/30 p-2.5 rounded-xl border border-white/5">
              <span className="text-xs font-bold text-gray-300">طريقة التطبيق:</span>
              <div className="inline-flex rounded-lg p-0.5 bg-black/40 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setPasteMode('append')}
                  className={`px-3 py-1 rounded-md font-bold transition-all ${
                    pasteMode === 'append'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  إضافة للشروط الحالية (+)
                </button>
                <button
                  type="button"
                  onClick={() => setPasteMode('replace')}
                  className={`px-3 py-1 rounded-md font-bold transition-all ${
                    pasteMode === 'replace'
                      ? 'bg-rose-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  استبدال جميع الشروط (⟳)
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <label className="font-bold text-gray-300">كود الشروط (JSON):</label>
                <button
                  type="button"
                  onClick={async () => {
                    if (navigator.clipboard && navigator.clipboard.readText) {
                      try {
                        const text = await navigator.clipboard.readText();
                        setPastedText(text);
                      } catch (err) {
                        // ignore
                      }
                    }
                  }}
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-bold"
                >
                  <ClipboardPaste size={12} />
                  لصق تلقائي من الحافظة
                </button>
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="الصق كود JSON هنا (مثال: [{ id: '...', type: 'combine', ... }])"
                rows={7}
                className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-3 text-xs font-mono text-gray-200 outline-none focus:border-purple-500 transition-colors custom-scrollbar resize-none"
              />
            </div>

            {/* Error banner */}
            {pasteError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{pasteError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleApplyPastedRules}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black shadow-lg shadow-purple-500/20 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Check size={14} />
                تطبيق ولصق الشروط
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
