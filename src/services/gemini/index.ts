import { GoogleGenerativeAI, type GenerativeModel, type GenerationConfig } from '@google/generative-ai';
import { config } from '../../config.js';
import { SituationType } from '../../utils/constants.js';
import { createChildLogger } from '../../utils/logger.js';
import { getCustomPromptText } from '../../db/repositories/situationPrompts.js';
import { getDefaultPrompt, buildSystemPrompt, FALLBACK_PROMPT, JSON_ENFORCEMENT_SUFFIX } from './prompts.js';
import {
  validateGeminiResponse,
  FAILURE_RESPONSE,
  type GeminiResponse,
  type ValidationResult,
} from './schemaValidator.js';

const logger = createChildLogger('gemini');

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  temperature: 0.1,
  maxOutputTokens: 500,
  responseMimeType: 'application/json',
};

export function initGemini(): void {
  genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({
    model: config.GEMINI_MODEL,
    generationConfig: DEFAULT_GENERATION_CONFIG,
  });
  logger.info({ model: config.GEMINI_MODEL }, 'Gemini client initialized');
}

export function getModel(): GenerativeModel {
  if (!model) {
    throw new Error('Gemini not initialized. Call initGemini() first.');
  }
  return model;
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

async function callGemini(systemPrompt: string, userContent: string): Promise<string> {
  const currentModel = getModel();

  const result = await currentModel.generateContent({
    systemInstruction: systemPrompt,
    contents: [{ role: 'user', parts: [{ text: userContent }] }],
  });

  const response = result.response;
  const text = response.text();

  return text;
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
  }, 'Scanning message with Gemini');

  try {
    const rawText = await callGemini(systemPrompt, userContent);
    const validation = validateGeminiResponse(rawText);

    if (validation.success && validation.data) {
      logger.debug({
        score: validation.data.score,
        categories: validation.data.categories,
        confidence: validation.data.confidence,
      }, 'Gemini scan successful');

      return {
        success: true,
        response: validation.data,
        retried: false,
      };
    }

    logger.warn({ error: validation.error }, 'First Gemini response invalid, retrying with fallback prompt');

    return await retryWithFallback(userContent, validation.error);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Gemini API call failed');

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
    const rawText = await callGemini(fallbackSystemPrompt, userContent);
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
    logger.error({ error: errorMessage }, 'Fallback Gemini call failed');

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
    const currentModel = getModel();
    const result = await currentModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Reply with: {"status":"ok"}' }] }],
    });
    const text = result.response.text();
    return text.includes('ok');
  } catch (error) {
    logger.error({ error }, 'Gemini connection test failed');
    return false;
  }
}

export { type GeminiResponse, type ValidationResult } from './schemaValidator.js';
