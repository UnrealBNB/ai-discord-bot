import type { Message, Attachment } from 'discord.js';
import { SituationType, PolicyType } from '../../utils/constants.js';
import { getChannelPolicies } from '../../db/repositories/channelPolicies.js';
import { extractUrls } from '../../utils/sanitizer.js';

export interface SituationContext {
  situation: SituationType;
  hasImages: boolean;
  hasQrContent: boolean;
  qrContent?: string;
  urls: string[];
  policyType?: PolicyType;
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];

function hasImageAttachments(attachments: Attachment[]): boolean {
  return attachments.some((att) => {
    const name = att.name?.toLowerCase() ?? '';
    return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext)) ||
      att.contentType?.startsWith('image/');
  });
}

function getImageAttachments(attachments: Attachment[]): Attachment[] {
  return attachments.filter((att) => {
    const name = att.name?.toLowerCase() ?? '';
    return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext)) ||
      att.contentType?.startsWith('image/');
  });
}

const SCAM_KEYWORDS = [
  'guaranteed return',
  'double your',
  'click my bio',
  'click my profile',
  'dm me for',
  'free crypto',
  'free nft',
  'airdrop',
  'investment opportunity',
  'make money fast',
  'limited time offer',
  'act now',
  'support team',
  'verify your account',
  'suspended',
  'urgent action required',
];

function hasScamIndicators(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return SCAM_KEYWORDS.some((keyword) => lowerContent.includes(keyword));
}

function hasSuspiciousUrls(urls: string[]): boolean {
  const suspiciousPatterns = [
    /bit\.ly/i,
    /tinyurl/i,
    /t\.co/i,
    /discord\.gift/i,
    /discordapp\.gift/i,
    /steamcommunity\./i,
    /\.tk$/i,
    /\.ml$/i,
    /\.ga$/i,
    /\.cf$/i,
    /\.gq$/i,
  ];

  return urls.some((url) => suspiciousPatterns.some((pattern) => pattern.test(url)));
}

export function selectSituation(
  message: Message,
  qrContent?: string | null,
): SituationContext {
  const guildId = message.guildId;
  const channelId = message.channelId;
  const content = message.content;
  const attachments = [...message.attachments.values()];
  const urls = extractUrls(content);

  const hasImages = hasImageAttachments(attachments);
  const hasQr = !!qrContent;

  if (!guildId) {
    return {
      situation: SituationType.GENERIC_MODERATION,
      hasImages,
      hasQrContent: hasQr,
      qrContent: qrContent ?? undefined,
      urls,
    };
  }

  const policies = getChannelPolicies(guildId, channelId);

  const redPacketPolicy = policies.find((p) => p.policy_type === PolicyType.RED_PACKET);
  if (redPacketPolicy) {
    return {
      situation: SituationType.RED_PACKET_POLICY,
      hasImages,
      hasQrContent: hasQr,
      qrContent: qrContent ?? undefined,
      urls,
      policyType: PolicyType.RED_PACKET,
    };
  }

  if (hasQr) {
    return {
      situation: SituationType.IMAGE_QR,
      hasImages,
      hasQrContent: true,
      qrContent: qrContent ?? undefined,
      urls,
    };
  }

  if (hasScamIndicators(content) || hasSuspiciousUrls(urls)) {
    return {
      situation: SituationType.SCAM_TEXT,
      hasImages,
      hasQrContent: false,
      urls,
    };
  }

  return {
    situation: SituationType.GENERIC_MODERATION,
    hasImages,
    hasQrContent: hasQr,
    qrContent: qrContent ?? undefined,
    urls,
  };
}

export function getSituationForImages(): SituationType {
  return SituationType.IMAGE_QR;
}

export { getImageAttachments };
