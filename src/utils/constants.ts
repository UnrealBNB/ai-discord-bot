export enum SituationType {
  SCAM_TEXT = 'SCAM_TEXT',
  RED_PACKET_POLICY = 'RED_PACKET_POLICY',
  IMAGE_QR = 'IMAGE_QR',
  GENERIC_MODERATION = 'GENERIC_MODERATION',
}

export enum PolicyType {
  RED_PACKET = 'RED_PACKET',
  LINK_ONLY = 'LINK_ONLY',
  NO_LINKS = 'NO_LINKS',
  STRICT = 'STRICT',
}

export enum ActionType {
  NONE = 'none',
  LOG_ONLY = 'log_only',
  WARN_DM = 'warn_dm',
  DELETE = 'delete',
  TIMEOUT = 'timeout',
  TIMEOUT_AND_DELETE = 'timeout_and_delete',
}

export enum ModActionType {
  TIMEOUT_10M = 'timeout_10m',
  TIMEOUT_1H = 'timeout_1h',
  TIMEOUT_24H = 'timeout_24h',
  DELETE_MESSAGE = 'delete_message',
  DM_WARNING = 'dm_warning',
  IGNORE = 'ignore',
  MARK_SAFE = 'mark_safe',
}

export const TIMEOUT_DURATIONS = {
  [ModActionType.TIMEOUT_10M]: 10 * 60 * 1000,
  [ModActionType.TIMEOUT_1H]: 60 * 60 * 1000,
  [ModActionType.TIMEOUT_24H]: 24 * 60 * 60 * 1000,
} as const;

export const GEMINI_CATEGORIES = [
  'investment_scam',
  'phishing',
  'support_impersonation',
  'qr_scam',
  'spam',
  'harassment',
  'policy_violation',
  'clean',
] as const;

export type GeminiCategory = (typeof GEMINI_CATEGORIES)[number];

export const FALSE_POSITIVE_RISK = ['low', 'medium', 'high'] as const;
export type FalsePositiveRisk = (typeof FALSE_POSITIVE_RISK)[number];

export const EVIDENCE_TYPES = [
  'pattern',
  'url',
  'qr',
  'keyword',
  'behavior',
  'monetary_value',
  'currency',
  'text',
  'link',
  'mention',
  'attachment',
  'context',
  'phrase',
  'symbol',
  'other',
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const DEDUPE_CACHE_TTL_MS = 60 * 1000;
export const DEDUPE_CACHE_MAX_SIZE = 1000;

export const MESSAGE_SNIPPET_MAX_LENGTH = 500;
export const EMBED_DESCRIPTION_MAX_LENGTH = 4096;
export const EMBED_FIELD_VALUE_MAX_LENGTH = 1024;

export const BUTTON_CUSTOM_ID_PREFIX = 'mod_action';

export const QUEUE_RETRY_ATTEMPTS = 3;
export const QUEUE_RETRY_BASE_DELAY_MS = 1000;
export const QUEUE_RETRY_MAX_DELAY_MS = 30000;
