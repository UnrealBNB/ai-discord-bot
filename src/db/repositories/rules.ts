import { getDatabase } from '../index.js';
import { ActionType } from '../../utils/constants.js';

export interface Rule {
  id: number;
  guild_id: string;
  channel_id: string | null;
  name: string;
  regex: string;
  severity: number;
  description: string | null;
  recommended_action: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRuleParams {
  guildId: string;
  channelId?: string | null;
  name: string;
  regex: string;
  severity?: number;
  description?: string | null;
  recommendedAction?: ActionType;
}

export function createRule(params: CreateRuleParams): number {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO rules (guild_id, channel_id, name, regex, severity, description, recommended_action)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    params.guildId,
    params.channelId ?? null,
    params.name,
    params.regex,
    params.severity ?? 50,
    params.description ?? null,
    params.recommendedAction ?? ActionType.LOG_ONLY,
  );
  return result.lastInsertRowid as number;
}

export function getRule(id: number): Rule | null {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM rules WHERE id = ?`);
  return stmt.get(id) as Rule | null;
}

export function getRuleByName(guildId: string, name: string): Rule | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM rules WHERE guild_id = ? AND name = ?
  `);
  return stmt.get(guildId, name) as Rule | null;
}

export function getGuildRules(guildId: string, enabledOnly: boolean = true): Rule[] {
  const db = getDatabase();
  const query = enabledOnly
    ? `SELECT * FROM rules WHERE guild_id = ? AND enabled = 1 ORDER BY severity DESC`
    : `SELECT * FROM rules WHERE guild_id = ? ORDER BY severity DESC`;
  const stmt = db.prepare(query);
  return stmt.all(guildId) as Rule[];
}

export function getChannelRules(guildId: string, channelId: string, enabledOnly: boolean = true): Rule[] {
  const db = getDatabase();
  const query = enabledOnly
    ? `SELECT * FROM rules WHERE guild_id = ? AND (channel_id IS NULL OR channel_id = ?) AND enabled = 1 ORDER BY severity DESC`
    : `SELECT * FROM rules WHERE guild_id = ? AND (channel_id IS NULL OR channel_id = ?) ORDER BY severity DESC`;
  const stmt = db.prepare(query);
  return stmt.all(guildId, channelId) as Rule[];
}

export function updateRule(
  id: number,
  updates: Partial<Omit<Rule, 'id' | 'guild_id' | 'created_at' | 'updated_at'>>,
): boolean {
  const db = getDatabase();

  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (updates.channel_id !== undefined) {
    setClauses.push('channel_id = ?');
    values.push(updates.channel_id);
  }
  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    values.push(updates.name);
  }
  if (updates.regex !== undefined) {
    setClauses.push('regex = ?');
    values.push(updates.regex);
  }
  if (updates.severity !== undefined) {
    setClauses.push('severity = ?');
    values.push(updates.severity);
  }
  if (updates.description !== undefined) {
    setClauses.push('description = ?');
    values.push(updates.description);
  }
  if (updates.recommended_action !== undefined) {
    setClauses.push('recommended_action = ?');
    values.push(updates.recommended_action);
  }
  if (updates.enabled !== undefined) {
    setClauses.push('enabled = ?');
    values.push(updates.enabled);
  }

  if (setClauses.length === 0) {
    return false;
  }

  setClauses.push("updated_at = datetime('now')");
  values.push(id);

  const stmt = db.prepare(`
    UPDATE rules SET ${setClauses.join(', ')} WHERE id = ?
  `);
  const result = stmt.run(...values);
  return result.changes > 0;
}

export function deleteRule(id: number): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM rules WHERE id = ?`);
  const result = stmt.run(id);
  return result.changes > 0;
}

export function deleteRuleByName(guildId: string, name: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM rules WHERE guild_id = ? AND name = ?`);
  const result = stmt.run(guildId, name);
  return result.changes > 0;
}

export function enableRule(id: number): boolean {
  return updateRule(id, { enabled: 1 });
}

export function disableRule(id: number): boolean {
  return updateRule(id, { enabled: 0 });
}

export function validateRegex(pattern: string): { valid: boolean; error?: string } {
  try {
    new RegExp(pattern, 'gi');
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Invalid regex' };
  }
}
