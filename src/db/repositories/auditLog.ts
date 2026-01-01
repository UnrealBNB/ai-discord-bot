import { getDatabase } from '../index.js';
import { ModActionType } from '../../utils/constants.js';

export interface AuditLogEntry {
  id: number;
  guild_id: string;
  actor_user_id: string;
  target_user_id: string;
  action_type: string;
  message_id: string | null;
  channel_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface CreateAuditLogParams {
  guildId: string;
  actorUserId: string;
  targetUserId: string;
  actionType: ModActionType | string;
  messageId?: string | null;
  channelId?: string | null;
  reason?: string | null;
}

export function createAuditLogEntry(params: CreateAuditLogParams): number {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO actions_audit_log (guild_id, actor_user_id, target_user_id, action_type, message_id, channel_id, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    params.guildId,
    params.actorUserId,
    params.targetUserId,
    params.actionType,
    params.messageId ?? null,
    params.channelId ?? null,
    params.reason ?? null,
  );
  return result.lastInsertRowid as number;
}

export function getAuditLogEntries(
  guildId: string,
  options: {
    limit?: number;
    offset?: number;
    targetUserId?: string;
    actorUserId?: string;
    actionType?: string;
  } = {},
): AuditLogEntry[] {
  const db = getDatabase();
  const conditions: string[] = ['guild_id = ?'];
  const values: unknown[] = [guildId];

  if (options.targetUserId) {
    conditions.push('target_user_id = ?');
    values.push(options.targetUserId);
  }

  if (options.actorUserId) {
    conditions.push('actor_user_id = ?');
    values.push(options.actorUserId);
  }

  if (options.actionType) {
    conditions.push('action_type = ?');
    values.push(options.actionType);
  }

  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const stmt = db.prepare(`
    SELECT * FROM actions_audit_log
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);

  values.push(limit, offset);

  return stmt.all(...values) as AuditLogEntry[];
}

export function getAuditLogEntry(id: number): AuditLogEntry | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM actions_audit_log WHERE id = ?
  `);
  return stmt.get(id) as AuditLogEntry | null;
}

export function getRecentActionsForUser(
  guildId: string,
  targetUserId: string,
  hoursBack: number = 24,
): AuditLogEntry[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM actions_audit_log
    WHERE guild_id = ? AND target_user_id = ?
      AND datetime(created_at) >= datetime('now', ?)
    ORDER BY created_at DESC
  `);
  return stmt.all(guildId, targetUserId, `-${hoursBack} hours`) as AuditLogEntry[];
}

export function countActionsForUser(
  guildId: string,
  targetUserId: string,
  hoursBack: number = 24,
): number {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM actions_audit_log
    WHERE guild_id = ? AND target_user_id = ?
      AND datetime(created_at) >= datetime('now', ?)
  `);
  const result = stmt.get(guildId, targetUserId, `-${hoursBack} hours`) as { count: number };
  return result.count;
}
