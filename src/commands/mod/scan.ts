import {
  SlashCommandSubcommandGroupBuilder,
  SlashCommandSubcommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { setScanEnabled, isScanEnabled, getLogChannelId } from '../../db/repositories/guildConfig.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('cmd:scan');

export const enableData = new SlashCommandSubcommandBuilder()
  .setName('enable')
  .setDescription('Enable message scanning for this server');

export const disableData = new SlashCommandSubcommandBuilder()
  .setName('disable')
  .setDescription('Disable message scanning for this server');

export const statusData = new SlashCommandSubcommandBuilder()
  .setName('status')
  .setDescription('Check scanning status for this server');

export async function executeEnable(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;

  const logChannelId = getLogChannelId(guildId);
  if (!logChannelId) {
    await interaction.reply({
      content: 'Please set a log channel first using `/mod set-log-channel`.',
      ephemeral: true,
    });
    return;
  }

  setScanEnabled(guildId, true);

  logger.info({
    guildId,
    userId: interaction.user.id,
  }, 'Scanning enabled');

  await interaction.reply({
    content: 'Message scanning is now **enabled** for this server.',
    ephemeral: true,
  });
}

export async function executeDisable(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;

  setScanEnabled(guildId, false);

  logger.info({
    guildId,
    userId: interaction.user.id,
  }, 'Scanning disabled');

  await interaction.reply({
    content: 'Message scanning is now **disabled** for this server.',
    ephemeral: true,
  });
}

export async function executeStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;

  const enabled = isScanEnabled(guildId);
  const logChannelId = getLogChannelId(guildId);

  const status = enabled ? 'Enabled' : 'Disabled';
  const logChannel = logChannelId ? `<#${logChannelId}>` : 'Not set';

  await interaction.reply({
    content: `**Scanning Status**\n- Status: ${status}\n- Log Channel: ${logChannel}`,
    ephemeral: true,
  });
}
