import { describe, it, expect } from 'vitest';
import {
  validateGeminiResponse,
  GeminiResponseSchema,
  FAILURE_RESPONSE,
  isHighSeverity,
  isMediumSeverity,
  isLowSeverity,
  shouldAutoAct,
} from '../../src/services/gemini/schemaValidator.js';
import { ActionType } from '../../src/utils/constants.js';

describe('GeminiResponseSchema', () => {
  it('should validate a correct response', () => {
    const validResponse = {
      score: 75,
      categories: ['phishing', 'spam'],
      explanation: 'Suspicious link detected',
      recommended_action: 'delete',
      confidence: 0.85,
      false_positive_risk: 'low',
      evidence: [
        { type: 'url', value: 'https://suspicious.example.com' },
      ],
    };

    const result = GeminiResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should reject score outside 0-100 range', () => {
    const invalidResponse = {
      score: 150,
      categories: [],
      explanation: '',
      recommended_action: 'none',
      confidence: 0.5,
      false_positive_risk: 'low',
      evidence: [],
    };

    const result = GeminiResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject invalid category', () => {
    const invalidResponse = {
      score: 50,
      categories: ['invalid_category'],
      explanation: '',
      recommended_action: 'none',
      confidence: 0.5,
      false_positive_risk: 'low',
      evidence: [],
    };

    const result = GeminiResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject invalid recommended_action', () => {
    const invalidResponse = {
      score: 50,
      categories: [],
      explanation: '',
      recommended_action: 'ban',
      confidence: 0.5,
      false_positive_risk: 'low',
      evidence: [],
    };

    const result = GeminiResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject confidence outside 0-1 range', () => {
    const invalidResponse = {
      score: 50,
      categories: [],
      explanation: '',
      recommended_action: 'none',
      confidence: 1.5,
      false_positive_risk: 'low',
      evidence: [],
    };

    const result = GeminiResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });
});

describe('validateGeminiResponse', () => {
  it('should parse valid JSON response', () => {
    const rawJson = JSON.stringify({
      score: 80,
      categories: ['investment_scam'],
      explanation: 'Guaranteed returns promise detected',
      recommended_action: 'timeout',
      confidence: 0.9,
      false_positive_risk: 'low',
      evidence: [{ type: 'pattern', value: 'guaranteed 100% returns' }],
    });

    const result = validateGeminiResponse(rawJson);
    expect(result.success).toBe(true);
    expect(result.data?.score).toBe(80);
  });

  it('should extract JSON from markdown code block', () => {
    const rawWithMarkdown = '```json\n{"score":50,"categories":[],"explanation":"","recommended_action":"none","confidence":0.5,"false_positive_risk":"low","evidence":[]}\n```';

    const result = validateGeminiResponse(rawWithMarkdown);
    expect(result.success).toBe(true);
    expect(result.data?.score).toBe(50);
  });

  it('should extract JSON from text with surrounding content', () => {
    const rawWithText = 'Here is my analysis: {"score":60,"categories":["spam"],"explanation":"test","recommended_action":"log_only","confidence":0.7,"false_positive_risk":"medium","evidence":[]} Hope this helps!';

    const result = validateGeminiResponse(rawWithText);
    expect(result.success).toBe(true);
    expect(result.data?.score).toBe(60);
  });

  it('should return error for invalid JSON', () => {
    const invalidJson = 'This is not JSON at all';

    const result = validateGeminiResponse(invalidJson);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should return error for malformed JSON', () => {
    const malformedJson = '{"score": 50, categories: []}';

    const result = validateGeminiResponse(malformedJson);
    expect(result.success).toBe(false);
  });
});

describe('severity helpers', () => {
  it('isHighSeverity returns true for score >= 70 and confidence >= 0.7', () => {
    expect(isHighSeverity({ ...FAILURE_RESPONSE, score: 70, confidence: 0.7 })).toBe(true);
    expect(isHighSeverity({ ...FAILURE_RESPONSE, score: 90, confidence: 0.9 })).toBe(true);
  });

  it('isHighSeverity returns false for low score or confidence', () => {
    expect(isHighSeverity({ ...FAILURE_RESPONSE, score: 60, confidence: 0.7 })).toBe(false);
    expect(isHighSeverity({ ...FAILURE_RESPONSE, score: 70, confidence: 0.5 })).toBe(false);
  });

  it('isMediumSeverity returns true for appropriate ranges', () => {
    expect(isMediumSeverity({ ...FAILURE_RESPONSE, score: 50, confidence: 0.6 })).toBe(true);
    expect(isMediumSeverity({ ...FAILURE_RESPONSE, score: 65, confidence: 0.5 })).toBe(true);
  });

  it('isLowSeverity returns true for low score or confidence', () => {
    expect(isLowSeverity({ ...FAILURE_RESPONSE, score: 30, confidence: 0.8 })).toBe(true);
    expect(isLowSeverity({ ...FAILURE_RESPONSE, score: 50, confidence: 0.3 })).toBe(true);
  });
});

describe('shouldAutoAct', () => {
  it('returns true when all thresholds met', () => {
    const response = {
      score: 85,
      categories: ['phishing'] as const,
      explanation: 'Clear phishing attempt',
      recommended_action: ActionType.DELETE as const,
      confidence: 0.9,
      false_positive_risk: 'low' as const,
      evidence: [],
    };

    expect(shouldAutoAct(response)).toBe(true);
  });

  it('returns false when score too low', () => {
    const response = {
      score: 75,
      categories: ['phishing'] as const,
      explanation: 'Possible phishing',
      recommended_action: ActionType.DELETE as const,
      confidence: 0.9,
      false_positive_risk: 'low' as const,
      evidence: [],
    };

    expect(shouldAutoAct(response)).toBe(false);
  });

  it('returns false when confidence too low', () => {
    const response = {
      score: 90,
      categories: ['spam'] as const,
      explanation: 'Spam detected',
      recommended_action: ActionType.DELETE as const,
      confidence: 0.7,
      false_positive_risk: 'low' as const,
      evidence: [],
    };

    expect(shouldAutoAct(response)).toBe(false);
  });

  it('returns false when false_positive_risk is not low', () => {
    const response = {
      score: 90,
      categories: ['spam'] as const,
      explanation: 'Spam detected',
      recommended_action: ActionType.DELETE as const,
      confidence: 0.95,
      false_positive_risk: 'medium' as const,
      evidence: [],
    };

    expect(shouldAutoAct(response)).toBe(false);
  });

  it('returns false when recommended_action is none or log_only', () => {
    const response = {
      score: 90,
      categories: ['spam'] as const,
      explanation: 'Spam detected',
      recommended_action: ActionType.LOG_ONLY as const,
      confidence: 0.95,
      false_positive_risk: 'low' as const,
      evidence: [],
    };

    expect(shouldAutoAct(response)).toBe(false);
  });
});
