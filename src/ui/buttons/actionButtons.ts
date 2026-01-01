import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import { ModActionType, BUTTON_CUSTOM_ID_PREFIX } from '../../utils/constants.js';

export interface ActionButtonData {
  action: ModActionType;
  messageId: string;
  channelId: string;
  targetUserId: string;
}

export function encodeButtonCustomId(data: ActionButtonData): string {
  return `${BUTTON_CUSTOM_ID_PREFIX}:${data.action}:${data.messageId}:${data.channelId}:${data.targetUserId}`;
}

export function decodeButtonCustomId(customId: string): ActionButtonData | null {
  const parts = customId.split(':');

  if (parts.length !== 5 || parts[0] !== BUTTON_CUSTOM_ID_PREFIX) {
    return null;
  }

  const [, action, messageId, channelId, targetUserId] = parts;

  if (!action || !messageId || !channelId || !targetUserId) {
    return null;
  }

  if (!Object.values(ModActionType).includes(action as ModActionType)) {
    return null;
  }

  return {
    action: action as ModActionType,
    messageId,
    channelId,
    targetUserId,
  };
}

export function buildActionButtons(
  messageId: string,
  channelId: string,
  targetUserId: string,
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const createButton = (action: ModActionType, label: string, style: ButtonStyle) => {
    return new ButtonBuilder()
      .setCustomId(encodeButtonCustomId({ action, messageId, channelId, targetUserId }))
      .setLabel(label)
      .setStyle(style);
  };

  const row1 = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    createButton(ModActionType.TIMEOUT_10M, 'Timeout 10m', ButtonStyle.Danger),
    createButton(ModActionType.TIMEOUT_1H, 'Timeout 1h', ButtonStyle.Danger),
    createButton(ModActionType.TIMEOUT_24H, 'Timeout 24h', ButtonStyle.Danger),
    createButton(ModActionType.DELETE_MESSAGE, 'Delete', ButtonStyle.Danger),
  );

  const row2 = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    createButton(ModActionType.DM_WARNING, 'DM Warning', ButtonStyle.Secondary),
    createButton(ModActionType.IGNORE, 'Ignore', ButtonStyle.Secondary),
    createButton(ModActionType.MARK_SAFE, 'Mark Safe', ButtonStyle.Success),
  );

  return [row1, row2];
}

export function buildDisabledButtons(
  messageId: string,
  channelId: string,
  targetUserId: string,
  executedAction: ModActionType,
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const createButton = (action: ModActionType, label: string, style: ButtonStyle) => {
    const isExecuted = action === executedAction;
    return new ButtonBuilder()
      .setCustomId(encodeButtonCustomId({ action, messageId, channelId, targetUserId }))
      .setLabel(isExecuted ? `${label} (Done)` : label)
      .setStyle(isExecuted ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(true);
  };

  const row1 = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    createButton(ModActionType.TIMEOUT_10M, 'Timeout 10m', ButtonStyle.Danger),
    createButton(ModActionType.TIMEOUT_1H, 'Timeout 1h', ButtonStyle.Danger),
    createButton(ModActionType.TIMEOUT_24H, 'Timeout 24h', ButtonStyle.Danger),
    createButton(ModActionType.DELETE_MESSAGE, 'Delete', ButtonStyle.Danger),
  );

  const row2 = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    createButton(ModActionType.DM_WARNING, 'DM Warning', ButtonStyle.Secondary),
    createButton(ModActionType.IGNORE, 'Ignore', ButtonStyle.Secondary),
    createButton(ModActionType.MARK_SAFE, 'Mark Safe', ButtonStyle.Success),
  );

  return [row1, row2];
}
