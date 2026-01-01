import type { User, Guild, EmbedBuilder } from 'discord.js';
import { EmbedBuilder as EB } from 'discord.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('actions:warn');

export interface WarnResult {
  success: boolean;
  error?: string;
  dmFailed?: boolean;
}

const DEFAULT_WARNING_MESSAGE = `Your message has been flagged by our moderation system for potential policy violations. Please review our server rules to ensure your future messages comply with our guidelines.

If you believe this was a mistake, please contact a moderator.`;

export function buildWarningEmbed(guildName: string, reason?: string): EmbedBuilder {
  return new EB()
    .setColor(0xffcc00)
    .setTitle('Moderation Warning')
    .setDescription(reason || DEFAULT_WARNING_MESSAGE)
    .addFields({
      name: 'Server',
      value: guildName,
      inline: true,
    })
    .setTimestamp()
    .setFooter({ text: 'This is an automated message' });
}

export async function sendWarningDM(
  user: User,
  guild: Guild,
  reason?: string,
): Promise<WarnResult> {
  try {
    const embed = buildWarningEmbed(guild.name, reason);

    await user.send({ embeds: [embed] });

    logger.info({
      userId: user.id,
      guildId: guild.id,
    }, 'Warning DM sent');

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('Cannot send messages to this user')) {
      logger.warn({ userId: user.id }, 'Cannot send DM to user (DMs disabled)');
      return {
        success: false,
        error: 'User has DMs disabled',
        dmFailed: true,
      };
    }

    logger.error({ error: errorMessage, userId: user.id }, 'Failed to send warning DM');

    return {
      success: false,
      error: errorMessage,
      dmFailed: true,
    };
  }
}

export async function sendCustomDM(
  user: User,
  embed: EmbedBuilder,
): Promise<WarnResult> {
  try {
    await user.send({ embeds: [embed] });

    logger.info({ userId: user.id }, 'Custom DM sent');

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      error: errorMessage,
      dmFailed: true,
    };
  }
}
