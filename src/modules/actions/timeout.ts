import type { GuildMember } from 'discord.js';
import { createChildLogger } from '../../utils/logger.js';
import { canBotTargetMember } from '../../utils/permissions.js';

const logger = createChildLogger('actions:timeout');

export interface TimeoutResult {
  success: boolean;
  error?: string;
}

export async function timeoutMember(
  member: GuildMember,
  durationMs: number,
  reason?: string,
): Promise<TimeoutResult> {
  if (!canBotTargetMember(member)) {
    return {
      success: false,
      error: 'Cannot timeout this member (higher role or server owner)',
    };
  }

  try {
    await member.timeout(durationMs, reason ?? 'Flagged by moderation system');

    logger.info({
      userId: member.id,
      guildId: member.guild.id,
      durationMs,
    }, 'Member timed out');

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, userId: member.id }, 'Failed to timeout member');

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function removeTimeout(member: GuildMember, reason?: string): Promise<TimeoutResult> {
  try {
    await member.timeout(null, reason ?? 'Timeout removed by moderator');

    logger.info({
      userId: member.id,
      guildId: member.guild.id,
    }, 'Timeout removed');

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, userId: member.id }, 'Failed to remove timeout');

    return {
      success: false,
      error: errorMessage,
    };
  }
}
