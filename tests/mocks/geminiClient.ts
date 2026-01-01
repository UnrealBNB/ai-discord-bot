import { vi } from 'vitest';
import type { GeminiResponse } from '../../src/services/gemini/schemaValidator.js';
import { ActionType } from '../../src/utils/constants.js';

export const mockGeminiResponses = {
  clean: {
    score: 10,
    categories: ['clean'] as const,
    explanation: 'Message appears to be normal conversation.',
    recommended_action: ActionType.NONE as const,
    confidence: 0.95,
    false_positive_risk: 'low' as const,
    evidence: [],
  } satisfies GeminiResponse,

  lowSeveritySpam: {
    score: 35,
    categories: ['spam'] as const,
    explanation: 'Possible promotional content detected.',
    recommended_action: ActionType.LOG_ONLY as const,
    confidence: 0.6,
    false_positive_risk: 'medium' as const,
    evidence: [
      { type: 'pattern' as const, value: 'check out my' },
    ],
  } satisfies GeminiResponse,

  mediumSeverityPhishing: {
    score: 65,
    categories: ['phishing'] as const,
    explanation: 'Suspicious link detected that may be phishing.',
    recommended_action: ActionType.WARN_DM as const,
    confidence: 0.75,
    false_positive_risk: 'medium' as const,
    evidence: [
      { type: 'url' as const, value: 'https://suspicious-site.example' },
    ],
  } satisfies GeminiResponse,

  highSeverityScam: {
    score: 90,
    categories: ['investment_scam', 'phishing'] as const,
    explanation: 'Clear investment scam with guaranteed returns promise.',
    recommended_action: ActionType.TIMEOUT_AND_DELETE as const,
    confidence: 0.95,
    false_positive_risk: 'low' as const,
    evidence: [
      { type: 'pattern' as const, value: 'guaranteed 100% returns' },
      { type: 'pattern' as const, value: 'act now' },
      { type: 'url' as const, value: 'https://scam-crypto.example' },
    ],
  } satisfies GeminiResponse,

  qrThreat: {
    score: 85,
    categories: ['qr_scam', 'phishing'] as const,
    explanation: 'QR code leads to suspicious cryptocurrency wallet.',
    recommended_action: ActionType.DELETE as const,
    confidence: 0.88,
    false_positive_risk: 'low' as const,
    evidence: [
      { type: 'qr' as const, value: 'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' },
    ],
  } satisfies GeminiResponse,

  redPacketViolation: {
    score: 70,
    categories: ['policy_violation'] as const,
    explanation: 'User mentioned monetary value in red packet channel.',
    recommended_action: ActionType.WARN_DM as const,
    confidence: 0.82,
    false_positive_risk: 'low' as const,
    evidence: [
      { type: 'pattern' as const, value: '$50' },
      { type: 'keyword' as const, value: 'worth' },
    ],
  } satisfies GeminiResponse,
};

export function createMockGeminiClient() {
  return {
    scanMessage: vi.fn().mockResolvedValue({
      success: true,
      response: mockGeminiResponses.clean,
      retried: false,
    }),

    testConnection: vi.fn().mockResolvedValue(true),
  };
}

export function createMockGeminiClientWithResponses(responses: GeminiResponse[]) {
  let callCount = 0;

  return {
    scanMessage: vi.fn().mockImplementation(async () => {
      const response = responses[callCount % responses.length];
      callCount++;
      return {
        success: true,
        response,
        retried: false,
      };
    }),

    testConnection: vi.fn().mockResolvedValue(true),
  };
}

export function createFailingGeminiClient(errorMessage = 'API error') {
  return {
    scanMessage: vi.fn().mockRejectedValue(new Error(errorMessage)),
    testConnection: vi.fn().mockResolvedValue(false),
  };
}

export function createRateLimitedGeminiClient(successAfterAttempts = 2) {
  let attempts = 0;

  return {
    scanMessage: vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < successAfterAttempts) {
        throw new Error('429 Too Many Requests');
      }
      return {
        success: true,
        response: mockGeminiResponses.clean,
        retried: true,
      };
    }),

    testConnection: vi.fn().mockResolvedValue(true),
  };
}
