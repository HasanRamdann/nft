
export interface Trait {
  id: string;
  name: string;
  imageData: string; // base64
  rarity: number; // 0 to 100
  fileName: string;
}

export interface Layer {
  id: string;
  name: string;
  order: number;
  traits: Trait[];
  rarity: number; // Layer frequency: 0 to 100%
}

export interface GeneratedCar {
  id: number;
  traits: { layerId: string; traitId: string }[];
  image: string; // Merged base64 or blob URL
  imageBlob?: Blob; // Direct binary blob for ultra-fast ZIP packaging without memory overhead
  metadata: any;
}

export interface GenerationConfig {
  collectionSize: number;
  collectionName: string;
  description: string;
  outputResolution?: number; // 512, 1000, 2000
}

export type RuleAction = 'exclude' | 'require' | 'combine';

export interface LayerRule {
  id: string;
  type?: RuleAction; // 'exclude' (لا يستخدم) | 'require' (يستخدم إجبارياً) | 'combine' (دمج وتوافق معاً)
  sourceLayerId: string;
  sourceTraitId?: string; // 'all' or specific trait id
  targetLayerId: string;
  targetTraitId?: string; // 'any' or specific trait id
  combineMode?: 'always' | 'percentage'; // 'always' = دمج وتلازم دائم, 'percentage' = إتاحة كخيار ثالث بنسبة مئوية
  combinePercentage?: number; // 1 to 100
  enabled: boolean;
  _sourceLayerName?: string;
  _targetLayerName?: string;
}
