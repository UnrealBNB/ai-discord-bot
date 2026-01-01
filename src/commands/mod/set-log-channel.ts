import {
  SlashCommandSubcommandBuilder,
  type ChatInputCommandInteraction,
  ChannelType,
} from 'discord.js';
import { setLogChannel } from '../../db/repositories/guildConfig.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('cmd:set-log-channel');

export const data = new SlashCommandSubcommandBuilder()
  .setName('set-log-channel')
  .setDescription('Set the channel for moderation logs')
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('The channel to send moderation logs to')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel = interaction.options.getChannel('channel', true);
  const guildId = interaction.guildId!;

  setLogChannel(guildId, channel.id);

  logger.info({
    guildId,
    channelId: channel.id,
    userId: interaction.user.id,
  }, 'Log channel set');

  await interaction.reply({
    content: `Moderation log channel set to <#${channel.id}>.`,
    ephemeral: true,
  });
}
