import type { Message, PartialMessage } from 'discord.js';
import { handleMessageCreate } from './messageCreate.js';
import { removeFromCache } from '../modules/scanner/dedupeCache.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('messageUpdate');

export async function handleMessageUpdate(
  oldMessage: Message | PartialMessage,
  newMessage: Message | PartialMessage,
): Promise<void> {
  if (newMessage.partial) {
    try {
      const fetched = await newMessage.fetch();
      return handleMessageUpdateInternal(oldMessage, fetched);
    } catch (error) {
      logger.warn({ error, messageId: newMessage.id }, 'Failed to fetch partial message');
      return;
    }
  }

  return handleMessageUpdateInternal(oldMessage, newMessage as Message);
}

async function handleMessageUpdateInternal(
  oldMessage: Message | PartialMessage,
  newMessage: Message,
): Promise<void> {
  if (!newMessage.guild) return;

  const oldContent = oldMessage.partial ? null : oldMessage.content;
  const newContent = newMessage.content;

  if (oldContent === newContent) {
    return;
  }

  removeFromCache(newMessage.id);

  logger.debug({
    messageId: newMessage.id,
    channelId: newMessage.channelId,
  }, 'Message updated, re-scanning');

  await handleMessageCreate(newMessage);
}
