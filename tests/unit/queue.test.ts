import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/config.js', () => ({
  config: {
    MAX_CONCURRENCY: 2,
    MAX_QUEUE_SIZE: 10,
    GEMINI_API_KEY: 'test-key',
    GEMINI_MODEL: 'gemini-1.5-flash',
  },
}));

vi.mock('../../src/services/gemini/index.js', () => ({
  scanMessage: vi.fn(),
}));

vi.mock('../../src/utils/logger.js', () => ({
  createChildLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { initQueue, getQueue, getQueueStats, queueScan, pauseQueue, resumeQueue, clearQueue } from '../../src/services/queue/index.js';
import { scanMessage } from '../../src/services/gemini/index.js';
import { SituationType } from '../../src/utils/constants.js';
import { FAILURE_RESPONSE } from '../../src/services/gemini/schemaValidator.js';

describe('Queue Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initQueue(2, 10);
  });

  afterEach(async () => {
    await clearQueue();
  });

  describe('initQueue', () => {
    it('initializes queue with correct settings', () => {
      const stats = getQueueStats();
      expect(stats.concurrency).toBe(2);
      expect(stats.size).toBe(0);
      expect(stats.pending).toBe(0);
    });
  });

  describe('getQueueStats', () => {
    it('returns current queue statistics', () => {
      const stats = getQueueStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('concurrency');
      expect(stats).toHaveProperty('isPaused');
    });
  });

  describe('queueScan', () => {
    it('queues and processes a scan request', async () => {
      const mockResponse = {
        score: 50,
        categories: ['spam'] as const,
        explanation: 'Test',
        recommended_action: 'log_only' as const,
        confidence: 0.7,
        false_positive_risk: 'low' as const,
        evidence: [],
      };

      vi.mocked(scanMessage).mockResolvedValue({
        success: true,
        response: mockResponse,
        retried: false,
      });

      const request = {
        guildId: '123',
        situation: SituationType.GENERIC_MODERATION,
        messageContent: 'Test message',
        urls: [],
      };

      const result = await queueScan(request);

      expect(result.success).toBe(true);
      expect(result.response.score).toBe(50);
      expect(result.queueTime).toBeGreaterThanOrEqual(0);
      expect(result.processTime).toBeGreaterThanOrEqual(0);
    });

    it('handles scan failures gracefully', async () => {
      vi.mocked(scanMessage).mockRejectedValue(new Error('API error'));

      const request = {
        guildId: '123',
        situation: SituationType.GENERIC_MODERATION,
        messageContent: 'Test message',
        urls: [],
      };

      const result = await queueScan(request);

      expect(result.success).toBe(false);
      expect(result.response).toEqual(FAILURE_RESPONSE);
    });

    it('processes multiple requests with concurrency limit', async () => {
      let concurrentCount = 0;
      let maxConcurrent = 0;

      vi.mocked(scanMessage).mockImplementation(async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);

        await new Promise((resolve) => setTimeout(resolve, 50));

        concurrentCount--;
        return {
          success: true,
          response: {
            score: 30,
            categories: [],
            explanation: '',
            recommended_action: 'none' as const,
            confidence: 0.5,
            false_positive_risk: 'low' as const,
            evidence: [],
          },
          retried: false,
        };
      });

      const requests = Array(5).fill(null).map(() => ({
        guildId: '123',
        situation: SituationType.GENERIC_MODERATION,
        messageContent: 'Test',
        urls: [],
      }));

      await Promise.all(requests.map((r) => queueScan(r)));

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('pause and resume', () => {
    it('pauses the queue', () => {
      pauseQueue();
      const stats = getQueueStats();
      expect(stats.isPaused).toBe(true);
    });

    it('resumes the queue', () => {
      pauseQueue();
      resumeQueue();
      const stats = getQueueStats();
      expect(stats.isPaused).toBe(false);
    });
  });

  describe('clearQueue', () => {
    it('clears pending items from queue', async () => {
      vi.mocked(scanMessage).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return {
          success: true,
          response: FAILURE_RESPONSE,
          retried: false,
        };
      });

      const request = {
        guildId: '123',
        situation: SituationType.GENERIC_MODERATION,
        messageContent: 'Test',
        urls: [],
      };

      queueScan(request);
      queueScan(request);
      queueScan(request);

      await clearQueue();

      const stats = getQueueStats();
      expect(stats.size).toBe(0);
    });
  });
});
