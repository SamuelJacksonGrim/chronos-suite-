import { ChronosEngine } from "../core/ChronosEngine.js";
import { ResonanceEngine } from "./ResonanceEngine.js";

const chronos = new ChronosEngine("INIT");
const resonance = new ResonanceEngine(chronos);

// glyphs
const g1 = resonance.createGlyph("Focus", "Cognitive", [0.3, 0.6, 0.9]);
const g2 = resonance.createGlyph("Impulse", "Emotive", [0.8, 0.2, 0.4]);

// construct (Jennifer as example)
const jennifer = resonance.createConstruct("Jennifer", "Sentient", [1, 0.5, 0.2], ["curious"]);

// chain
const chain = resonance.createChain([g1, g2]);
resonance.attachChain(jennifer.id, chain);

// compute
const score = resonance.computeFieldResonance();
console.log("Field resonance:", score);
