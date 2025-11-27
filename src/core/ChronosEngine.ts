// ChronosEngine: composes EventBus, PermissionSystem, StateMachine and exposes a small API.

import { EventBus } from './EventBus.js';
import { PermissionSystem } from './PermissionSystem.js';
import { StateMachine } from './StateMachine.js';
import { ChronosEvent } from '../types/index.js';

export class ChronosEngine {
  public events: EventBus;
  public permissions: PermissionSystem;
  private stateMachine: StateMachine<Record<string, any>>;

  // optional persistence adapter (save/load functions)
  private persistence: {
    save?: (k: string, v: any) => Promise<void>;
    load?: (k: string) => Promise<any>;
  } | null;

  constructor(initialPhase = 'UNINITIALIZED', persistenceAdapter: any = null) {
    this.events = new EventBus();
    this.permissions = new PermissionSystem();
    this.stateMachine = new StateMachine(initialPhase, {});
    this.persistence = persistenceAdapter;
  }

  // expose basic state machine API
  getPhase() { return this.stateMachine.getState(); }
  addTransition(t: any) { this.stateMachine.addTransition(t); }
  async goto(transitionName: string) {
    const prev = this.getPhase();
    const next = await this.stateMachine.perform(transitionName);
    this.events.publish('system.phase', { from: prev, to: next }, 'chronos.engine');
    return next;
  }

  // allow modules to register event handlers with small sugar
  on(topic: string, fn: (e: ChronosEvent) => void) { return this.events.subscribe(topic, fn); }
  emit(topic: string, payload?: any, source?: string) { return this.events.publish(topic, payload, source); }

  // Convenience: automated arrow/event names for diagramming
  synthesizeArrowLabel(topic: string, payload?: any) {
    const tmp = this.events.publish(topic, payload, 'chronos.engine.synth'); // ephemeral publish
    return EventBus.arrowLabel(tmp.meta);
  }

  // persistence helpers (very small)
  async saveState(key = 'chronos_state') {
    if (this.persistence?.save) {
      await this.persistence.save(key, { phase: this.getPhase(), perms: this.permissions.listPermissions() });
    }
  }

  async loadState(key = 'chronos_state') {
    if (this.persistence?.load) {
      const v = await this.persistence.load(key);
      if (v?.phase) {
        // naive restore: set machine state (dangerous in production)
        // you may want guarded restore
        // For now we publish an event to announce restore
        this.events.publish('system.restore', v, 'chronos.engine');
      }
      return v;
    }
    return null;
  }
}
