import React, { useState } from 'react';
import { GeneratedCar, Layer } from '../types';
import JSZip from 'jszip';
import { 
  X, Archive, Download, CheckCircle2, AlertCircle, RefreshCw, 
  FileSpreadsheet, FileJson, Layers, Check, Sparkles, FolderDown, ShieldCheck
} from 'lucide-react';

interface DownloadPartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: GeneratedCar[];
  layers: Layer[];
  collectionName: string;
}

export const DownloadPartsModal: React.FC<DownloadPartsModalProps> = ({
  isOpen,
  onClose,
  items,
  layers,
  collectionName
}) => {
  // Default part size: 100 items per part (optimal balance for speed & memory)
  const [partSize, setPartSize] = useState<number>(items.length > 500 ? 250 : 100);
  const [activeDownloadingPart, setActiveDownloadingPart] = useState<number | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const [overallProgress, setOverallProgress] = useState<{ currentPart: number; totalParts: number; percent: number; status: string } | null>(null);
  const [downloadedParts, setDownloadedParts] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const totalItems = items.length;
  const effectivePartSize = Math.max(10, partSize);
  const totalParts = Math.ceil(totalItems / effectivePartSize);

  // Generate CSV for a subset of items
  const generateCSV = (subsetItems: GeneratedCar[]) => {
    const basicTraits = layers.map(l => l.name);
    const headers = ['tokenID', 'name', 'description', 'file_name', 'external_url', ...basicTraits.map(trait => `attributes[${trait}]`)];
    const csvRows = [headers.join(',')];
    subsetItems.forEach(item => {
      const rowData = [item.id.toString(), `"${item.metadata.name}"`, `"${item.metadata.description}"`, `${item.id}.png`, '""'];
      basicTraits.forEach(layerName => {
        const attribute = item.metadata.attributes.find((a: any) => a.trait_type === layerName);
        rowData.push(`"${attribute ? attribute.value : 'None'}"`);
      });
      csvRows.push(rowData.join(','));
    });
    return csvRows.join('\n');
  };

  // Helper to trigger browser file download
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  // Generate and download a specific Part
  const downloadSpecificPart = async (
    partIndex: number, 
    onProgressUpdate?: (percent: number, status: string) => void
  ): Promise<boolean> => {
    const startIndex = partIndex * effectivePartSize;
    const endIndex = Math.min(startIndex + effectivePartSize, totalItems);
    const partItems = items.slice(startIndex, endIndex);

    if (partItems.length === 0) return false;

    setActiveDownloadingPart(partIndex);
    if (onProgressUpdate) {
      onProgressUpdate(10, `تجهيز صور وميتاداتا البارت ${partIndex + 1} (${partItems.length} عنصر)...`);
    }

    try {
      const zip = new JSZip();
      const imgFolder = zip.folder("images");
      const metadataFolder = zip.folder("metadata");
      const partMetadataList: any[] = [];

      for (let i = 0; i < partItems.length; i++) {
        const item = partItems[i];

        if (item.imageBlob) {
          imgFolder?.file(`${item.id}.png`, item.imageBlob);
        } else if (item.image.startsWith('data:')) {
          const base64Data = item.image.split(',')[1];
          imgFolder?.file(`${item.id}.png`, base64Data, { base64: true });
        } else if (item.image.startsWith('blob:')) {
          const blob = await fetch(item.image).then(r => r.blob());
          imgFolder?.file(`${item.id}.png`, blob);
        }

        const cleanMetadata = {
          ...item.metadata,
          dna: item.traits.map(t => `${t.layerId}-${t.traitId}`).join('-'),
          edition: item.id,
          date: Date.now()
        };
        metadataFolder?.file(`${item.id}.json`, JSON.stringify(cleanMetadata, null, 2));
        partMetadataList.push(cleanMetadata);

        if (i % 10 === 0 && onProgressUpdate) {
          const pct = 10 + Math.round((i / partItems.length) * 35);
          onProgressUpdate(pct, `تجهيز الصور (${i + 1}/${partItems.length})...`);
          await new Promise(r => setTimeout(r, 0));
        }
      }

      // Add part CSV and combined json
      zip.file(`metadata_part_${partIndex + 1}.csv`, generateCSV(partItems));
      zip.file(`_metadata_part_${partIndex + 1}.json`, JSON.stringify(partMetadataList, null, 2));

      if (onProgressUpdate) {
        onProgressUpdate(50, `حزم البارت ${partIndex + 1} بسرعة فائقة...`);
      }

      // Zero compression overhead STORE mode prevents CPU freeze
      const content = await zip.generateAsync(
        {
          type: "blob",
          compression: "STORE",
          streamFiles: true
        },
        (meta) => {
          if (onProgressUpdate) {
            const pct = 50 + Math.round(meta.percent * 0.48);
            onProgressUpdate(pct, `ضغط حزمة البارت ${partIndex + 1} (${Math.round(meta.percent)}%)...`);
          }
        }
      );

      const safeName = collectionName.trim().replace(/\s+/g, '_') || 'Collection';
      const filename = `${safeName}_Part_${partIndex + 1}_of_${totalParts}_(Items_${startIndex + 1}-${endIndex}).zip`;

      triggerDownload(content, filename);

      setDownloadedParts(prev => new Set(prev).add(partIndex));
      return true;
    } catch (err) {
      console.error(`Error generating part ${partIndex + 1}:`, err);
      alert(`حدث خطأ أثناء تجهيز البارت ${partIndex + 1}`);
      return false;
    } finally {
      setActiveDownloadingPart(null);
    }
  };

  // Download all parts sequentially with pause between them to ensure browser stability
  const handleDownloadAllParts = async () => {
    if (isDownloadingAll || activeDownloadingPart !== null) return;
    setIsDownloadingAll(true);

    for (let partIndex = 0; partIndex < totalParts; partIndex++) {
      setOverallProgress({
        currentPart: partIndex + 1,
        totalParts,
        percent: Math.round((partIndex / totalParts) * 100),
        status: `بدء تجهيز البارت ${partIndex + 1} من ${totalParts}...`
      });

      await downloadSpecificPart(partIndex, (pct, statusText) => {
        const overallPct = Math.round(((partIndex + (pct / 100)) / totalParts) * 100);
        setOverallProgress({
          currentPart: partIndex + 1,
          totalParts,
          percent: overallPct,
          status: statusText
        });
      });

      // Brief pause between parts to allow GC and browser file saving
      if (partIndex < totalParts - 1) {
        setOverallProgress({
          currentPart: partIndex + 1,
          totalParts,
          percent: Math.round(((partIndex + 1) / totalParts) * 100),
          status: `اكتمل البارت ${partIndex + 1}. انتظار لحظة للبدء في البارت التالي...`
        });
        await new Promise(r => setTimeout(r, 1200));
      }
    }

    setOverallProgress({
      currentPart: totalParts,
      totalParts,
      percent: 100,
      status: 'تم تحميل جميع البارتات بنجاح دون أي تهنيج!'
    });

    setTimeout(() => {
      setIsDownloadingAll(false);
      setOverallProgress(null);
    }, 2500);
  };

  // Download entire metadata package only (CSV + JSON) instantly
  const handleDownloadMetadataOnly = () => {
    const csvContent = generateCSV(items);
    const blobCsv = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const safeName = collectionName.trim().replace(/\s+/g, '_') || 'Collection';
    triggerDownload(blobCsv, `${safeName}_full_metadata.csv`);

    const allMetadata = items.map(item => ({
      ...item.metadata,
      dna: item.traits.map(t => `${t.layerId}-${t.traitId}`).join('-'),
      edition: item.id,
      date: Date.now()
    }));
    const blobJson = new Blob([JSON.stringify(allMetadata, null, 2)], { type: 'application/json' });
    triggerDownload(blobJson, `${safeName}_all_metadata.json`);
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md" 
        onClick={() => {
          if (!isDownloadingAll && activeDownloadingPart === null) {
            onClose();
          }
        }} 
      />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-3xl bg-[#131929] border border-white/10 rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] z-10"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-[#1a2238]/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
              <FolderDown size={24} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                تحميل المجموعة على بارتات (أجزاء مجزأة)
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  {totalItems} عنصر
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                تنزيل مقسم إلى حزم ZIP خفيفة لتجنب تهنيج المتصفح أو استهلاك الذاكرة نهائياً.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            disabled={isDownloadingAll || activeDownloadingPart !== null}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all border border-white/5 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Feature info strip */}
        <div className="p-4 md:px-6 bg-gradient-to-r from-emerald-950/40 via-[#131929] to-indigo-950/30 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-300">
            <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
            <span>
              <b>نظام الحماية من التهنيج:</b> يقسم الملفات لبارتات سريعة، مما يحافظ على سلاسة جهازك ومتصفحك ويوفر تنزيلاً آمناً 100%.
            </span>
          </div>

          <button
            onClick={handleDownloadMetadataOnly}
            className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/30 rounded-lg font-bold flex items-center gap-1.5 transition-all shrink-0 text-xs"
            title="تنزيل ملفات CSV و JSON الكاملة فقط"
          >
            <FileSpreadsheet size={13} />
            تحميل الميتاداتا فقط (CSV + JSON)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          {/* Overall Progress Display (when downloading all) */}
          {overallProgress && (
            <div className="p-5 bg-[#142323] border border-emerald-500/30 rounded-2xl shadow-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                <span className="flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-emerald-400" />
                  {overallProgress.status}
                </span>
                <span className="font-mono text-emerald-400">{overallProgress.percent}%</span>
              </div>

              <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden border border-emerald-500/30">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full transition-all duration-200"
                  style={{ width: `${overallProgress.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>البارت الحالي: {overallProgress.currentPart} من أصل {overallProgress.totalParts}</span>
                <span>يتم حفظ الملفات تلقائياً في مجلد التنزيلات</span>
              </div>
            </div>
          )}

          {/* Configuration: Choose Part Size */}
          <div className="p-4 bg-black/30 rounded-2xl border border-white/5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-black text-white block">حجم كل بارت (عدد العناصر في كل ملف ZIP):</span>
                <span className="text-[11px] text-gray-400">اختر عدد الصور لكل ملف مضغوط لتحديد عدد الأجزاء</span>
              </div>

              <div className="inline-flex rounded-xl p-0.5 bg-black/50 border border-white/10 text-xs">
                {[50, 100, 250, 500].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPartSize(size)}
                    disabled={isDownloadingAll || activeDownloadingPart !== null}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      partSize === size
                        ? 'bg-emerald-500 text-black shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {size} عنصر
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-400/90 pt-1 font-medium">
              <Sparkles size={14} />
              <span>
                سيتم تقسيم الـ <b>{totalItems}</b> عنصر إلى <b>{totalParts}</b> بارت (ملف ZIP) بحجم مناسب جداً لجهازك.
              </span>
            </div>
          </div>

          {/* Quick Actions Strip */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleDownloadAllParts}
              disabled={isDownloadingAll || activeDownloadingPart !== null}
              className="w-full sm:flex-1 py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              {isDownloadingAll ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>جاري تحميل جميع البارتات ({overallProgress?.currentPart}/{totalParts})...</span>
                </>
              ) : (
                <>
                  <Archive size={16} />
                  <span>تحميل جميع البارتات تلقائياً ({totalParts} أجزاء)</span>
                </>
              )}
            </button>

            <button
              onClick={() => downloadSpecificPart(0)}
              disabled={isDownloadingAll || activeDownloadingPart !== null}
              className="w-full sm:w-auto py-3 px-4 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl font-bold text-xs border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Download size={15} />
              <span>تحميل أول جزء فقط (تجربة)</span>
            </button>
          </div>

          {/* Individual Parts List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-gray-400 px-1">
              <span>أو قم بتحميل أي بارت تريده بمفرده:</span>
              <span>{downloadedParts.size} من {totalParts} تم تنزيله</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto custom-scrollbar p-0.5">
              {Array.from({ length: totalParts }).map((_, idx) => {
                const startNum = idx * effectivePartSize + 1;
                const endNum = Math.min((idx + 1) * effectivePartSize, totalItems);
                const count = endNum - startNum + 1;
                const isThisDownloading = activeDownloadingPart === idx;
                const isDownloaded = downloadedParts.has(idx);

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isDownloaded 
                        ? 'bg-emerald-950/20 border-emerald-500/30' 
                        : isThisDownloading
                          ? 'bg-indigo-950/40 border-indigo-500/40 animate-pulse'
                          : 'bg-black/20 border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isDownloaded 
                          ? 'bg-emerald-500/20 text-emerald-300' 
                          : 'bg-white/5 text-gray-300'
                      }`}>
                        {isDownloaded ? <Check size={16} /> : `#${idx + 1}`}
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">
                          بارت {idx + 1}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          العناصر {startNum} - {endNum} ({count} عنصر)
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => downloadSpecificPart(idx)}
                      disabled={isDownloadingAll || activeDownloadingPart !== null}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isDownloaded
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 active:scale-95'
                      }`}
                    >
                      {isThisDownloading ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>جاري...</span>
                        </>
                      ) : isDownloaded ? (
                        <>
                          <Check size={13} />
                          <span>إعادة التنزيل</span>
                        </>
                      ) : (
                        <>
                          <Download size={13} />
                          <span>تنزيل البارت</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-white/10 bg-[#1a2238]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-gray-400 text-center sm:text-right">
            كل بارت يحتوي على مجلد الصور <b>images/</b>، مجلد الميتاداتا <b>metadata/</b>، وملف <b>CSV</b> الخاص به.
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-xs transition-all active:scale-95"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
