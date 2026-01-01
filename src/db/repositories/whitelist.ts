import { getDatabase } from '../index.js';

export interface WhitelistRole {
  guild_id: string;
  role_id: string;
}

export interface WhitelistUser {
  guild_id: string;
  user_id: string;
}

export function getWhitelistedRoles(guildId: string): string[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT role_id FROM whitelist_roles WHERE guild_id = ?
  `);
  const rows = stmt.all(guildId) as WhitelistRole[];
  return rows.map((r) => r.role_id);
}

export function getWhitelistedUsers(guildId: string): string[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT user_id FROM whitelist_users WHERE guild_id = ?
  `);
  const rows = stmt.all(guildId) as WhitelistUser[];
  return rows.map((u) => u.user_id);
}

export function addWhitelistRole(guildId: string, roleId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO whitelist_roles (guild_id, role_id) VALUES (?, ?)
  `);
  const result = stmt.run(guildId, roleId);
  return result.changes > 0;
}

export function removeWhitelistRole(guildId: string, roleId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    DELETE FROM whitelist_roles WHERE guild_id = ? AND role_id = ?
  `);
  const result = stmt.run(guildId, roleId);
  return result.changes > 0;
}

export function addWhitelistUser(guildId: string, userId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO whitelist_users (guild_id, user_id) VALUES (?, ?)
  `);
  const result = stmt.run(guildId, userId);
  return result.changes > 0;
}

export function removeWhitelistUser(guildId: string, userId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    DELETE FROM whitelist_users WHERE guild_id = ? AND user_id = ?
  `);
  const result = stmt.run(guildId, userId);
  return result.changes > 0;
}

export function isRoleWhitelisted(guildId: string, roleId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 1 FROM whitelist_roles WHERE guild_id = ? AND role_id = ?
  `);
  return stmt.get(guildId, roleId) !== undefined;
}

export function isUserWhitelisted(guildId: string, userId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 1 FROM whitelist_users WHERE guild_id = ? AND user_id = ?
  `);
  return stmt.get(guildId, userId) !== undefined;
}

export function isWhitelisted(guildId: string, userId: string, roleIds: string[]): boolean {
  if (isUserWhitelisted(guildId, userId)) {
    return true;
  }

  const whitelistedRoles = getWhitelistedRoles(guildId);
  return roleIds.some((roleId) => whitelistedRoles.includes(roleId));
}

export function clearWhitelist(guildId: string): void {
  const db = getDatabase();
  db.prepare(`DELETE FROM whitelist_roles WHERE guild_id = ?`).run(guildId);
  db.prepare(`DELETE FROM whitelist_users WHERE guild_id = ?`).run(guildId);
}
