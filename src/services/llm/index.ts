import { config } from '../../config.js';
import { createChildLogger } from '../../utils/logger.js';
import * as gemini from '../gemini/index.js';
import * as ollama from '../ollama/index.js';
import type { GeminiResponse } from '../gemini/schemaValidator.js';
import type { SituationType } from '../../utils/constants.js';

const logger = createChildLogger('llm');

export interface ScanRequest {
  guildId: string;
  situation: SituationType;
  messageContent: string;
  urls: string[];
  qrContent?: string | null;
  additionalContext?: string;
}

export interface ScanResult {
  success: boolean;
  response: GeminiResponse;
  retried: boolean;
  error?: string;
}

export function getProvider(): 'gemini' | 'ollama' {
  return config.LLM_PROVIDER;
}

export async function initLLM(): Promise<void> {
  const provider = getProvider();

  if (provider === 'gemini') {
    if (!config.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required when using Gemini provider');
    }
    gemini.initGemini();
    logger.info({ provider: 'gemini', model: config.GEMINI_MODEL }, 'LLM initialized');
  } else {
    logger.info({ provider: 'ollama', model: config.OLLAMA_MODEL, baseUrl: config.OLLAMA_BASE_URL }, 'LLM initialized');
  }
}

export async function testConnection(): Promise<boolean> {
  const provider = getProvider();

  if (provider === 'gemini') {
    return gemini.testConnection();
  } else {
    return ollama.testConnection();
  }
}

export async function scanMessage(request: ScanRequest): Promise<ScanResult> {
  const provider = getProvider();

  if (provider === 'gemini') {
    return gemini.scanMessage(request);
  } else {
    return ollama.scanMessage(request);
  }
}

export { type GeminiResponse } from '../gemini/schemaValidator.js';
