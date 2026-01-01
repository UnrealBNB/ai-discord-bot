import { type ButtonInteraction, type TextChannel, type NewsChannel, type GuildMember, MessageFlags } from 'discord.js';
import { timeoutMember } from './timeout.js';
import { deleteMessageById } from './delete.js';
import { sendWarningDM } from './warn.js';
import { logModAction } from './auditLogger.js';
import { ModActionType, TIMEOUT_DURATIONS } from '../../utils/constants.js';
import { canTimeout, canDelete } from '../../utils/permissions.js';
import { buildDisabledButtons } from '../../ui/buttons/actionButtons.js';
import { buildActionConfirmEmbed } from '../../ui/embeds/modLogEmbed.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('actions');

export interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

export async function executeAction(
  interaction: ButtonInteraction,
  action: ModActionType,
  messageId: string,
  channelId: string,
  targetUserId: string,
): Promise<ActionResult> {
  const guild = interaction.guild;
  if (!guild) {
    return { success: false, error: 'Not in a guild' };
  }

  const actor = interaction.member as GuildMember;
  if (!actor) {
    return { success: false, error: 'Could not determine actor' };
  }

  let targetMember: GuildMember | null = null;
  try {
    targetMember = await guild.members.fetch(targetUserId);
  } catch {
    if (action !== ModActionType.DELETE_MESSAGE &&
        action !== ModActionType.IGNORE &&
        action !== ModActionType.MARK_SAFE) {
      return { success: false, error: 'Target user not found in server' };
    }
  }

  let result: ActionResult;

  switch (action) {
    case ModActionType.TIMEOUT_10M:
    case ModActionType.TIMEOUT_1H:
    case ModActionType.TIMEOUT_24H: {
      if (!canTimeout(actor)) {
        return { success: false, error: 'You do not have permission to timeout members' };
      }
      if (!targetMember) {
        return { success: false, error: 'Target member not found' };
      }
      const duration = TIMEOUT_DURATIONS[action];
      const timeoutResult = await timeoutMember(targetMember, duration);
      result = {
        success: timeoutResult.success,
        error: timeoutResult.error,
        message: timeoutResult.success ? `Timed out for ${action.replace('timeout_', '')}` : undefined,
      };
      break;
    }

    case ModActionType.DELETE_MESSAGE: {
      if (!canDelete(actor)) {
        return { success: false, error: 'You do not have permission to delete messages' };
      }
      const channel = guild.channels.cache.get(channelId) as TextChannel | NewsChannel | undefined;
      if (!channel) {
        return { success: false, error: 'Channel not found' };
      }
      const deleteResult = await deleteMessageById(channel, messageId);
      result = {
        success: deleteResult.success,
        error: deleteResult.error,
        message: deleteResult.success ? 'Message deleted' : undefined,
      };
      break;
    }

    case ModActionType.DM_WARNING: {
      if (!targetMember) {
        return { success: false, error: 'Target member not found' };
      }
      const warnResult = await sendWarningDM(targetMember.user, guild);
      result = {
        success: warnResult.success,
        error: warnResult.error,
        message: warnResult.success ? 'Warning DM sent' : (warnResult.dmFailed ? 'DM failed (user may have DMs disabled)' : undefined),
      };
      break;
    }

    case ModActionType.IGNORE: {
      result = {
        success: true,
        message: 'Flagged content ignored',
      };
      break;
    }

    case ModActionType.MARK_SAFE: {
      result = {
        success: true,
        message: 'Content marked as safe',
      };
      break;
    }

    default:
      return { success: false, error: 'Unknown action' };
  }

  if (result.success) {
    logModAction({
      guildId: guild.id,
      actorUserId: actor.id,
      targetUserId,
      action,
      messageId,
      channelId,
    });

    const disabledButtons = buildDisabledButtons(messageId, channelId, targetUserId, action);

    try {
      await interaction.update({
        components: disabledButtons,
      });
    } catch (error) {
      logger.warn({ error }, 'Failed to update button interaction');
    }

    const actionLabel = action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const confirmEmbed = buildActionConfirmEmbed(
      actionLabel,
      `<@${targetUserId}>`,
      `<@${actor.id}>`,
    );

    try {
      await interaction.followUp({
        embeds: [confirmEmbed],
        flags: MessageFlags.Ephemeral,
      });
    } catch {
      // Ignore followUp errors
    }
  }

  return result;
}

export { timeoutMember, type TimeoutResult } from './timeout.js';
export { deleteMessageById, type DeleteResult } from './delete.js';
export { sendWarningDM, type WarnResult } from './warn.js';
export { logModAction, type LogActionParams } from './auditLogger.js';
