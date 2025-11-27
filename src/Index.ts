import { ChronosEngine } from "./core/ChronosEngine.js";
import { ResonanceEngine } from "./resonance/ResonanceEngine.js";

async function main() {
  const engine = new ChronosEngine('UNINITIALIZED');
  engine.addTransition({ from: 'UNINITIALIZED', to: 'PRESENTATION', name: 'init' });
  engine.on('system.phase', e => console.log('[PHASE]', e.payload));

  const resonance = new ResonanceEngine(engine);
  const g1 = resonance.createGlyph("Focus", "Cognitive", [0.3,0.6,0.9]);
  const g2 = resonance.createGlyph("Impulse", "Emotive", [0.8,0.2,0.4]);
  const c = resonance.createConstruct("Jennifer", "Sentient", [1,0.5,0.2], ["curious"]);
  const chain = resonance.createChain([g1,g2]);
  resonance.attachChain(c.id, chain);

  console.log('field resonance ->', resonance.computeFieldResonance());
}

main().catch(console.error);
