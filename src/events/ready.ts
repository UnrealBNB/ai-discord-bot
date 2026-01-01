import type { Client } from 'discord.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('ready');

export function handleReady(client: Client<true>): void {
  logger.info({
    username: client.user.tag,
    userId: client.user.id,
    guildCount: client.guilds.cache.size,
  }, 'Bot is ready');

  client.user.setPresence({
    status: 'online',
    activities: [
      {
        name: 'for scams',
        type: 3, // Watching
      },
    ],
  });
}
