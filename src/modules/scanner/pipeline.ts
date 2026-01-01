import type { Message, GuildMember } from 'discord.js';
import { createChildLogger } from '../../utils/logger.js';
import { isScanEnabled, getLogChannelId } from '../../db/repositories/guildConfig.js';
import { isWhitelisted } from '../../db/repositories/whitelist.js';
import { isMessageProcessed, markMessageProcessed } from './dedupeCache.js';
import { selectSituation, getImageAttachments } from './situationSelector.js';
import { queueScan, type QueuedScanResult } from '../../services/queue/index.js';
import { sanitizeMessageContent, extractUrls } from '../../utils/sanitizer.js';
import { MESSAGE_SNIPPET_MAX_LENGTH } from '../../utils/constants.js';
import { decodeQRFromAttachments } from '../qr/index.js';
import type { ScanRequest } from '../../services/gemini/index.js';

const logger = createChildLogger('scanner');

export interface PipelineResult {
  processed: boolean;
  reason?: string;
  scanResult?: QueuedScanResult;
  qrContent?: string;
}

export async function shouldProcessMessage(message: Message): Promise<{ process: boolean; reason?: string }> {
  if (!message.guild) {
    return { process: false, reason: 'Not in guild' };
  }

  if (message.author.bot) {
    return { process: false, reason: 'Author is bot' };
  }

  if (!isScanEnabled(message.guild.id)) {
    return { process: false, reason: 'Scanning disabled for guild' };
  }

  const logChannelId = getLogChannelId(message.guild.id);
  if (!logChannelId) {
    return { process: false, reason: 'No log channel configured' };
  }

  if (isMessageProcessed(message.id)) {
    return { process: false, reason: 'Message already processed' };
  }

  const member = message.member;
  if (member) {
    const roleIds = member.roles.cache.map((r) => r.id);
    if (isWhitelisted(message.guild.id, message.author.id, roleIds)) {
      return { process: false, reason: 'User or role whitelisted' };
    }
  }

  if (!message.content && message.attachments.size === 0) {
    return { process: false, reason: 'Empty message' };
  }

  return { process: true };
}

export async function processMessage(message: Message): Promise<PipelineResult> {
  const check = await shouldProcessMessage(message);

  if (!check.process) {
    logger.debug({
      messageId: message.id,
      reason: check.reason,
    }, 'Skipping message');

    return {
      processed: false,
      reason: check.reason,
    };
  }

  markMessageProcessed(message.id);

  const guildId = message.guild!.id;

  let qrContent: string | undefined;

  const imageAttachments = getImageAttachments([...message.attachments.values()]);
  if (imageAttachments.length > 0) {
    try {
      const qrResults = await decodeQRFromAttachments(imageAttachments);
      if (qrResults.length > 0) {
        qrContent = qrResults.map((r) => r.content).join('; ');
        logger.debug({ messageId: message.id, qrContent }, 'QR code detected');
      }
    } catch (error) {
      logger.warn({ error, messageId: message.id }, 'QR decode failed');
    }
  }

  const situationContext = selectSituation(message, qrContent);

  const sanitizedContent = sanitizeMessageContent(message.content, MESSAGE_SNIPPET_MAX_LENGTH);
  const urls = extractUrls(message.content);

  const scanRequest: ScanRequest = {
    guildId,
    situation: situationContext.situation,
    messageContent: sanitizedContent,
    urls,
    qrContent: situationContext.qrContent,
  };

  logger.debug({
    messageId: message.id,
    channelId: message.channelId,
    situation: situationContext.situation,
    hasImages: situationContext.hasImages,
    hasQr: situationContext.hasQrContent,
    urlCount: urls.length,
  }, 'Queueing message for scan');

  try {
    const scanResult = await queueScan(scanRequest);

    logger.info({
      messageId: message.id,
      score: scanResult.response.score,
      categories: scanResult.response.categories,
      confidence: scanResult.response.confidence,
      queueTime: scanResult.queueTime,
      processTime: scanResult.processTime,
    }, 'Message scanned');

    return {
      processed: true,
      scanResult,
      qrContent,
    };
  } catch (error) {
    logger.error({ error, messageId: message.id }, 'Failed to scan message');

    return {
      processed: false,
      reason: 'Scan failed',
    };
  }
}
