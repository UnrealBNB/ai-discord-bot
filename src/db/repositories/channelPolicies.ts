import { getDatabase } from '../index.js';
import { PolicyType } from '../../utils/constants.js';

export interface ChannelPolicy {
  guild_id: string;
  channel_id: string;
  policy_type: string;
  settings_json: string;
  enabled: number;
  updated_at: string;
}

export interface PolicySettings {
  [key: string]: unknown;
}

export function getChannelPolicies(guildId: string, channelId: string): ChannelPolicy[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM channel_policies
    WHERE guild_id = ? AND channel_id = ? AND enabled = 1
  `);
  return stmt.all(guildId, channelId) as ChannelPolicy[];
}

export function getChannelPolicy(guildId: string, channelId: string, policyType: PolicyType): ChannelPolicy | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM channel_policies
    WHERE guild_id = ? AND channel_id = ? AND policy_type = ?
  `);
  return stmt.get(guildId, channelId, policyType) as ChannelPolicy | null;
}

export function getAllGuildPolicies(guildId: string): ChannelPolicy[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM channel_policies WHERE guild_id = ?
  `);
  return stmt.all(guildId) as ChannelPolicy[];
}

export function setChannelPolicy(
  guildId: string,
  channelId: string,
  policyType: PolicyType,
  settings: PolicySettings = {},
): void {
  const db = getDatabase();
  const settingsJson = JSON.stringify(settings);

  const stmt = db.prepare(`
    INSERT INTO channel_policies (guild_id, channel_id, policy_type, settings_json, enabled)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(guild_id, channel_id, policy_type)
    DO UPDATE SET settings_json = ?, enabled = 1, updated_at = datetime('now')
  `);
  stmt.run(guildId, channelId, policyType, settingsJson, settingsJson);
}

export function removeChannelPolicy(guildId: string, channelId: string, policyType: PolicyType): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    DELETE FROM channel_policies
    WHERE guild_id = ? AND channel_id = ? AND policy_type = ?
  `);
  const result = stmt.run(guildId, channelId, policyType);
  return result.changes > 0;
}

export function disableChannelPolicy(guildId: string, channelId: string, policyType: PolicyType): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE channel_policies
    SET enabled = 0, updated_at = datetime('now')
    WHERE guild_id = ? AND channel_id = ? AND policy_type = ?
  `);
  const result = stmt.run(guildId, channelId, policyType);
  return result.changes > 0;
}

export function getPolicySettings(policy: ChannelPolicy): PolicySettings {
  try {
    return JSON.parse(policy.settings_json) as PolicySettings;
  } catch {
    return {};
  }
}

export function hasChannelPolicy(guildId: string, channelId: string, policyType: PolicyType): boolean {
  const policy = getChannelPolicy(guildId, channelId, policyType);
  return policy !== null && policy.enabled === 1;
}
