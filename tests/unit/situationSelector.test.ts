import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SituationType, PolicyType } from '../../src/utils/constants.js';

vi.mock('../../src/db/repositories/channelPolicies.js', () => ({
  getChannelPolicies: vi.fn(() => []),
}));

import { selectSituation } from '../../src/modules/scanner/situationSelector.js';
import { getChannelPolicies } from '../../src/db/repositories/channelPolicies.js';

function createMockMessage(content: string, hasImages = false) {
  const attachments = new Map();
  if (hasImages) {
    attachments.set('1', {
      id: '1',
      name: 'image.png',
      contentType: 'image/png',
      size: 1024,
      url: 'https://cdn.discordapp.com/attachments/123/456/image.png',
    });
  }

  return {
    content,
    guildId: '123456789',
    channelId: '987654321',
    attachments,
  } as any;
}

describe('selectSituation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('without QR content', () => {
    it('returns GENERIC_MODERATION for normal messages', () => {
      const message = createMockMessage('Hello, how are you today?');
      const result = selectSituation(message);

      expect(result.situation).toBe(SituationType.GENERIC_MODERATION);
      expect(result.hasImages).toBe(false);
      expect(result.hasQrContent).toBe(false);
    });

    it('returns SCAM_TEXT for messages with scam indicators', () => {
      const scamMessages = [
        'Click my bio for free crypto!',
        'Guaranteed returns on your investment',
        'DM me for free NFT airdrop',
        'Double your money fast with this opportunity',
        'Limited time offer - act now!',
      ];

      for (const content of scamMessages) {
        const message = createMockMessage(content);
        const result = selectSituation(message);
        expect(result.situation).toBe(SituationType.SCAM_TEXT);
      }
    });

    it('returns SCAM_TEXT for messages with suspicious URLs', () => {
      const message = createMockMessage('Check this out: https://bit.ly/scam123');
      const result = selectSituation(message);

      expect(result.situation).toBe(SituationType.SCAM_TEXT);
      expect(result.urls).toContain('https://bit.ly/scam123');
    });

    it('extracts URLs correctly', () => {
      const message = createMockMessage('Visit https://example.com and https://another.org');
      const result = selectSituation(message);

      expect(result.urls).toHaveLength(2);
      expect(result.urls).toContain('https://example.com');
      expect(result.urls).toContain('https://another.org');
    });

    it('detects image attachments', () => {
      const message = createMockMessage('Check this image', true);
      const result = selectSituation(message);

      expect(result.hasImages).toBe(true);
    });
  });

  describe('with QR content', () => {
    it('returns IMAGE_QR when QR content is provided', () => {
      const message = createMockMessage('Here is my code', true);
      const result = selectSituation(message, 'https://phishing.example.com');

      expect(result.situation).toBe(SituationType.IMAGE_QR);
      expect(result.hasQrContent).toBe(true);
      expect(result.qrContent).toBe('https://phishing.example.com');
    });
  });

  describe('with channel policies', () => {
    it('returns RED_PACKET_POLICY when RED_PACKET policy is set', () => {
      vi.mocked(getChannelPolicies).mockReturnValue([
        {
          guild_id: '123456789',
          channel_id: '987654321',
          policy_type: PolicyType.RED_PACKET,
          settings_json: '{}',
          enabled: 1,
          updated_at: '2024-01-01',
        },
      ]);

      const message = createMockMessage('Here is a red packet code');
      const result = selectSituation(message);

      expect(result.situation).toBe(SituationType.RED_PACKET_POLICY);
      expect(result.policyType).toBe(PolicyType.RED_PACKET);
    });

    it('policy takes precedence over scam detection', () => {
      vi.mocked(getChannelPolicies).mockReturnValue([
        {
          guild_id: '123456789',
          channel_id: '987654321',
          policy_type: PolicyType.RED_PACKET,
          settings_json: '{}',
          enabled: 1,
          updated_at: '2024-01-01',
        },
      ]);

      const message = createMockMessage('Click my bio for free money guaranteed returns');
      const result = selectSituation(message);

      expect(result.situation).toBe(SituationType.RED_PACKET_POLICY);
    });
  });

  describe('edge cases', () => {
    it('handles empty message content', () => {
      const message = createMockMessage('');
      const result = selectSituation(message);

      expect(result.situation).toBe(SituationType.GENERIC_MODERATION);
      expect(result.urls).toHaveLength(0);
    });

    it('handles message without guild', () => {
      const message = {
        content: 'Test message',
        guildId: null,
        channelId: '123',
        attachments: new Map(),
      } as any;

      const result = selectSituation(message);
      expect(result.situation).toBe(SituationType.GENERIC_MODERATION);
    });
  });
});
