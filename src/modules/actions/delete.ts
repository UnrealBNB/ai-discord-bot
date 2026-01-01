import type { Message, TextChannel, NewsChannel } from 'discord.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('actions:delete');

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export async function deleteMessage(message: Message): Promise<DeleteResult> {
  try {
    if (message.deletable) {
      await message.delete();

      logger.info({
        messageId: message.id,
        channelId: message.channelId,
        guildId: message.guildId,
      }, 'Message deleted');

      return { success: true };
    } else {
      return {
        success: false,
        error: 'Message is not deletable',
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('Unknown Message')) {
      logger.debug({ messageId: message.id }, 'Message already deleted');
      return { success: true };
    }

    logger.error({ error: errorMessage, messageId: message.id }, 'Failed to delete message');

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function deleteMessageById(
  channel: TextChannel | NewsChannel,
  messageId: string,
): Promise<DeleteResult> {
  try {
    const message = await channel.messages.fetch(messageId);
    return deleteMessage(message);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('Unknown Message')) {
      logger.debug({ messageId }, 'Message already deleted or not found');
      return { success: true };
    }

    logger.error({ error: errorMessage, messageId, channelId: channel.id }, 'Failed to fetch/delete message');

    return {
      success: false,
      error: errorMessage,
    };
  }
}
