import { config } from '../../config.js';
import { SituationType } from '../../utils/constants.js';
import { createChildLogger } from '../../utils/logger.js';
import { getCustomPromptText } from '../../db/repositories/situationPrompts.js';
import { getDefaultPrompt, buildSystemPrompt, FALLBACK_PROMPT, JSON_ENFORCEMENT_SUFFIX } from '../gemini/prompts.js';
import {
  validateGeminiResponse,
  FAILURE_RESPONSE,
  type GeminiResponse,
} from '../gemini/schemaValidator.js';

const logger = createChildLogger('ollama');

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream: boolean;
  format?: 'json';
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

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

function buildPromptForSituation(guildId: string, situation: SituationType): string {
  const customPrompt = getCustomPromptText(guildId, situation);
  const basePrompt = customPrompt ?? getDefaultPrompt(situation);
  return buildSystemPrompt(basePrompt);
}

function buildUserContent(request: ScanRequest): string {
  const parts: string[] = [];

  parts.push(`MESSAGE: ${request.messageContent}`);

  if (request.urls.length > 0) {
    parts.push(`URLS: ${request.urls.join(', ')}`);
  }

  if (request.qrContent) {
    parts.push(`QR_CONTENT: ${request.qrContent}`);
  }

  if (request.additionalContext) {
    parts.push(`CONTEXT: ${request.additionalContext}`);
  }

  return parts.join('\n');
}

async function callOllama(systemPrompt: string, userContent: string): Promise<string> {
  const url = `${config.OLLAMA_BASE_URL}/api/generate`;

  const request: OllamaGenerateRequest = {
    model: config.OLLAMA_MODEL,
    prompt: userContent,
    system: systemPrompt,
    stream: false,
    format: 'json',
    options: {
      temperature: 0.1,
      num_predict: 500,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as OllamaGenerateResponse;
  return data.response;
}

export async function scanMessage(request: ScanRequest): Promise<ScanResult> {
  const systemPrompt = buildPromptForSituation(request.guildId, request.situation);
  const userContent = buildUserContent(request);

  logger.debug({
    guildId: request.guildId,
    situation: request.situation,
    contentLength: request.messageContent.length,
    urlCount: request.urls.length,
    hasQr: !!request.qrContent,
  }, 'Scanning message with Ollama');

  try {
    const rawText = await callOllama(systemPrompt, userContent);
    const validation = validateGeminiResponse(rawText);

    if (validation.success && validation.data) {
      logger.debug({
        score: validation.data.score,
        categories: validation.data.categories,
        confidence: validation.data.confidence,
      }, 'Ollama scan successful');

      return {
        success: true,
        response: validation.data,
        retried: false,
      };
    }

    logger.warn({ error: validation.error }, 'First Ollama response invalid, retrying with fallback prompt');

    return await retryWithFallback(userContent, validation.error);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Ollama API call failed');

    return {
      success: false,
      response: FAILURE_RESPONSE,
      retried: false,
      error: errorMessage,
    };
  }
}

async function retryWithFallback(userContent: string, originalError?: string): Promise<ScanResult> {
  const fallbackSystemPrompt = FALLBACK_PROMPT + JSON_ENFORCEMENT_SUFFIX;

  try {
    const rawText = await callOllama(fallbackSystemPrompt, userContent);
    const validation = validateGeminiResponse(rawText);

    if (validation.success && validation.data) {
      logger.info('Fallback retry successful');
      return {
        success: true,
        response: validation.data,
        retried: true,
      };
    }

    logger.error({ error: validation.error }, 'Fallback retry also failed validation');

    return {
      success: false,
      response: FAILURE_RESPONSE,
      retried: true,
      error: `Original: ${originalError}; Fallback: ${validation.error}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Fallback Ollama call failed');

    return {
      success: false,
      response: FAILURE_RESPONSE,
      retried: true,
      error: errorMessage,
    };
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const url = `${config.OLLAMA_BASE_URL}/api/tags`;
    const response = await fetch(url);

    if (!response.ok) {
      return false;
    }

    const data = await response.json() as { models: { name: string }[] };
    const hasModel = data.models?.some(m => m.name.startsWith(config.OLLAMA_MODEL.split(':')[0] ?? ''));

    if (!hasModel) {
      logger.warn({ model: config.OLLAMA_MODEL, available: data.models?.map(m => m.name) }, 'Configured model not found');
    }

    return true;
  } catch (error) {
    logger.error({ error }, 'Ollama connection test failed');
    return false;
  }
}

export async function pullModel(): Promise<boolean> {
  try {
    logger.info({ model: config.OLLAMA_MODEL }, 'Pulling Ollama model...');

    const url = `${config.OLLAMA_BASE_URL}/api/pull`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: config.OLLAMA_MODEL, stream: false }),
    });

    if (!response.ok) {
      throw new Error(`Pull failed: ${response.status}`);
    }

    logger.info({ model: config.OLLAMA_MODEL }, 'Model pulled successfully');
    return true;
  } catch (error) {
    logger.error({ error }, 'Failed to pull model');
    return false;
  }
}
