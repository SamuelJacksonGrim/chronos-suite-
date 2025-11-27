// EventBus.ts
import type { ChronosEvent, EventMeta } from '../types/common.js';

type Subscriber<T = any> = (evt: ChronosEvent<T>) => void;

export class EventBus {
  private subs: Map<string, Set<Subscriber>> = new Map();

  static generateId(prefix = 'evt') {
    const ts = Date.now().toString(36);
    const r = cryptoRandomHex(6);
    return `${prefix}-${ts}-${r}`;
  }

  static synthesizeName(base = 'event', payload?: any) {
    if (!payload) return base;
    if (typeof payload === 'string') return `${base}:${payload.slice(0,16).replace(/\s+/g,'_')}`;
    if (payload?.type) return `${base}:${String(payload.type)}`.slice(0,64);
    return `${base}:auto`;
  }

  subscribe<T = any>(topic: string, fn: Subscriber<T>) {
    if (!this.subs.has(topic)) this.subs.set(topic, new Set());
    this.subs.get(topic)!.add(fn as Subscriber);
    return () => this.unsubscribe(topic, fn);
  }

  unsubscribe<T = any>(topic: string, fn: Subscriber<T>) {
    this.subs.get(topic)?.delete(fn as Subscriber);
  }

  publish<T = any>(topic: string, payload?: T, source?: string) {
    const meta: EventMeta = {
      id: EventBus.generateId(topic),
      name: EventBus.synthesizeName(topic, payload),
      timestamp: new Date().toISOString(),
      source,
      payloadSummary: summarizePayload(payload)
    };

    const evt: ChronosEvent<T> = { meta, payload: payload as T };

    (this.subs.get(topic) || new Set()).forEach(fn => {
      try { fn(evt); } catch (e) { console.error("Event handler error:", e); }
    });

    for (const [key, set] of this.subs.entries()) {
      if (key.includes('*')) {
        const reg = new RegExp('^' + key.replace(/\*/g, '.*') + '$');
        if (reg.test(topic)) {
          set.forEach(fn => { try { fn(evt); } catch (e) { console.error("Event handler error:", e); }});
        }
      }
    }

    return evt;
  }

  static arrowLabel(evt: EventMeta) {
    return `${evt.name} — ${new Date(evt.timestamp).toLocaleTimeString()}`;
  }
}

function cryptoRandomHex(len: number) {
  const u = new Uint8Array(len);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(u);
    return Array.from(u).map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    const r = require('crypto');
    return r.randomBytes(len).toString('hex');
  }
}

function summarizePayload(p: any) {
  try {
    if (p == null) return 'null';
    if (typeof p === 'string') return p.length > 64 ? p.slice(0,61)+'...' : p;
    if (typeof p === 'object') return Object.keys(p).slice(0,6).join(',');
    return String(p);
  } catch { return 'summary_err'; }
}
