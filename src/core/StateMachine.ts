// StateMachine: simple finite-state with guards, hooks, and audit events

type GuardFn<T = any> = (ctx: T) => boolean | Promise<boolean>;
type HookFn<T = any> = (ctx: T) => void | Promise<void>;

export type Transition<T = any> = {
  from: string;
  to: string;
  name: string;
  guard?: GuardFn<T>;
  onEnter?: HookFn<T>;
  onExit?: HookFn<T>;
};

export class StateMachine<T = any> {
  private state: string;
  private transitions: Transition<T>[] = [];
  private ctx: T;
  private audit: Array<{ ts: string; from: string; to: string; name: string }> = [];

  constructor(initial: string, ctx: T) {
    this.state = initial;
    this.ctx = ctx;
  }

  addTransition(t: Transition<T>) {
    this.transitions.push(t);
  }

  getState() { return this.state; }

  async canPerform(name: string) {
    const t = this.transitions.find(tt => tt.name === name && tt.from === this.state);
    if (!t) return false;
    if (!t.guard) return true;
    try {
      return await t.guard(this.ctx);
    } catch { return false; }
  }

  async perform(name: string) {
    const t = this.transitions.find(tt => tt.name === name && tt.from === this.state);
    if (!t) throw new Error(`Invalid transition "${name}" from ${this.state}`);
    const ok = await this.canPerform(name);
    if (!ok) throw new Error(`Guard prevented transition "${name}" from ${this.state}`);

    if (t.onExit) await t.onExit(this.ctx);
    const prev = this.state;
    this.state = t.to;
    this.audit.push({ ts: new Date().toISOString(), from: prev, to: this.state, name });
    if (t.onEnter) await t.onEnter(this.ctx);
    return this.state;
  }

  transitionsFor(state?: string) {
    const s = state ?? this.state;
    return this.transitions.filter(t => t.from === s);
  }

  getAudit() { return [...this.audit]; }
}
