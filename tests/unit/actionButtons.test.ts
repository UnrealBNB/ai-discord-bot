import { describe, it, expect } from 'vitest';
import {
  encodeButtonCustomId,
  decodeButtonCustomId,
  type ActionButtonData,
} from '../../src/ui/buttons/actionButtons.js';
import { ModActionType, BUTTON_CUSTOM_ID_PREFIX } from '../../src/utils/constants.js';

describe('Action Buttons', () => {
  describe('encodeButtonCustomId', () => {
    it('encodes button data correctly', () => {
      const data: ActionButtonData = {
        action: ModActionType.TIMEOUT_10M,
        messageId: '123456789',
        channelId: '987654321',
        targetUserId: '111222333',
      };

      const customId = encodeButtonCustomId(data);

      expect(customId).toBe(`${BUTTON_CUSTOM_ID_PREFIX}:${ModActionType.TIMEOUT_10M}:123456789:987654321:111222333`);
    });

    it('handles all action types', () => {
      const actions = Object.values(ModActionType);

      for (const action of actions) {
        const data: ActionButtonData = {
          action,
          messageId: '123',
          channelId: '456',
          targetUserId: '789',
        };

        const customId = encodeButtonCustomId(data);
        expect(customId).toContain(action);
      }
    });
  });

  describe('decodeButtonCustomId', () => {
    it('decodes valid custom ID correctly', () => {
      const customId = `${BUTTON_CUSTOM_ID_PREFIX}:${ModActionType.DELETE_MESSAGE}:msg123:ch456:user789`;

      const data = decodeButtonCustomId(customId);

      expect(data).not.toBeNull();
      expect(data?.action).toBe(ModActionType.DELETE_MESSAGE);
      expect(data?.messageId).toBe('msg123');
      expect(data?.channelId).toBe('ch456');
      expect(data?.targetUserId).toBe('user789');
    });

    it('returns null for invalid prefix', () => {
      const customId = `invalid_prefix:${ModActionType.DELETE_MESSAGE}:123:456:789`;

      const data = decodeButtonCustomId(customId);

      expect(data).toBeNull();
    });

    it('returns null for missing parts', () => {
      const customId = `${BUTTON_CUSTOM_ID_PREFIX}:${ModActionType.DELETE_MESSAGE}:123`;

      const data = decodeButtonCustomId(customId);

      expect(data).toBeNull();
    });

    it('returns null for invalid action type', () => {
      const customId = `${BUTTON_CUSTOM_ID_PREFIX}:invalid_action:123:456:789`;

      const data = decodeButtonCustomId(customId);

      expect(data).toBeNull();
    });

    it('roundtrips correctly', () => {
      const original: ActionButtonData = {
        action: ModActionType.TIMEOUT_1H,
        messageId: 'msg_abc123',
        channelId: 'ch_def456',
        targetUserId: 'user_ghi789',
      };

      const encoded = encodeButtonCustomId(original);
      const decoded = decodeButtonCustomId(encoded);

      expect(decoded).toEqual(original);
    });
  });
});
