import { z } from 'zod';
import { GEMINI_CATEGORIES, EVIDENCE_TYPES, FALSE_POSITIVE_RISK, ActionType } from '../../utils/constants.js';

export const EvidenceSchema = z.object({
  type: z.enum(EVIDENCE_TYPES),
  value: z.string().max(1000),
});

export const GeminiResponseSchema = z.object({
  score: z.number().min(0).max(100),
  categories: z.array(z.enum(GEMINI_CATEGORIES)),
  explanation: z.string().max(500),
  recommended_action: z.enum([
    ActionType.NONE,
    ActionType.LOG_ONLY,
    ActionType.WARN_DM,
    ActionType.DELETE,
    ActionType.TIMEOUT,
    ActionType.TIMEOUT_AND_DELETE,
  ]),
  confidence: z.number().min(0).max(1),
  false_positive_risk: z.enum(FALSE_POSITIVE_RISK),
  evidence: z.array(EvidenceSchema),
});

export type GeminiResponse = z.infer<typeof GeminiResponseSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;

export const FAILURE_RESPONSE: GeminiResponse = {
  score: 0,
  categories: ['spam'],
  explanation: 'AI output validation failed - manual review required',
  recommended_action: ActionType.LOG_ONLY,
  confidence: 0,
  false_positive_risk: 'high',
  evidence: [],
};

export interface ValidationResult {
  success: boolean;
  data?: GeminiResponse;
  error?: string;
  rawText?: string;
}

function extractJsonFromText(text: string): string {
  let cleaned = text.trim();

  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch?.[1]) {
    cleaned = jsonBlockMatch[1].trim();
  }

  const jsonObjectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    cleaned = jsonObjectMatch[0];
  }

  return cleaned;
}

export function validateGeminiResponse(rawText: string): ValidationResult {
  try {
    const cleanedText = extractJsonFromText(rawText);
    const parsed = JSON.parse(cleanedText);
    const validated = GeminiResponseSchema.parse(parsed);

    return {
      success: true,
      data: validated,
      rawText,
    };
  } catch (error) {
    const errorMessage = error instanceof z.ZodError
      ? error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      : error instanceof SyntaxError
        ? `JSON parse error: ${error.message}`
        : 'Unknown validation error';

    return {
      success: false,
      error: errorMessage,
      rawText,
    };
  }
}

export function isHighSeverity(response: GeminiResponse): boolean {
  return response.score >= 70 && response.confidence >= 0.7;
}

export function isMediumSeverity(response: GeminiResponse): boolean {
  return response.score >= 40 && response.score < 70 && response.confidence >= 0.5;
}

export function isLowSeverity(response: GeminiResponse): boolean {
  return response.score < 40 || response.confidence < 0.5;
}

export function shouldAutoAct(response: GeminiResponse): boolean {
  return (
    response.score >= 80 &&
    response.confidence >= 0.85 &&
    response.false_positive_risk === 'low' &&
    response.recommended_action !== ActionType.NONE &&
    response.recommended_action !== ActionType.LOG_ONLY
  );
}
