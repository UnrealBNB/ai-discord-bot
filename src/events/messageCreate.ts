import type { Message, TextChannel, NewsChannel } from 'discord.js';
import { processMessage } from '../modules/scanner/index.js';
import { getLogChannelId, isAutoModeEnabled } from '../db/repositories/guildConfig.js';
import { buildModLogEmbed } from '../ui/embeds/modLogEmbed.js';
import { buildActionButtons } from '../ui/buttons/actionButtons.js';
import { shouldAutoAct } from '../services/gemini/schemaValidator.js';
import { ActionType } from '../utils/constants.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('messageCreate');

const SCORE_THRESHOLD = 30;

export async function handleMessageCreate(message: Message): Promise<void> {
  if (!message.guild) return;

  try {
    const result = await processMessage(message);

    if (!result.processed || !result.scanResult) {
      return;
    }

    const { scanResult, qrContent } = result;
    const response = scanResult.response;

    if (response.score < SCORE_THRESHOLD) {
      logger.debug({
        messageId: message.id,
        score: response.score,
      }, 'Message below threshold, not flagging');
      return;
    }

    const logChannelId = getLogChannelId(message.guild.id);
    if (!logChannelId) {
      logger.warn({ guildId: message.guild.id }, 'No log channel configured');
      return;
    }

    const logChannel = message.guild.channels.cache.get(logChannelId) as TextChannel | NewsChannel | undefined;
    if (!logChannel) {
      logger.warn({ logChannelId }, 'Log channel not found');
      return;
    }

    const embed = buildModLogEmbed({
      message,
      scanResult: response,
      qrContent,
      scanFailed: !scanResult.success,
    });

    const buttons = buildActionButtons(
      message.id,
      message.channelId,
      message.author.id,
    );

    await logChannel.send({
      embeds: [embed],
      components: buttons,
    });

    logger.info({
      messageId: message.id,
      score: response.score,
      categories: response.categories,
      channelId: message.channelId,
    }, 'Flagged message posted to mod-log');

    if (isAutoModeEnabled(message.guild.id) && shouldAutoAct(response)) {
      logger.info({ messageId: message.id }, 'Auto-mode triggered');
      await handleAutoAction(message, response.recommended_action);
    }
  } catch (error) {
    logger.error({ error, messageId: message.id }, 'Error processing message');
  }
}

async function handleAutoAction(message: Message, recommendedAction: string): Promise<void> {
  const guild = message.guild;
  if (!guild) return;

  const botMember = guild.members.me;
  if (!botMember) return;

  try {
    switch (recommendedAction) {
      case ActionType.DELETE:
        if (message.deletable) {
          await message.delete();
          logger.info({ messageId: message.id }, 'Auto-deleted message');
        }
        break;

      case ActionType.TIMEOUT:
        const member = message.member;
        if (member && member.moderatable) {
          await member.timeout(10 * 60 * 1000, 'Auto-moderation: flagged content');
          logger.info({ userId: member.id }, 'Auto-timed out member');
        }
        break;

      case ActionType.TIMEOUT_AND_DELETE:
        if (message.deletable) {
          await message.delete();
        }
        const targetMember = message.member;
        if (targetMember && targetMember.moderatable) {
          await targetMember.timeout(10 * 60 * 1000, 'Auto-moderation: flagged content');
        }
        logger.info({ messageId: message.id }, 'Auto-deleted and timed out');
        break;

      default:
        break;
    }
  } catch (error) {
    logger.error({ error, messageId: message.id, action: recommendedAction }, 'Auto-action failed');
  }
}
