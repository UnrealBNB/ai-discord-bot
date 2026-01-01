import type { Client } from 'discord.js';
import { handleReady } from './ready.js';
import { handleMessageCreate } from './messageCreate.js';
import { handleMessageUpdate } from './messageUpdate.js';
import { handleInteractionCreate } from './interactionCreate.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('events');

export function registerEvents(client: Client): void {
  client.once('clientReady', (readyClient) => {
    handleReady(readyClient);
  });

  client.on('messageCreate', async (message) => {
    await handleMessageCreate(message);
  });

  client.on('messageUpdate', async (oldMessage, newMessage) => {
    await handleMessageUpdate(oldMessage, newMessage);
  });

  client.on('interactionCreate', async (interaction) => {
    await handleInteractionCreate(interaction);
  });

  client.on('error', (error) => {
    logger.error({ error }, 'Discord client error');
  });

  client.on('warn', (message) => {
    logger.warn({ message }, 'Discord client warning');
  });

  logger.info('Event handlers registered');
}

export { handleReady } from './ready.js';
export { handleMessageCreate } from './messageCreate.js';
export { handleMessageUpdate } from './messageUpdate.js';
export { handleInteractionCreate } from './interactionCreate.js';
