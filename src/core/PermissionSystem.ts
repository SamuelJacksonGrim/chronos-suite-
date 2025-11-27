// PermissionSystem: lightweight permission granting + incentive token accounting

import { Permission, AuditRecord } from '../types/index.js';

export class PermissionSystem {
  private permissions: Map<string, Permission> = new Map();
  private incentives: Map<string, number> = new Map(); // userId -> tokens
  private audit: AuditRecord[] = [];

  // declare permission (not granted)
  declarePermission(id: string, name: string, description?: string) {
    if (this.permissions.has(id)) throw new Error('Permission already declared: ' + id);
    const p: Permission = { id, name, description, expiresAt: null, incentiveTokens: 0 };
    this.permissions.set(id, p);
    this._audit('DECLARE_PERMISSION', { id, name });
    return p;
  }

  // grant permission to user (userId is freeform)
  grant(id: string, userId: string, opts?: { expiresInSeconds?: number, tokens?: number, grantedBy?: string }) {
    const p = this.permissions.get(id);
    if (!p) throw new Error('Permission not found: ' + id);
    const now = new Date();
    p.grantedAt = now.toISOString();
    p.expiresAt = opts?.expiresInSeconds ? new Date(now.getTime() + opts.expiresInSeconds * 1000).toISOString() : null;
    p.incentiveTokens = opts?.tokens ?? p.incentiveTokens ?? 0;
    p.grantedBy = opts?.grantedBy;
    this.permissions.set(id, p);

    if (p.incentiveTokens && userId) {
      this.incentives.set(userId, (this.incentives.get(userId) || 0) + p.incentiveTokens);
    }

    this._audit('GRANT_PERMISSION', { id, userId, expiresAt: p.expiresAt, tokens: p.incentiveTokens });
    return p;
  }

  // revoke permission
  revoke(id: string, userId?: string) {
    const p = this.permissions.get(id);
    if (!p) return false;
    p.expiresAt = new Date().toISOString();
    this.permissions.set(id, p);
    this._audit('REVOKE_PERMISSION', { id, userId });
    return true;
  }

  // check whether permission is currently active
  isActive(id: string) {
    const p = this.permissions.get(id);
    if (!p || !p.grantedAt) return false;
    if (!p.expiresAt) return true;
    return new Date() < new Date(p.expiresAt);
  }

  // consume incentive tokens
  consumeTokens(userId: string, amount: number) {
    const have = this.incentives.get(userId) || 0;
    if (have < amount) return false;
    this.incentives.set(userId, have - amount);
    this._audit('CONSUME_TOKENS', { userId, amount });
    return true;
  }

  getTokens(userId: string) {
    return this.incentives.get(userId) || 0;
  }

  // basic audit / persistence hook
  private _audit(action: string, data?: any) {
    const rec: AuditRecord = { timestamp: new Date().toISOString(), action, data };
    this.audit.push(rec);
  }

  getAudit() { return [...this.audit]; }
  listPermissions() { return Array.from(this.permissions.values()); }
}
