import type { Attachment } from 'discord.js';
import { downloadAttachment } from './imageDownloader.js';
import { decodeQRFromBuffer } from './decoder.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('qr');

export interface QRScanResult {
  attachmentId: string;
  found: boolean;
  content?: string;
  error?: string;
}

export async function decodeQRFromAttachment(attachment: Attachment): Promise<QRScanResult> {
  const downloadResult = await downloadAttachment(attachment);

  if (!downloadResult.success || !downloadResult.data) {
    return {
      attachmentId: attachment.id,
      found: false,
      error: downloadResult.error ?? 'Download failed',
    };
  }

  const decodeResult = await decodeQRFromBuffer(downloadResult.data);

  if (!decodeResult.success) {
    return {
      attachmentId: attachment.id,
      found: false,
      error: decodeResult.error,
    };
  }

  return {
    attachmentId: attachment.id,
    found: true,
    content: decodeResult.content,
  };
}

export async function decodeQRFromAttachments(attachments: Attachment[]): Promise<QRScanResult[]> {
  const results = await Promise.all(attachments.map(decodeQRFromAttachment));

  const found = results.filter((r) => r.found);
  if (found.length > 0) {
    logger.info({ count: found.length, total: attachments.length }, 'QR codes found in attachments');
  }

  return results.filter((r) => r.found);
}

export { downloadAttachment, type DownloadResult } from './imageDownloader.js';
export { decodeQRFromBuffer, type QRDecodeResult } from './decoder.js';
