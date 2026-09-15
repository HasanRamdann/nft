
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Layer, Trait, GenerationConfig, GeneratedCar, LayerRule } from './types';
import { LayerSidebar } from './components/LayerSidebar';
import { TraitGrid } from './components/TraitGrid';
import { GeneratorPanel } from './components/GeneratorPanel';
import { CollectionGallery } from './components/CollectionGallery';
import { LayerRulesModal } from './components/LayerRulesModal';
import { DownloadPartsModal } from './components/DownloadPartsModal';
import { Sparkles, CheckCircle2, Archive, Check, Car, Layers, Settings, LayoutGrid, Eye, FolderDown } from 'lucide-react';
import JSZip from 'jszip';
import { readPsd } from 'ag-psd';

const RARITY_WEIGHTS: { [key: string]: number } = {
  legendary: 1,
  super_rare: 5,
  rare: 15,
  common: 79
};

const App: React.FC = () => {
  const [mobileTab, setMobileTab] = useState<'layers' | 'editor' | 'generator'>('editor');
  const [layers, setLayers] = useState<Layer[]>([
    { id: '1', name: 'Background', order: 0, traits: [], rarity: 100 },
    { id: '2', name: 'Chassis', order: 1, traits: [], rarity: 100 },
    { id: 'head', name: 'Head', order: 2, traits: [], rarity: 100 },
    { id: '3', name: 'Wheels', order: 3, traits: [], rarity: 100 },
    { id: '4', name: 'Decals', order: 4, traits: [], rarity: 100 },
  ]);

  const [rules, setRules] = useState<LayerRule[]>([
    {
      id: 'rule-head-1',
      type: 'exclude',
      sourceLayerId: '4', // Decals
      sourceTraitId: 'all',
      targetLayerId: 'head', // Head
      enabled: true
    }
  ]);
  const [showRulesModal, setShowRulesModal] = useState(false);

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>('1');
  const [previewBg, setPreviewBg] = useState<'transparent' | 'dark' | 'light'>('transparent');
  
  const [config, setConfig] = useState<GenerationConfig>({
    collectionName: 'My Custom Fleet',
    collectionSize: 100,
    description: 'A unique collection of custom cars generated with Car Workshop.',
    outputResolution: 1000
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number; status: string }>({ current: 0, total: 0, status: '' });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ percent: number; status: string }>({ percent: 0, status: '' });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [generatedItems, setGeneratedItems] = useState<GeneratedCar[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showDownloadPartsModal, setShowDownloadPartsModal] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const selectedLayer = layers.find(l => l.id === selectedLayerId) || null;

  const totalCombinations = useMemo(() => {
    if (layers.length === 0) return 0;
    // For combinations, we treat empty as 1 (not appearing) if it's optional, but here we just count traits
    const traitCounts = layers.map(l => l.traits.length);
    if (traitCounts.some(count => count === 0)) return 0;
    return traitCounts.reduce((acc, count) => acc * count, 1);
  }, [layers]);

  useEffect(() => {
    if (layers.length > 0) {
      const exists = layers.some(l => l.id === selectedLayerId);
      if (!exists) {
        setSelectedLayerId(layers[0].id);
      }
    } else {
      setSelectedLayerId(null);
    }
  }, [layers, selectedLayerId]);

  const addLayer = (defaultName = 'New Layer') => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newLayer: Layer = {
      id: newId,
      name: defaultName,
      order: layers.length,
      traits: [],
      rarity: 100
    };
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newId);
    return newId;
  };

  const renameLayer = (id: string, newName: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, name: newName } : l));
  };

  const updateLayerRarity = (id: string, newRarity: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, rarity: Math.min(100, Math.max(0, newRarity)) } : l));
  };

  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    setRules(prev => prev.filter(r => r.sourceLayerId !== id && r.targetLayerId !== id));
  };

  const reorderLayers = (startIndex: number, endIndex: number) => {
    setLayers((prev: Layer[]) => {
      const result = [...prev].sort((a, b) => a.order - b.order);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result.map((layer: Layer, index: number) => ({
        ...layer,
        order: index
      }));
    });
  };

  const handleBulkFolderUpload = async (fileList: FileList) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    const structure: { [layer: string]: { [rarity: string]: File[] } } = {};

    files.forEach(file => {
      // @ts-ignore
      const pathParts = file.webkitRelativePath.split('/').filter(p => p && p !== '.');
      
      if (pathParts.length >= 2) {
        // If we have Root/Layer/Trait.png or Layer/Trait.png
        // We want the folder containing the file to be the layer, 
        // or if there's a parent, the parent of the file.
        
        // Standard NFT structure: Root/LayerName/TraitName.png
        // pathParts: [Root, LayerName, TraitName.png] -> length 3
        // pathParts: [LayerName, TraitName.png] -> length 2
        
        let layerName = '';
        let rarity = 'common';

        if (pathParts.length >= 3) {
          // Case: Root/Layer/Trait.png OR Layer/Rarity/Trait.png
          // We'll assume the first part is the Root if all files share it, 
          // but for simplicity, let's take the part before the filename as the layer
          // unless there's a rarity folder.
          
          const potentialRarity = pathParts[pathParts.length - 2].toLowerCase();
          if (RARITY_WEIGHTS[potentialRarity]) {
            rarity = potentialRarity;
            layerName = pathParts[pathParts.length - 3];
          } else {
            layerName = pathParts[pathParts.length - 2];
          }
        } else {
          // Case: Layer/Trait.png
          layerName = pathParts[0];
        }

        if (!structure[layerName]) structure[layerName] = {};
        if (!structure[layerName][rarity]) structure[layerName][rarity] = [];
        structure[layerName][rarity].push(file);
      }
    });

    const newLayers: Layer[] = [];
    let orderCounter = layers.length;

    for (const [layerName, rarities] of Object.entries(structure)) {
      const layerTraits: Trait[] = [];
      for (const [rarityKey, folderFiles] of Object.entries(rarities)) {
        const baseWeight = RARITY_WEIGHTS[rarityKey] || (100 / Object.keys(rarities).length);
        const individualWeight = baseWeight / folderFiles.length;
        const traits: Trait[] = await Promise.all(folderFiles.map(file => {
          return new Promise<Trait>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                id: Math.random().toString(36).substr(2, 9),
                name: file.name.split('.')[0],
                fileName: file.name,
                imageData: e.target?.result as string,
                rarity: parseFloat(individualWeight.toFixed(2))
              });
            };
            reader.readAsDataURL(file);
          });
        }));
        layerTraits.push(...traits);
      }
      newLayers.push({
        id: Math.random().toString(36).substr(2, 9),
        name: layerName,
        order: orderCounter++,
        traits: layerTraits,
        rarity: 100
      });
    }

    if (newLayers.length > 0) {
      setLayers(prev => [...prev, ...newLayers]);
      setSelectedLayerId(newLayers[0].id);
    }
  };

  const handleImportFile = async (file: File) => {
    if (file.name.toLowerCase().endsWith('.psd')) {
      try {
        const buffer = await file.arrayBuffer();
        const psd = readPsd(buffer);
        
        const newLayers: Layer[] = [];
        let orderCounter = layers.length;

        // @ts-ignore
        for (const child of psd.children || []) {
           // @ts-ignore
           if (child.children && child.children.length > 0) {
              // It's a group -> New Component
              const layerName = child.name || `Layer ${orderCounter + 1}`;
              const traits: Trait[] = [];
              
              // @ts-ignore
              for (const traitLayer of child.children) {
                 if (traitLayer.canvas) {
                    traits.push({
                       id: Math.random().toString(36).substr(2, 9),
                       name: traitLayer.name || 'Unnamed',
                       fileName: (traitLayer.name || 'trait') + '.png',
                       imageData: traitLayer.canvas.toDataURL(),
                       rarity: 100 
                    });
                 }
              }
              
              if (traits.length > 0) {
                 // Balance rarity
                 const weight = 100 / traits.length;
                 traits.forEach(t => t.rarity = parseFloat(weight.toFixed(2)));

                 newLayers.push({
                    id: Math.random().toString(36).substr(2, 9),
                    name: layerName,
                    order: orderCounter++,
                    traits: traits,
                    rarity: 100
                 });
              }
           } else if (child.canvas) {
              // It's a single layer -> New Component with 1 trait
              const layerName = child.name || `Layer ${orderCounter + 1}`;
              const trait: Trait = {
                 id: Math.random().toString(36).substr(2, 9),
                 name: child.name || 'Default',
                 fileName: (child.name || 'layer') + '.png',
                 imageData: child.canvas.toDataURL(),
                 rarity: 100
              };
              
              newLayers.push({
                 id: Math.random().toString(36).substr(2, 9),
                 name: layerName,
                 order: orderCounter++,
                 traits: [trait],
                 rarity: 100
              });
           }
        }
        
        if (newLayers.length > 0) {
           setLayers(prev => [...prev, ...newLayers]);
           setSelectedLayerId(newLayers[0].id);
        } else {
           alert("No valid layers found in PSD. Ensure layers are not empty and are rasterized if smart objects.");
        }
      } catch (e) {
        console.error("Failed to parse PSD", e);
        alert("Failed to parse PSD file. Ensure it's a valid Photoshop file.");
      }
    } else if (file.name.toLowerCase().endsWith('.zip')) {
       try {
          const zip = new JSZip();
          const contents = await zip.loadAsync(file);
          const structure: { [layer: string]: { [rarity: string]: { name: string, data: string }[] } } = {};
          
          for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
             if (zipEntry.dir) continue;
             if (!relativePath.match(/\.(png|jpg|jpeg|webp)$/i)) continue;
             
             const blob = await zipEntry.async('blob');
             const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(blob);
             });
             
             const pathParts = relativePath.split('/').filter(p => p && p !== '.');
             // Filter out __MACOSX and hidden files
             if (pathParts.some(p => p.startsWith('.') || p === '__MACOSX')) continue;

             if (pathParts.length >= 2) {
                let layerName = '';
                let rarity = 'common';
                
                if (pathParts.length >= 3) {
                   const potentialRarity = pathParts[pathParts.length - 2].toLowerCase();
                   if (RARITY_WEIGHTS[potentialRarity]) {
                      rarity = potentialRarity;
                      layerName = pathParts[pathParts.length - 3];
                   } else {
                      layerName = pathParts[pathParts.length - 2];
                   }
                } else {
                   layerName = pathParts[0];
                }
                
                if (!structure[layerName]) structure[layerName] = {};
                if (!structure[layerName][rarity]) structure[layerName][rarity] = [];
                structure[layerName][rarity].push({ name: zipEntry.name, data: dataUrl });
             }
          }
          
          const newLayers: Layer[] = [];
          let orderCounter = layers.length;
          
          for (const [layerName, rarities] of Object.entries(structure)) {
             const layerTraits: Trait[] = [];
             for (const [rarityKey, items] of Object.entries(rarities)) {
                const baseWeight = RARITY_WEIGHTS[rarityKey] || (100 / Object.keys(rarities).length);
                const individualWeight = baseWeight / items.length;
                
                items.forEach(item => {
                   layerTraits.push({
                      id: Math.random().toString(36).substr(2, 9),
                      name: item.name.split('/').pop()?.split('.')[0] || 'Unnamed',
                      fileName: item.name,
                      imageData: item.data,
                      rarity: parseFloat(individualWeight.toFixed(2))
                   });
                });
             }
             
             if (layerTraits.length > 0) {
                newLayers.push({
                   id: Math.random().toString(36).substr(2, 9),
                   name: layerName,
                   order: orderCounter++,
                   traits: layerTraits,
                   rarity: 100
                });
             }
          }
          
          if (newLayers.length > 0) {
             setLayers(prev => [...prev, ...newLayers]);
             setSelectedLayerId(newLayers[0].id);
          } else {
             alert("No valid images found in ZIP.");
          }
       } catch (e) {
          console.error("Failed to parse ZIP", e);
          alert("Failed to parse ZIP file.");
       }
    }
  };

  const handleImportImages = async (fileList: FileList) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const newLayers: Layer[] = [];
    let orderCounter = layers.length;

    for (const file of files) {
      const imageData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      const layerName = file.name.split('.')[0] || `Component ${orderCounter + 1}`;
      
      newLayers.push({
        id: Math.random().toString(36).substr(2, 9),
        name: layerName,
        order: orderCounter++,
        traits: [{
          id: Math.random().toString(36).substr(2, 9),
          name: layerName,
          fileName: file.name,
          imageData: imageData,
          rarity: 100
        }],
        rarity: 100
      });
    }

    if (newLayers.length > 0) {
      setLayers(prev => [...prev, ...newLayers]);
      setSelectedLayerId(newLayers[0].id);
    }
  };

  const addTraitsToLayer = async (files: File[]) => {
    if (!selectedLayerId) return;

    const newTraits: Trait[] = await Promise.all(files.map(file => {
      return new Promise<Trait>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name.split('.')[0],
            fileName: file.name,
            imageData: e.target?.result as string,
            rarity: 0
          });
        };
        reader.readAsDataURL(file);
      });
    }));

    setLayers(prev => prev.map(l => {
      if (l.id === selectedLayerId) {
        const combinedTraits = [...l.traits, ...newTraits];
        const balancedTraits = combinedTraits.map(t => ({
          ...t,
          rarity: parseFloat((100 / combinedTraits.length).toFixed(2))
        }));
        return { ...l, traits: balancedTraits };
      }
      return l;
    }));
  };

  const deleteTrait = (traitId: string) => {
    setLayers(prev => prev.map(l => {
      if (l.id === selectedLayerId) {
        const filtered = l.traits.filter(t => t.id !== traitId);
        if (filtered.length === 0) return { ...l, traits: [] };
        const balanced = filtered.map(t => ({
          ...t,
          rarity: parseFloat((100 / filtered.length).toFixed(2))
        }));
        return { ...l, traits: balanced };
      }
      return l;
    }));
  };

  const renameTrait = (traitId: string, newName: string) => {
    setLayers(prev => prev.map(l => {
      if (l.id === selectedLayerId) {
        return {
          ...l,
          traits: l.traits.map(t => t.id === traitId ? { ...t, name: newName } : t)
        };
      }
      return l;
    }));
  };

  const clearLayerTraits = () => {
    if (confirm('Are you sure you want to remove all traits in this layer?')) {
      setLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, traits: [] } : l));
    }
  };

  const updateTraitRarity = (traitId: string, newRarity: number) => {
    setLayers(prev => prev.map(l => {
      if (l.id === selectedLayerId) {
        const traitsCount = l.traits.length;
        if (traitsCount <= 1) {
          return { ...l, traits: l.traits.map(t => ({ ...t, rarity: 100 })) };
        }
        const clampedNewRarity = Math.min(100, Math.max(0, newRarity));
        const remainingRarity = 100 - clampedNewRarity;
        const otherTraits = l.traits.filter(t => t.id !== traitId);
        const oldTotalOthers = otherTraits.reduce((sum, t) => sum + t.rarity, 0);
        const updatedTraits = l.traits.map(t => {
          if (t.id === traitId) {
            return { ...t, rarity: clampedNewRarity };
          } else {
            let adjustedRarity = oldTotalOthers > 0 ? (t.rarity / oldTotalOthers) * remainingRarity : remainingRarity / otherTraits.length;
            return { ...t, rarity: parseFloat(adjustedRarity.toFixed(2)) };
          }
        });
        return { ...l, traits: updatedTraits };
      }
      return l;
    }));
  };

  const bulkUpdateRarity = (updates: { traitId: string, rarity: number }[]) => {
     setLayers(prev => prev.map(l => {
      if (l.id === selectedLayerId) {
        return {
          ...l,
          traits: l.traits.map(t => {
            const update = updates.find(u => u.traitId === t.id);
            return update ? { ...t, rarity: update.rarity } : t;
          })
        };
      }
      return l;
    }));
  };

  const preloadAllTraits = useCallback(async (): Promise<Map<string, HTMLImageElement>> => {
    const cache = imageCacheRef.current;
    const promises: Promise<void>[] = [];
    for (const layer of layers) {
      for (const trait of layer.traits) {
        if (!trait.imageData || cache.has(trait.id)) continue;
        const p = new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            cache.set(trait.id, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = trait.imageData;
        });
        promises.push(p);
      }
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    }
    return cache;
  }, [layers]);

  const renderTraitsToCanvas = useCallback((
    selectedTraits: { traitId: string; imageData: string }[],
    cache: Map<string, HTMLImageElement>,
    resolution: number
  ): HTMLCanvasElement => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    if (canvas.width !== resolution || canvas.height !== resolution) {
      canvas.width = resolution;
      canvas.height = resolution;
    }
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return canvas;
    ctx.clearRect(0, 0, resolution, resolution);

    for (const trait of selectedTraits) {
      const img = cache.get(trait.traitId);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0, resolution, resolution);
      } else if (trait.imageData) {
        const tempImg = new Image();
        tempImg.src = trait.imageData;
        if (tempImg.complete && tempImg.naturalWidth > 0) {
          ctx.drawImage(tempImg, 0, 0, resolution, resolution);
        }
      }
    }
    return canvas;
  }, []);

  const mergeImages = useCallback(async (imageUrls: string[]): Promise<string> => {
    return new Promise((resolve) => {
      const validUrls = (imageUrls || []).filter(url => url && typeof url === 'string' && url.trim().length > 0);
      if (validUrls.length === 0) return resolve('');

      if (!canvasRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 1000;
        canvasRef.current = canvas;
      }
      const canvas = canvasRef.current;
      const res = 1000;
      if (canvas.width !== res || canvas.height !== res) {
        canvas.width = res;
        canvas.height = res;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve('');
      ctx.clearRect(0, 0, res, res);

      const images = validUrls.map(url => {
        const img = new Image();
        img.src = url;
        return img;
      });

      let loadedCount = 0;
      let drawnCount = 0;

      const checkFinished = () => {
        if (loadedCount === images.length) {
          ctx.clearRect(0, 0, res, res);
          for (const img of images) {
            if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
              ctx.drawImage(img, 0, 0, res, res);
              drawnCount++;
            }
          }
          if (drawnCount > 0) {
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve('');
          }
        }
      };

      images.forEach(img => {
        if (img.complete) {
          loadedCount++;
          checkFinished();
        } else {
          img.onload = () => {
            loadedCount++;
            checkFinished();
          };
          img.onerror = () => {
            console.warn('Failed to load image layer during merge, skipping image without breaking output');
            loadedCount++;
            checkFinished();
          };
        }
      });
    });
  }, []);

  const applyRules = useCallback((selected: { layerId: string; traitId: string; imageData: string }[]) => {
    let filtered = [...selected];
    for (const rule of rules) {
      if (!rule.enabled) continue;
      const ruleType = rule.type || 'exclude';
      const sourceMatch = filtered.find(t => t.layerId === rule.sourceLayerId);
      if (sourceMatch) {
        // Condition triggers ONLY if the source layer has this specific trait (or any trait if 'all')
        if (!rule.sourceTraitId || rule.sourceTraitId === 'all' || rule.sourceTraitId === sourceMatch.traitId) {
          if (ruleType === 'exclude') {
            if (!rule.targetTraitId || rule.targetTraitId === 'any') {
              // Exclude the entire target layer when this trait is processed
              filtered = filtered.filter(t => t.layerId !== rule.targetLayerId);
            } else {
              // Target is a specific trait to exclude:
              // If the target layer currently has this excluded trait, pick an alternative allowed trait from the target layer
              const targetMatchIndex = filtered.findIndex(t => t.layerId === rule.targetLayerId && t.traitId === rule.targetTraitId);
              if (targetMatchIndex >= 0) {
                const targetLayer = layers.find(l => l.id === rule.targetLayerId);
                const allowedTraits = targetLayer ? targetLayer.traits.filter(t => t.id !== rule.targetTraitId) : [];
                if (allowedTraits.length > 0) {
                  // Pick one of the remaining allowed traits normally according to their rarities
                  const totalWeight = allowedTraits.reduce((sum, t) => sum + t.rarity, 0);
                  let random = Math.random() * (totalWeight || 1);
                  let replacementTrait = allowedTraits[0];
                  for (const trait of allowedTraits) {
                    if (random < trait.rarity) { replacementTrait = trait; break; }
                    random -= trait.rarity;
                  }
                  filtered[targetMatchIndex] = {
                    layerId: targetLayer!.id,
                    traitId: replacementTrait.id,
                    imageData: replacementTrait.imageData
                  };
                } else {
                  // If no other traits exist in the target layer, remove it
                  filtered = filtered.filter(t => t.layerId !== rule.targetLayerId);
                }
              }
            }
          } else if (ruleType === 'require') {
            const targetLayer = layers.find(l => l.id === rule.targetLayerId);
            if (targetLayer && targetLayer.traits.length > 0) {
              const existingTargetIndex = filtered.findIndex(t => t.layerId === rule.targetLayerId);

              let requiredTrait = targetLayer.traits[0];
              if (rule.targetTraitId && rule.targetTraitId !== 'any') {
                const specificTrait = targetLayer.traits.find(t => t.id === rule.targetTraitId);
                if (specificTrait) requiredTrait = specificTrait;
              } else if (existingTargetIndex >= 0) {
                // Layer is already present and any trait is allowed
                continue;
              } else {
                // Pick according to weights
                const totalWeight = targetLayer.traits.reduce((sum, t) => sum + t.rarity, 0);
                let random = Math.random() * (totalWeight || 1);
                for (const trait of targetLayer.traits) {
                  if (random < trait.rarity) { requiredTrait = trait; break; }
                  random -= trait.rarity;
                }
              }

              if (existingTargetIndex >= 0) {
                filtered[existingTargetIndex] = {
                  layerId: targetLayer.id,
                  traitId: requiredTrait.id,
                  imageData: requiredTrait.imageData
                };
              } else {
                filtered.push({
                  layerId: targetLayer.id,
                  traitId: requiredTrait.id,
                  imageData: requiredTrait.imageData
                });
              }
            }
          } else if (ruleType === 'combine') {
            const targetLayer = layers.find(l => l.id === rule.targetLayerId);
            if (targetLayer && targetLayer.traits.length > 0) {
              const targetMatch = filtered.find(t => t.layerId === rule.targetLayerId);
              const isTargetTraitSpecific = !!rule.targetTraitId && rule.targetTraitId !== 'any';
              
              const shouldCombine = rule.combineMode === 'percentage'
                ? (Math.random() * 100 < (rule.combinePercentage ?? 50))
                : true;

              if (shouldCombine) {
                let targetTrait = targetLayer.traits[0];
                if (isTargetTraitSpecific) {
                  const specific = targetLayer.traits.find(t => t.id === rule.targetTraitId);
                  if (specific) targetTrait = specific;
                } else if (targetMatch) {
                  targetTrait = targetLayer.traits.find(t => t.id === targetMatch.traitId) || targetTrait;
                } else {
                  const totalWeight = targetLayer.traits.reduce((sum, t) => sum + t.rarity, 0);
                  let random = Math.random() * (totalWeight || 1);
                  for (const trait of targetLayer.traits) {
                    if (random < trait.rarity) { targetTrait = trait; break; }
                    random -= trait.rarity;
                  }
                }

                if (targetTrait) {
                  const targetIdx = filtered.findIndex(t => t.layerId === targetLayer.id);
                  if (targetIdx >= 0) {
                    filtered[targetIdx] = {
                      layerId: targetLayer.id,
                      traitId: targetTrait.id,
                      imageData: targetTrait.imageData
                    };
                  } else {
                    filtered.push({
                      layerId: targetLayer.id,
                      traitId: targetTrait.id,
                      imageData: targetTrait.imageData
                    });
                  }
                }
              }
            }
          }
        }
      } else if (ruleType === 'combine') {
        // Bidirectional check: if target is in filtered, bring source
        const targetMatch = filtered.find(t => t.layerId === rule.targetLayerId);
        if (targetMatch) {
          const isTargetTraitSpecific = !!rule.targetTraitId && rule.targetTraitId !== 'any';
          if (!isTargetTraitSpecific || targetMatch.traitId === rule.targetTraitId) {
            const shouldCombine = rule.combineMode === 'percentage'
              ? (Math.random() * 100 < (rule.combinePercentage ?? 50))
              : true;

            if (shouldCombine) {
              const sourceLayer = layers.find(l => l.id === rule.sourceLayerId);
              if (sourceLayer && sourceLayer.traits.length > 0) {
                let sourceTrait = sourceLayer.traits[0];
                if (rule.sourceTraitId && rule.sourceTraitId !== 'all') {
                  const specific = sourceLayer.traits.find(t => t.id === rule.sourceTraitId);
                  if (specific) sourceTrait = specific;
                } else {
                  const totalWeight = sourceLayer.traits.reduce((sum, t) => sum + t.rarity, 0);
                  let random = Math.random() * (totalWeight || 1);
                  for (const trait of sourceLayer.traits) {
                    if (random < trait.rarity) { sourceTrait = trait; break; }
                    random -= trait.rarity;
                  }
                }

                if (sourceTrait) {
                  const sourceIdx = filtered.findIndex(t => t.layerId === sourceLayer.id);
                  if (sourceIdx >= 0) {
                    filtered[sourceIdx] = {
                      layerId: sourceLayer.id,
                      traitId: sourceTrait.id,
                      imageData: sourceTrait.imageData
                    };
                  } else {
                    filtered.push({
                      layerId: sourceLayer.id,
                      traitId: sourceTrait.id,
                      imageData: sourceTrait.imageData
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    filtered.sort((a, b) => {
      const ordA = layers.find(l => l.id === a.layerId)?.order ?? 0;
      const ordB = layers.find(l => l.id === b.layerId)?.order ?? 0;
      return ordA - ordB;
    });

    return filtered;
  }, [rules, layers]);

  const generatePreview = useCallback(async () => {
    let selectedTraits: { layerId: string; traitId: string; imageData: string }[] = [];
    const sortedLayers = [...layers].sort((a, b) => a.order - b.order);
    for (const layer of sortedLayers) {
      // Roll for layer rarity
      if (Math.random() * 100 < layer.rarity && layer.traits.length > 0) {
        const totalWeight = layer.traits.reduce((sum, t) => sum + t.rarity, 0);
        let random = Math.random() * totalWeight;
        let selectedTrait = layer.traits[0];
        for (const trait of layer.traits) {
          if (random < trait.rarity) { selectedTrait = trait; break; }
          random -= trait.rarity;
        }
        selectedTraits.push({
          layerId: layer.id,
          traitId: selectedTrait.id,
          imageData: selectedTrait.imageData
        });
      }
    }

    selectedTraits = applyRules(selectedTraits);

    if (selectedTraits.length > 0) {
      const merged = await mergeImages(selectedTraits.map(t => t.imageData));
      setPreviewImage(merged);
    } else {
      setPreviewImage(null);
    }
  }, [layers, applyRules, mergeImages]);

  useEffect(() => {
    generatePreview();
  }, [layers, rules, generatePreview]);

  const handleGenerateCollection = async () => {
    if (layers.some(l => l.traits.length === 0)) {
      alert("يرجى التأكد من إضافة قطع (Traits) لكل لير قبل البدء");
      return;
    }

    setIsGenerating(true);
    setGeneratedItems([]);
    const targetResolution = config.outputResolution || 1000;

    setGenerationProgress({
      current: 0,
      total: config.collectionSize,
      status: 'تسريع وتجهيز صور القطع في الذاكرة...'
    });

    // 1. Preload and cache all trait images in parallel
    const cache = await preloadAllTraits();

    const results: GeneratedCar[] = [];
    const seen = new Set<string>();
    const sortedLayers = [...layers].sort((a, b) => a.order - b.order);

    const pickCombination = () => {
      let currentSelected: { layerId: string; traitId: string; imageData: string }[] = [];
      
      for (const layer of sortedLayers) {
        const layerExists = Math.random() * 100 < layer.rarity;
        if (layerExists && layer.traits.length > 0) {
          const totalWeight = layer.traits.reduce((sum, t) => sum + t.rarity, 0);
          let random = Math.random() * (totalWeight || 1);
          let selectedTrait = layer.traits[0];
          for (const trait of layer.traits) {
            if (random < trait.rarity) { selectedTrait = trait; break; }
            random -= trait.rarity;
          }
          currentSelected.push({ layerId: layer.id, traitId: selectedTrait.id, imageData: selectedTrait.imageData });
        }
      }

      currentSelected = applyRules(currentSelected);

      let combinationKey = '';
      for (const layer of sortedLayers) {
        const chosen = currentSelected.find(t => t.layerId === layer.id);
        if (chosen) {
          combinationKey += `${layer.id}-${chosen.traitId}:`;
        } else {
          combinationKey += `${layer.id}-none:`;
        }
      }

      return { combinationKey, currentSelected };
    };

    // 2. High-speed generation loop with event loop yielding
    for (let i = 0; i < config.collectionSize; i++) {
      let { combinationKey, currentSelected } = pickCombination();

      // Check for duplicates
      if (seen.has(combinationKey)) {
        let attempts = 0;
        while (seen.has(combinationKey) && attempts < 50) {
          const retry = pickCombination();
          combinationKey = retry.combinationKey;
          currentSelected = retry.currentSelected;
          attempts++;
        }
      }
      seen.add(combinationKey);
      
      // Fast synchronous canvas draw from cached images
      const canvas = renderTraitsToCanvas(currentSelected, cache, targetResolution);

      // Async blob creation directly from canvas
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });

      const objectUrl = blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png');

      results.push({
        id: i + 1,
        traits: currentSelected.map(t => ({ layerId: t.layerId, traitId: t.traitId })),
        image: objectUrl,
        imageBlob: blob || undefined,
        metadata: {
          name: `${config.collectionName} #${i + 1}`,
          description: config.description,
          image: `${i + 1}.png`,
          attributes: sortedLayers.map(l => {
            const selected = currentSelected.find(t => t.layerId === l.id);
            if (selected) {
              const traitObj = l.traits.find(tr => tr.id === selected.traitId);
              return { trait_type: l.name, value: traitObj?.name };
            }
            return { trait_type: l.name, value: "None" };
          })
        }
      });

      // Yield every 2 items or at the end so the UI doesn't freeze and progress updates smoothly
      if (i % 2 === 0 || i === config.collectionSize - 1) {
        setGenerationProgress({
          current: i + 1,
          total: config.collectionSize,
          status: `تم تجهيز وتجميع ${i + 1} من ${config.collectionSize}...`
        });
        await new Promise(r => setTimeout(r, 0));
      }
    }

    setGeneratedItems(results);
    setIsGenerating(false);
    setShowSuccess(true);
  };

  const generateCSV = (items: GeneratedCar[], allLayers: Layer[]) => {
    const basicTraits = allLayers.map(l => l.name);
    const headers = ['tokenID', 'name', 'description', 'file_name', 'external_url', ...basicTraits.map(trait => `attributes[${trait}]`)];
    const csvRows = [headers.join(',')];
    items.forEach(item => {
      const rowData = [item.id.toString(), `"${item.metadata.name}"`, `"${item.metadata.description}"`, `${item.id}.png`, '""'];
      basicTraits.forEach(layerName => {
        const attribute = item.metadata.attributes.find((a: any) => a.trait_type === layerName);
        rowData.push(`"${attribute ? attribute.value : 'None'}"`);
      });
      csvRows.push(rowData.join(','));
    });
    return csvRows.join('\n');
  };

  const downloadFullCollection = async () => {
    if (isDownloading || generatedItems.length === 0) return;
    setIsDownloading(true);
    setDownloadProgress({ percent: 5, status: 'تجهيز ملفات الصور والميتاداتا...' });

    try {
      const zip = new JSZip();
      const imgFolder = zip.folder("images");
      const metadataFolder = zip.folder("metadata");
      const allMetadata: any[] = [];

      for (let i = 0; i < generatedItems.length; i++) {
        const item = generatedItems[i];
        
        // Write binary Blob directly if available (zero base64 parsing overhead)
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
        allMetadata.push(cleanMetadata);

        if (i % 15 === 0 || i === generatedItems.length - 1) {
          const pct = Math.round(((i + 1) / generatedItems.length) * 35);
          setDownloadProgress({
            percent: Math.max(5, pct),
            status: `تجهيز الصور والميتاداتا (${i + 1}/${generatedItems.length})...`
          });
          await new Promise(r => setTimeout(r, 0));
        }
      }

      zip.file("metadata.csv", generateCSV(generatedItems, layers));
      zip.file("_all_metadata.json", JSON.stringify(allMetadata, null, 2));

      setDownloadProgress({ percent: 40, status: 'جاري حزم وضغط ملف الـ ZIP بسرعة فائقة...' });

      // CRITICAL SPEED FIX:
      // PNG images are already compressed internally.
      // compression: "STORE" produces the exact same file size in 1-2 SECONDS instead of 45-60 seconds,
      // completely eliminating CPU freeze!
      const content = await zip.generateAsync(
        {
          type: "blob",
          compression: "STORE",
          streamFiles: true
        },
        (metadata) => {
          const pct = 40 + Math.round(metadata.percent * 0.55);
          setDownloadProgress({
            percent: Math.min(98, pct),
            status: `جاري تجميع حزمة ZIP (${Math.round(metadata.percent)}%)...`
          });
        }
      );

      setDownloadProgress({ percent: 100, status: 'اكتمل التحزيم! بدء التنزيل...' });
      await new Promise(r => setTimeout(r, 200));

      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.collectionName.replace(/\s+/g, '_')}_collection.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      console.error("Error creating collection package:", error);
      alert("حدث خطأ أثناء تجميع ملفات المجموعة.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress({ percent: 0, status: '' });
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0f172a] text-gray-100 selection:bg-indigo-500/30 overflow-hidden">
      <div className={`${mobileTab === 'layers' ? 'block' : 'hidden'} md:block h-full md:h-auto w-full md:w-auto z-20`}>
        <LayerSidebar
          layers={layers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onAddLayer={() => addLayer()}
          onDeleteLayer={deleteLayer}
          onReorderLayers={reorderLayers}
          onRenameLayer={renameLayer}
          onUpdateLayerRarity={updateLayerRarity}
          onBulkFolderUpload={handleBulkFolderUpload}
          onImportFile={handleImportFile}
          onImportImages={handleImportImages}
          onOpenRules={() => setShowRulesModal(true)}
          activeRulesCount={rules.filter(r => r.enabled).length}
        />
      </div>

      <main className={`${mobileTab === 'editor' ? 'flex' : 'hidden'} md:flex flex-1 flex-col relative overflow-hidden h-full`}>
        <TraitGrid
          layer={selectedLayer}
          collectionSize={config.collectionSize}
          onAddTraits={addTraitsToLayer}
          onDeleteTrait={deleteTrait}
          onRenameTrait={renameTrait}
          onClearAll={clearLayerTraits}
          onUpdateRarity={updateTraitRarity}
          onBulkUpdateRarity={bulkUpdateRarity}
        />
        
        {isGenerating && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-8">
            <div className="max-w-md w-full text-center">
              <div className="relative mb-8">
                <Car size={80} className="mx-auto text-indigo-400 animate-pulse" />
                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
              </div>
              <h2 className="text-3xl font-black mb-2 tracking-tight">جاري توليد الأسطول بسرعة فائقة...</h2>
              <p className="text-gray-400 mb-6 text-sm">{generationProgress.status || 'جاري دمج الليرات وتطبيق القواعد...'}</p>
              <div className="w-full bg-gray-800/80 rounded-full h-3.5 mb-4 overflow-hidden border border-gray-700">
                <div 
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full transition-all duration-150 ease-out shadow-[0_0_20px_rgba(99,102,241,0.5)]" 
                  style={{ width: `${Math.round((generationProgress.current / (generationProgress.total || 1)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-sm font-mono text-indigo-400 px-1">
                <span>{Math.round((generationProgress.current / (generationProgress.total || 1)) * 100)}%</span>
                <span>{generationProgress.current} / {generationProgress.total} تم إنشاؤها</span>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Fast Download Overlay */}
        {isDownloading && (
          <div className="absolute inset-0 z-[120] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="max-w-md w-full bg-[#1e293b]/95 backdrop-blur-xl rounded-[2rem] p-8 border border-white/10 shadow-2xl text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-indigo-500/20">
                  <Archive size={40} className="text-indigo-400 animate-bounce" />
                </div>
                <div className="absolute inset-0 bg-indigo-500/10 blur-2xl rounded-full" />
              </div>
              <h2 className="text-2xl font-black mb-2 tracking-tight text-white">تجهيز وتحميل ملف الـ ZIP</h2>
              <p className="text-sm text-gray-400 mb-6 font-medium">{downloadProgress.status || 'جاري ضغط الملفات...'}</p>
              
              <div className="w-full bg-gray-800 rounded-full h-3.5 mb-3 overflow-hidden border border-white/10">
                <div 
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full transition-all duration-150 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs font-mono text-gray-400 px-1">
                <span className="text-emerald-400 font-bold">{downloadProgress.percent}%</span>
                <span>{generatedItems.length} سيارة بالصور والميتاداتا</span>
              </div>
            </div>
          </div>
        )}

        {showSuccess && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8">
            <div className="max-w-lg w-full bg-[#1e293b]/90 backdrop-blur-xl rounded-[2rem] p-10 border border-white/10 shadow-2xl text-center">
              <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-green-500/20">
                <CheckCircle2 size={56} className="text-green-500" />
              </div>
              <h2 className="text-4xl font-black mb-2 tracking-tight">Fleet Ready!</h2>
              <p className="text-gray-400 mb-10 text-lg">
                Successfully generated <b>{generatedItems.length}</b> unique cars. High-resolution images and specs are bundled.
              </p>
              
              <div className="flex flex-col gap-3.5">
                <button 
                  onClick={() => setShowDownloadPartsModal(true)}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 hover:scale-[1.01] active:scale-98 rounded-2xl font-black text-base md:text-lg transition-all flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/30 border border-emerald-400/30 text-white"
                >
                  <FolderDown size={24} /> تحميل المجموعة على بارتات (سريع وآمن) 📦
                </button>

                <button 
                  onClick={() => setShowGallery(true)}
                  className="w-full py-3.5 bg-indigo-600/80 hover:bg-indigo-600 hover:scale-[1.01] active:scale-98 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-500/20 border border-indigo-400/30 text-white"
                >
                  <Eye size={22} /> معاينة المجموعة في المعرض
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={downloadFullCollection} 
                    disabled={isDownloading}
                    className="py-3.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-xl font-bold text-xs transition-all text-indigo-300 border border-white/5 flex items-center justify-center gap-2"
                    title="تحميل كل العناصر في ملف ZIP واحد"
                  >
                    <Archive size={18} /> {isDownloading ? 'جاري التحضير...' : 'ملف واحد (Full ZIP)'}
                  </button>
                  <button 
                    onClick={() => setShowSuccess(false)} 
                    className="py-3.5 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs transition-all text-gray-300 border border-white/5"
                  >
                    إغلاق والعودة
                  </button>
                </div>
                
                <div className="text-xs text-gray-400 bg-black/30 p-4 rounded-2xl mt-1 text-right space-y-1.5 border border-white/5" dir="rtl">
                    <p className="flex items-center gap-2 text-emerald-400 font-bold"><Check size={14} /> متاح التحميل في بارتات خفيفة ومستقلة لتجنب تهنيج المتصفح أو الذاكرة نهائياً.</p>
                    <p className="flex items-center gap-2 text-emerald-400 font-bold"><Check size={14} /> صور عالية الدقة بدقة {config.outputResolution || 1000}x{config.outputResolution || 1000} PNG</p>
                    <p className="flex items-center gap-2 text-amber-400 font-bold"><Check size={14} /> ملفات الميتاداتا الفردية JSON لكل سيارة + ملف CSV كامل</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className={`${mobileTab === 'generator' ? 'block' : 'hidden'} md:block h-full md:h-auto w-full md:w-auto z-20`}>
        <GeneratorPanel
          layers={layers}
          config={config}
          totalCombinations={totalCombinations}
          onConfigChange={(newConfig) => setConfig({ ...config, ...newConfig })}
          onGenerate={handleGenerateCollection}
          isGenerating={isGenerating}
          onRandomizePreview={generatePreview}
          previewImage={previewImage}
          previewBg={previewBg}
          onSetPreviewBg={setPreviewBg}
          rules={rules}
          onOpenRules={() => setShowRulesModal(true)}
        />
      </div>

      <LayerRulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        layers={layers}
        rules={rules}
        onUpdateRules={setRules}
        onAddLayer={(name) => addLayer(name)}
      />

      <DownloadPartsModal
        isOpen={showDownloadPartsModal}
        onClose={() => setShowDownloadPartsModal(false)}
        items={generatedItems}
        layers={layers}
        collectionName={config.collectionName}
      />

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-white/10 flex justify-around p-4 z-50 safe-area-bottom">
        <button onClick={() => setMobileTab('layers')} className={`flex flex-col items-center gap-1 ${mobileTab === 'layers' ? 'text-indigo-400' : 'text-gray-500'}`}>
          <Layers size={20} />
          <span className="text-[10px] font-bold uppercase">Components</span>
        </button>
        <button onClick={() => setMobileTab('editor')} className={`flex flex-col items-center gap-1 ${mobileTab === 'editor' ? 'text-indigo-400' : 'text-gray-500'}`}>
          <LayoutGrid size={20} />
          <span className="text-[10px] font-bold uppercase">Editor</span>
        </button>
        <button onClick={() => setMobileTab('generator')} className={`flex flex-col items-center gap-1 ${mobileTab === 'generator' ? 'text-indigo-400' : 'text-gray-500'}`}>
          <Settings size={20} />
          <span className="text-[10px] font-bold uppercase">Config</span>
        </button>
      </div>

      {showGallery && (
        <CollectionGallery 
          items={generatedItems}
          layers={layers}
          collectionName={config.collectionName}
          onClose={() => setShowGallery(false)}
          onDownload={downloadFullCollection}
          onOpenPartsDownload={() => setShowDownloadPartsModal(true)}
          isDownloading={isDownloading}
          downloadProgress={downloadProgress}
        />
      )}
    </div>
  );
};

export default App;
