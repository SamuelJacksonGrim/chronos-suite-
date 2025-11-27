import { ChronosEngine } from "../core/ChronosEngine.js";
import { ResonanceRegistry } from "./ResonanceRegistry.js";
import { vecAdd, magnitude } from "./utils.js";
import { ResonanceEventPayload } from "./types.js";

export class ResonanceEngine {
  private chronos: ChronosEngine;
  private registry: ResonanceRegistry;

  constructor(chronos: ChronosEngine, fieldId?: string) {
    this.chronos = chronos;
    this.registry = new ResonanceRegistry(fieldId);
  }

  getRegistry() {
    return this.registry;
  }

  // ==== GLYPH CREATION ====
  createGlyph(name: string, family: string, vector: number[], meta = {}) {
    const g = this.registry.createGlyph(name, family, vector, meta);
    this.emit({ type: "glyph.created", glyph: g });
    return g;
  }

  // ==== CHAIN CREATION ====
  createChain(glyphs: any[], weight = 1, meta = {}) {
    const chain = this.registry.createChain(glyphs, weight, meta);
    this.emit({ type: "chain.created", chain });
    return chain;
  }

  // ==== CONSTRUCT CREATION ====
  createConstruct(label: string, family: string, baselineVector: number[], traits: string[] = []) {
    const c = this.registry.createConstruct(label, family, baselineVector, traits);
    this.emit({ type: "construct.created", construct: c });
    return c;
  }

  attachChain(constructId: string, chain: any) {
    this.registry.attachChain(constructId, chain);
  }

  // ==== RESONANCE MATH ====
  computeConstructVector(constructId: string): number[] {
    const c = this.registry.getField().constructs.get(constructId);
    if (!c) throw new Error("Construct not found");

    let v = [...c.baselineVector];
    for (const chain of c.chains) {
      const chainVector = chain.glyphs.flatMap(g => g.vector);
      v = vecAdd(v, chainVector.map(x => x * chain.weight));
    }
    return v;
  }

  computeFieldResonance() {
    const field = this.registry.getField();
    const vectors = Array.from(field.constructs.values()).map(c => this.computeConstructVector(c.id));
    const sum = vectors.reduce((acc, v) => vecAdd(acc, v), []);
    const score = magnitude(sum);
    this.emit({ type: "resonance.update", fieldId: field.id, score });
    return score;
  }

  // ==== MODULATION ====
  modulateConstruct(constructId: string, delta: number[]) {
    const c = this.registry.getField().constructs.get(constructId);
    if (!c) throw new Error("Construct not found");
    c.baselineVector = vecAdd(c.baselineVector, delta);
    this.emit({ type: "construct.modulated", constructId, delta });
  }

  // ==== EVENT EMITTER ====
  private emit(payload: ResonanceEventPayload) {
    this.chronos.emit("resonance", payload, "resonance.engine");
  }
}
