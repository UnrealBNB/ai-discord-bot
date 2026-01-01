import type { Attachment } from 'discord.js';
import { config } from '../../config.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('imageDownloader');

export interface DownloadResult {
  success: boolean;
  data?: Buffer;
  contentType?: string;
  error?: string;
}

export async function downloadAttachment(attachment: Attachment): Promise<DownloadResult> {
  const maxSizeBytes = config.MAX_IMAGE_SIZE_MB * 1024 * 1024;
  const timeoutMs = config.IMAGE_DOWNLOAD_TIMEOUT_MS;

  if (attachment.size > maxSizeBytes) {
    return {
      success: false,
      error: `Attachment too large: ${attachment.size} bytes (max: ${maxSizeBytes})`,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(attachment.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Discord-Moderator-Bot/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();
    const data = Buffer.from(arrayBuffer);

    logger.debug({
      attachmentId: attachment.id,
      size: data.length,
      contentType,
    }, 'Attachment downloaded');

    return {
      success: true,
      data,
      contentType,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: `Download timeout after ${timeoutMs}ms`,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn({ error: errorMessage, attachmentId: attachment.id }, 'Download failed');

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function downloadAttachments(attachments: Attachment[]): Promise<Map<string, DownloadResult>> {
  const results = new Map<string, DownloadResult>();

  const downloads = await Promise.all(
    attachments.map(async (att) => ({
      id: att.id,
      result: await downloadAttachment(att),
    })),
  );

  for (const { id, result } of downloads) {
    results.set(id, result);
  }

  return results;
}
