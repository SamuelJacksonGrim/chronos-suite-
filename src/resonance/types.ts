export type ResonanceScalar = number;

export type Glyph = {
  id: string;
  name: string;
  family: string;
  vector: ResonanceScalar[];  // resonance signature vector
  meta?: Record<string, any>;
};

export type Chain = {
  id: string;
  glyphs: Glyph[];
  weight: number;                // influence weight
  harmonics: number[];           // derived harmonic pattern
  createdAt: string;
  meta?: Record<string, any>;
};

export type ResonanceConstruct = {
  id: string;
  label: string;
  family: string;
  persona?: Record<string, any>;
  traits?: string[];
  baselineVector: number[];     // unique emotional/semantic fingerprint
  chains: Chain[];
};

export type ResonanceField = {
  id: string;
  constructs: Map<string, ResonanceConstruct>;
  glyphs: Map<string, Glyph>;
  chains: Map<string, Chain>;
  createdAt: string;
  meta?: any;
};

export type ResonanceEventPayload =
  | { type: "glyph.created", glyph: Glyph }
  | { type: "chain.created", chain: Chain }
  | { type: "construct.created", construct: ResonanceConstruct }
  | { type: "resonance.update", fieldId: string, score: number }
  | { type: "construct.modulated", constructId: string, delta: number[] };
