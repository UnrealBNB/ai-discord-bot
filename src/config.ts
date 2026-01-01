import { z } from 'zod';

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),

  // LLM Provider: 'gemini' or 'ollama'
  LLM_PROVIDER: z.enum(['gemini', 'ollama']).default('gemini'),

  // Gemini settings
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),

  // Ollama settings
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('gemma3:4b'),

  DATABASE_PATH: z.string().default('./data/bot.db'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  MAX_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(2),
  MAX_QUEUE_SIZE: z.coerce.number().int().min(10).max(5000).default(500),
  MAX_IMAGE_SIZE_MB: z.coerce.number().min(1).max(25).default(8),
  IMAGE_DOWNLOAD_TIMEOUT_MS: z.coerce.number().min(1000).max(60000).default(10000),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Configuration validation failed:');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();

export type Config = z.infer<typeof envSchema>;
