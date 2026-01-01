import { getDatabase } from '../index.js';

export interface GuildConfig {
  guild_id: string;
  log_channel_id: string | null;
  scan_enabled: number;
  auto_mode_enabled: number;
  max_concurrency: number;
  max_queue_size: number;
  created_at: string;
  updated_at: string;
}

export function getGuildConfig(guildId: string): GuildConfig | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM guild_config WHERE guild_id = ?
  `);
  return stmt.get(guildId) as GuildConfig | null;
}

export function upsertGuildConfig(guildId: string, updates: Partial<Omit<GuildConfig, 'guild_id' | 'created_at' | 'updated_at'>>): void {
  const db = getDatabase();

  const existing = getGuildConfig(guildId);

  if (!existing) {
    const stmt = db.prepare(`
      INSERT INTO guild_config (guild_id, log_channel_id, scan_enabled, auto_mode_enabled, max_concurrency, max_queue_size)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      guildId,
      updates.log_channel_id ?? null,
      updates.scan_enabled ?? 0,
      updates.auto_mode_enabled ?? 0,
      updates.max_concurrency ?? 2,
      updates.max_queue_size ?? 500,
    );
  } else {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.log_channel_id !== undefined) {
      setClauses.push('log_channel_id = ?');
      values.push(updates.log_channel_id);
    }
    if (updates.scan_enabled !== undefined) {
      setClauses.push('scan_enabled = ?');
      values.push(updates.scan_enabled);
    }
    if (updates.auto_mode_enabled !== undefined) {
      setClauses.push('auto_mode_enabled = ?');
      values.push(updates.auto_mode_enabled);
    }
    if (updates.max_concurrency !== undefined) {
      setClauses.push('max_concurrency = ?');
      values.push(updates.max_concurrency);
    }
    if (updates.max_queue_size !== undefined) {
      setClauses.push('max_queue_size = ?');
      values.push(updates.max_queue_size);
    }

    if (setClauses.length > 0) {
      setClauses.push("updated_at = datetime('now')");
      values.push(guildId);

      const stmt = db.prepare(`
        UPDATE guild_config SET ${setClauses.join(', ')} WHERE guild_id = ?
      `);
      stmt.run(...values);
    }
  }
}

export function setLogChannel(guildId: string, channelId: string): void {
  upsertGuildConfig(guildId, { log_channel_id: channelId });
}

export function setScanEnabled(guildId: string, enabled: boolean): void {
  upsertGuildConfig(guildId, { scan_enabled: enabled ? 1 : 0 });
}

export function setAutoModeEnabled(guildId: string, enabled: boolean): void {
  upsertGuildConfig(guildId, { auto_mode_enabled: enabled ? 1 : 0 });
}

export function isScanEnabled(guildId: string): boolean {
  const config = getGuildConfig(guildId);
  return config?.scan_enabled === 1;
}

export function isAutoModeEnabled(guildId: string): boolean {
  const config = getGuildConfig(guildId);
  return config?.auto_mode_enabled === 1;
}

export function getLogChannelId(guildId: string): string | null {
  const config = getGuildConfig(guildId);
  return config?.log_channel_id ?? null;
}
