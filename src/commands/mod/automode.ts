import {
  SlashCommandSubcommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { setAutoModeEnabled, isAutoModeEnabled } from '../../db/repositories/guildConfig.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('cmd:automode');

export const enableData = new SlashCommandSubcommandBuilder()
  .setName('enable')
  .setDescription('Enable automatic moderation actions (use with caution)');

export const disableData = new SlashCommandSubcommandBuilder()
  .setName('disable')
  .setDescription('Disable automatic moderation actions');

export const statusData = new SlashCommandSubcommandBuilder()
  .setName('status')
  .setDescription('Check auto-mode status');

export async function executeEnable(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;

  setAutoModeEnabled(guildId, true);

  logger.info({
    guildId,
    userId: interaction.user.id,
  }, 'Auto-mode enabled');

  await interaction.reply({
    content: `**Warning:** Auto-mode is now **enabled**.\n\nThe bot will automatically take action on high-confidence violations (score >= 80, confidence >= 85%, low false positive risk).\n\nUse with caution. Review logs regularly to ensure accuracy.`,
    ephemeral: true,
  });
}

export async function executeDisable(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;

  setAutoModeEnabled(guildId, false);

  logger.info({
    guildId,
    userId: interaction.user.id,
  }, 'Auto-mode disabled');

  await interaction.reply({
    content: 'Auto-mode is now **disabled**. All moderation actions require manual approval.',
    ephemeral: true,
  });
}

export async function executeStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const enabled = isAutoModeEnabled(guildId);

  await interaction.reply({
    content: `Auto-mode is currently **${enabled ? 'enabled' : 'disabled'}**.`,
    ephemeral: true,
  });
}
