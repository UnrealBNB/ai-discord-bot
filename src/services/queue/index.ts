import PQueue from 'p-queue';
import { config } from '../../config.js';
import { createChildLogger } from '../../utils/logger.js';
import {
  QUEUE_RETRY_ATTEMPTS,
  QUEUE_RETRY_BASE_DELAY_MS,
  QUEUE_RETRY_MAX_DELAY_MS,
} from '../../utils/constants.js';
import { scanMessage, type ScanRequest, type ScanResult } from '../gemini/index.js';
import { FAILURE_RESPONSE } from '../gemini/schemaValidator.js';

const logger = createChildLogger('queue');

let queue: PQueue | null = null;

export interface QueueStats {
  size: number;
  pending: number;
  concurrency: number;
  isPaused: boolean;
}

export interface QueuedScanResult extends ScanResult {
  queueTime: number;
  processTime: number;
}

export function initQueue(concurrency?: number, maxSize?: number): PQueue {
  const actualConcurrency = concurrency ?? config.MAX_CONCURRENCY;
  const actualMaxSize = maxSize ?? config.MAX_QUEUE_SIZE;

  queue = new PQueue({
    concurrency: actualConcurrency,
    throwOnTimeout: true,
  });

  queue.on('active', () => {
    logger.debug({ size: queue?.size, pending: queue?.pending }, 'Queue task started');
  });

  queue.on('idle', () => {
    logger.debug('Queue is idle');
  });

  queue.on('error', (error) => {
    logger.error({ error }, 'Queue task error');
  });

  logger.info({ concurrency: actualConcurrency, maxSize: actualMaxSize }, 'Scan queue initialized');

  return queue;
}

export function getQueue(): PQueue {
  if (!queue) {
    throw new Error('Queue not initialized. Call initQueue() first.');
  }
  return queue;
}

export function getQueueStats(): QueueStats {
  const q = getQueue();
  return {
    size: q.size,
    pending: q.pending,
    concurrency: q.concurrency,
    isPaused: q.isPaused,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number): number {
  const delay = QUEUE_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(delay + jitter, QUEUE_RETRY_MAX_DELAY_MS);
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('429') || message.includes('rate limit')) {
      return true;
    }
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      return true;
    }
    if (message.includes('timeout') || message.includes('network')) {
      return true;
    }
  }
  return false;
}

async function scanWithRetry(request: ScanRequest): Promise<ScanResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < QUEUE_RETRY_ATTEMPTS; attempt++) {
    try {
      const result = await scanMessage(request);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryableError(error)) {
        logger.warn({ error: lastError.message, attempt }, 'Non-retryable error, failing immediately');
        break;
      }

      if (attempt < QUEUE_RETRY_ATTEMPTS - 1) {
        const backoff = calculateBackoff(attempt);
        logger.warn({ error: lastError.message, attempt, backoffMs: backoff }, 'Retryable error, backing off');
        await sleep(backoff);
      }
    }
  }

  logger.error({ error: lastError?.message }, 'All retry attempts exhausted');

  return {
    success: false,
    response: FAILURE_RESPONSE,
    retried: true,
    error: lastError?.message ?? 'Unknown error after retries',
  };
}

export async function queueScan(request: ScanRequest): Promise<QueuedScanResult> {
  const q = getQueue();
  const maxSize = config.MAX_QUEUE_SIZE;

  if (q.size >= maxSize) {
    logger.warn({ size: q.size, maxSize }, 'Queue full, rejecting scan request');
    return {
      success: false,
      response: FAILURE_RESPONSE,
      retried: false,
      error: 'Queue is full',
      queueTime: 0,
      processTime: 0,
    };
  }

  const queueStartTime = Date.now();

  const result = await q.add(async () => {
    const processStartTime = Date.now();
    const queueTime = processStartTime - queueStartTime;

    const scanResult = await scanWithRetry(request);

    const processTime = Date.now() - processStartTime;

    return {
      ...scanResult,
      queueTime,
      processTime,
    };
  });

  if (!result) {
    return {
      success: false,
      response: FAILURE_RESPONSE,
      retried: false,
      error: 'Queue returned undefined result',
      queueTime: Date.now() - queueStartTime,
      processTime: 0,
    };
  }

  logger.debug({
    success: result.success,
    queueTime: result.queueTime,
    processTime: result.processTime,
    retried: result.retried,
  }, 'Scan completed');

  return result;
}

export function pauseQueue(): void {
  getQueue().pause();
  logger.info('Queue paused');
}

export function resumeQueue(): void {
  getQueue().start();
  logger.info('Queue resumed');
}

export async function clearQueue(): Promise<void> {
  getQueue().clear();
  logger.info('Queue cleared');
}

export async function drainQueue(): Promise<void> {
  await getQueue().onIdle();
  logger.info('Queue drained');
}
