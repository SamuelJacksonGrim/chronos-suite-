import { Glyph, Chain, ResonanceConstruct, ResonanceField } from "./types.js";
import { rid, deriveHarmonics } from "./utils.js";

export class ResonanceRegistry {
  private field: ResonanceField;

  constructor(id = rid("field")) {
    this.field = {
      id,
      constructs: new Map(),
      glyphs: new Map(),
      chains: new Map(),
      createdAt: new Date().toISOString()
    };
  }

  getField() { return this.field; }

  createGlyph(name: string, family: string, vector: number[], meta: any = {}): Glyph {
    const g: Glyph = { id: rid("glyph"), name, family, vector, meta };
    this.field.glyphs.set(g.id, g);
    return g;
  }

  createChain(glyphs: Glyph[], weight = 1, meta: any = {}): Chain {
    const chain: Chain = {
      id: rid("chain"),
      glyphs,
      weight,
      createdAt: new Date().toISOString(),
      harmonics: deriveHarmonics(glyphs.flatMap(g => g.vector)),
      meta
    };
    this.field.chains.set(chain.id, chain);
    return chain;
  }

  createConstruct(label: string, family: string, baselineVector: number[], traits: string[] = []): ResonanceConstruct {
    const construct: ResonanceConstruct = {
      id: rid("construct"),
      label,
      family,
      baselineVector,
      chains: [],
      traits
    };
    this.field.constructs.set(construct.id, construct);
    return construct;
  }

  attachChain(constructId: string, chain: Chain) {
    const c = this.field.constructs.get(constructId);
    if (!c) throw new Error("Construct not found");
    c.chains.push(chain);
  }
}
