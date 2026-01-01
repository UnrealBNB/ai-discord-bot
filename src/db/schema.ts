export const SCHEMA_DDL = `
-- Guild configuration
CREATE TABLE IF NOT EXISTS guild_config (
    guild_id TEXT PRIMARY KEY,
    log_channel_id TEXT,
    scan_enabled INTEGER DEFAULT 0,
    auto_mode_enabled INTEGER DEFAULT 0,
    max_concurrency INTEGER DEFAULT 2,
    max_queue_size INTEGER DEFAULT 500,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Channel-specific policies
CREATE TABLE IF NOT EXISTS channel_policies (
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    policy_type TEXT NOT NULL,
    settings_json TEXT DEFAULT '{}',
    enabled INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (guild_id, channel_id, policy_type)
);

-- Custom moderation rules (regex patterns)
CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT,
    name TEXT NOT NULL,
    regex TEXT NOT NULL,
    severity INTEGER DEFAULT 50,
    description TEXT,
    recommended_action TEXT DEFAULT 'log_only',
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rules_guild ON rules(guild_id);
CREATE INDEX IF NOT EXISTS idx_rules_channel ON rules(guild_id, channel_id);

-- Whitelisted roles (exempt from scanning)
CREATE TABLE IF NOT EXISTS whitelist_roles (
    guild_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    PRIMARY KEY (guild_id, role_id)
);

-- Whitelisted users (exempt from scanning)
CREATE TABLE IF NOT EXISTS whitelist_users (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (guild_id, user_id)
);

-- Audit log for moderation actions
CREATE TABLE IF NOT EXISTS actions_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    target_user_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    message_id TEXT,
    channel_id TEXT,
    reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_guild ON actions_audit_log(guild_id);
CREATE INDEX IF NOT EXISTS idx_audit_target ON actions_audit_log(target_user_id);

-- Situation-specific custom prompts
CREATE TABLE IF NOT EXISTS situation_prompts (
    guild_id TEXT NOT NULL,
    situation TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (guild_id, situation)
);
`;

export const TABLE_NAMES = {
  GUILD_CONFIG: 'guild_config',
  CHANNEL_POLICIES: 'channel_policies',
  RULES: 'rules',
  WHITELIST_ROLES: 'whitelist_roles',
  WHITELIST_USERS: 'whitelist_users',
  ACTIONS_AUDIT_LOG: 'actions_audit_log',
  SITUATION_PROMPTS: 'situation_prompts',
} as const;
