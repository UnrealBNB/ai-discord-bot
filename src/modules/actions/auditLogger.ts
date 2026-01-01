import { createAuditLogEntry, type CreateAuditLogParams } from '../../db/repositories/auditLog.js';
import { ModActionType } from '../../utils/constants.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('auditLogger');

export interface LogActionParams {
  guildId: string;
  actorUserId: string;
  targetUserId: string;
  action: ModActionType;
  messageId?: string;
  channelId?: string;
  reason?: string;
}

export function logModAction(params: LogActionParams): number {
  const auditParams: CreateAuditLogParams = {
    guildId: params.guildId,
    actorUserId: params.actorUserId,
    targetUserId: params.targetUserId,
    actionType: params.action,
    messageId: params.messageId,
    channelId: params.channelId,
    reason: params.reason,
  };

  const id = createAuditLogEntry(auditParams);

  logger.info({
    auditId: id,
    action: params.action,
    actor: params.actorUserId,
    target: params.targetUserId,
    guildId: params.guildId,
  }, 'Moderation action logged');

  return id;
}

export function logTimeout(
  guildId: string,
  actorUserId: string,
  targetUserId: string,
  duration: string,
  messageId?: string,
  channelId?: string,
): number {
  const action = duration === '10m'
    ? ModActionType.TIMEOUT_10M
    : duration === '1h'
      ? ModActionType.TIMEOUT_1H
      : ModActionType.TIMEOUT_24H;

  return logModAction({
    guildId,
    actorUserId,
    targetUserId,
    action,
    messageId,
    channelId,
    reason: `Timeout for ${duration}`,
  });
}

export function logDelete(
  guildId: string,
  actorUserId: string,
  targetUserId: string,
  messageId: string,
  channelId: string,
): number {
  return logModAction({
    guildId,
    actorUserId,
    targetUserId,
    action: ModActionType.DELETE_MESSAGE,
    messageId,
    channelId,
  });
}

export function logWarning(
  guildId: string,
  actorUserId: string,
  targetUserId: string,
  messageId?: string,
  channelId?: string,
): number {
  return logModAction({
    guildId,
    actorUserId,
    targetUserId,
    action: ModActionType.DM_WARNING,
    messageId,
    channelId,
  });
}

export function logIgnore(
  guildId: string,
  actorUserId: string,
  targetUserId: string,
  messageId?: string,
  channelId?: string,
): number {
  return logModAction({
    guildId,
    actorUserId,
    targetUserId,
    action: ModActionType.IGNORE,
    messageId,
    channelId,
  });
}

export function logMarkSafe(
  guildId: string,
  actorUserId: string,
  targetUserId: string,
  messageId?: string,
  channelId?: string,
): number {
  return logModAction({
    guildId,
    actorUserId,
    targetUserId,
    action: ModActionType.MARK_SAFE,
    messageId,
    channelId,
  });
}
