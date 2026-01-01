import {
  EmbedBuilder,
  type Message,
  type ColorResolvable,
} from 'discord.js';
import type { GeminiResponse } from '../../services/gemini/schemaValidator.js';
import { truncateText } from '../../utils/sanitizer.js';
import { EMBED_DESCRIPTION_MAX_LENGTH, EMBED_FIELD_VALUE_MAX_LENGTH } from '../../utils/constants.js';

function getScoreColor(score: number): ColorResolvable {
  if (score >= 80) return 0xff0000;
  if (score >= 60) return 0xff6600;
  if (score >= 40) return 0xffcc00;
  if (score >= 20) return 0x99cc00;
  return 0x00cc00;
}

function formatCategories(categories: string[]): string {
  if (categories.length === 0) return 'None';
  return categories.map((c) => `\`${c}\``).join(', ');
}

function formatEvidence(evidence: GeminiResponse['evidence']): string {
  if (evidence.length === 0) return 'No specific evidence detected';

  const lines = evidence.slice(0, 5).map((e) => {
    const value = truncateText(e.value, 100);
    return `- **${e.type}**: ${value}`;
  });

  if (evidence.length > 5) {
    lines.push(`_...and ${evidence.length - 5} more_`);
  }

  return lines.join('\n');
}

function formatConfidence(confidence: number): string {
  const percentage = Math.round(confidence * 100);
  if (percentage >= 90) return `${percentage}% (Very High)`;
  if (percentage >= 70) return `${percentage}% (High)`;
  if (percentage >= 50) return `${percentage}% (Medium)`;
  if (percentage >= 30) return `${percentage}% (Low)`;
  return `${percentage}% (Very Low)`;
}

export interface ModLogEmbedOptions {
  message: Message;
  scanResult: GeminiResponse;
  qrContent?: string;
  scanFailed?: boolean;
}

export function buildModLogEmbed(options: ModLogEmbedOptions): EmbedBuilder {
  const { message, scanResult, qrContent, scanFailed } = options;

  const messageLink = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`;
  const messageSnippet = truncateText(message.content || '[No text content]', 300);

  const embed = new EmbedBuilder()
    .setColor(scanFailed ? 0x808080 : getScoreColor(scanResult.score))
    .setAuthor({
      name: message.author.tag,
      iconURL: message.author.displayAvatarURL(),
    })
    .setTitle(scanFailed ? 'Scan Failed - Manual Review Required' : `Flagged Content (Score: ${scanResult.score}/100)`)
    .setDescription(truncateText(
      `**Message Preview:**\n${messageSnippet}`,
      EMBED_DESCRIPTION_MAX_LENGTH,
    ))
    .addFields(
      {
        name: 'User',
        value: `<@${message.author.id}>\n(\`${message.author.id}\`)`,
        inline: true,
      },
      {
        name: 'Channel',
        value: `<#${message.channelId}>`,
        inline: true,
      },
      {
        name: 'Message Link',
        value: `[Jump to Message](${messageLink})`,
        inline: true,
      },
    )
    .setTimestamp(message.createdAt)
    .setFooter({ text: `Message ID: ${message.id}` });

  if (!scanFailed) {
    embed.addFields(
      {
        name: 'Categories',
        value: truncateText(formatCategories(scanResult.categories), EMBED_FIELD_VALUE_MAX_LENGTH),
        inline: true,
      },
      {
        name: 'Confidence',
        value: formatConfidence(scanResult.confidence),
        inline: true,
      },
      {
        name: 'False Positive Risk',
        value: scanResult.false_positive_risk.toUpperCase(),
        inline: true,
      },
    );

    embed.addFields({
      name: 'AI Explanation',
      value: truncateText(scanResult.explanation || 'No explanation provided', EMBED_FIELD_VALUE_MAX_LENGTH),
      inline: false,
    });

    if (scanResult.evidence.length > 0) {
      embed.addFields({
        name: 'Evidence',
        value: truncateText(formatEvidence(scanResult.evidence), EMBED_FIELD_VALUE_MAX_LENGTH),
        inline: false,
      });
    }

    embed.addFields({
      name: 'Recommended Action',
      value: `\`${scanResult.recommended_action}\``,
      inline: true,
    });
  }

  if (qrContent) {
    embed.addFields({
      name: 'QR Code Content',
      value: truncateText(`\`\`\`\n${qrContent}\n\`\`\``, EMBED_FIELD_VALUE_MAX_LENGTH),
      inline: false,
    });
  }

  if (message.attachments.size > 0) {
    const attachmentList = [...message.attachments.values()]
      .slice(0, 5)
      .map((a) => `[${a.name || 'attachment'}](${a.url})`)
      .join('\n');

    embed.addFields({
      name: `Attachments (${message.attachments.size})`,
      value: truncateText(attachmentList, EMBED_FIELD_VALUE_MAX_LENGTH),
      inline: false,
    });
  }

  return embed;
}

export function buildActionConfirmEmbed(
  actionType: string,
  targetUser: string,
  actor: string,
  reason?: string,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x00cc00)
    .setTitle('Action Executed')
    .addFields(
      { name: 'Action', value: actionType, inline: true },
      { name: 'Target', value: targetUser, inline: true },
      { name: 'By', value: actor, inline: true },
    )
    .setDescription(reason ? `**Reason:** ${reason}` : null)
    .setTimestamp();
}
