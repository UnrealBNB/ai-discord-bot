import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from './config.js';
import { initDatabase, closeDatabase } from './db/index.js';
import { initGemini, testConnection } from './services/gemini/index.js';
import { initQueue } from './services/queue/index.js';
import { registerEvents } from './events/index.js';
import { createChildLogger } from './utils/logger.js';

const logger = createChildLogger('main');

async function main() {
  logger.info('Starting AI Discord Moderator Bot...');

  initDatabase(config.DATABASE_PATH);
  logger.info('Database initialized');

  initGemini();
  logger.info('Gemini client initialized');

  const geminiOk = await testConnection();
  if (!geminiOk) {
    logger.warn('Gemini connection test failed - API may be unavailable');
  } else {
    logger.info('Gemini connection verified');
  }

  initQueue(config.MAX_CONCURRENCY, config.MAX_QUEUE_SIZE);
  logger.info('Scan queue initialized');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [
      Partials.Message,
      Partials.Channel,
    ],
  });

  registerEvents(client);

  process.on('SIGINT', () => shutdown(client));
  process.on('SIGTERM', () => shutdown(client));

  try {
    await client.login(config.DISCORD_TOKEN);
  } catch (error) {
    logger.error({ error }, 'Failed to login to Discord');
    process.exit(1);
  }
}

async function shutdown(client: Client) {
  logger.info('Shutting down...');

  try {
    client.destroy();
    closeDatabase();
    logger.info('Cleanup complete');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error({ error }, 'Fatal error');
  process.exit(1);
});
