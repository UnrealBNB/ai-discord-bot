import {
  SlashCommandSubcommandBuilder,
  type ChatInputCommandInteraction,
  ChannelType,
} from 'discord.js';
import {
  setChannelPolicy,
  removeChannelPolicy,
  getChannelPolicies,
  getAllGuildPolicies,
} from '../../db/repositories/channelPolicies.js';
import { PolicyType } from '../../utils/constants.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('cmd:policy');

const policyChoices = Object.values(PolicyType).map((p) => ({ name: p, value: p }));

export const setData = new SlashCommandSubcommandBuilder()
  .setName('set')
  .setDescription('Set a policy for a channel')
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('The channel to apply the policy to')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('The type of policy')
      .setRequired(true)
      .addChoices(...policyChoices),
  )
  .addStringOption((option) =>
    option
      .setName('options')
      .setDescription('Optional JSON settings for the policy')
      .setRequired(false),
  );

export const removeData = new SlashCommandSubcommandBuilder()
  .setName('remove')
  .setDescription('Remove a policy from a channel')
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('The channel to remove the policy from')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('The type of policy to remove')
      .setRequired(true)
      .addChoices(...policyChoices),
  );

export const listData = new SlashCommandSubcommandBuilder()
  .setName('list')
  .setDescription('List policies')
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('List policies for a specific channel (optional)')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(false),
  );

export async function executeSet(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const channel = interaction.options.getChannel('channel', true);
  const policyType = interaction.options.getString('type', true) as PolicyType;
  const optionsJson = interaction.options.getString('options');

  let settings = {};
  if (optionsJson) {
    try {
      settings = JSON.parse(optionsJson);
    } catch {
      await interaction.reply({
        content: 'Invalid JSON in options. Please provide valid JSON.',
        ephemeral: true,
      });
      return;
    }
  }

  setChannelPolicy(guildId, channel.id, policyType, settings);

  logger.info({
    guildId,
    channelId: channel.id,
    policyType,
    userId: interaction.user.id,
  }, 'Policy set');

  await interaction.reply({
    content: `Policy \`${policyType}\` set for <#${channel.id}>.`,
    ephemeral: true,
  });
}

export async function executeRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const channel = interaction.options.getChannel('channel', true);
  const policyType = interaction.options.getString('type', true) as PolicyType;

  const removed = removeChannelPolicy(guildId, channel.id, policyType);

  if (removed) {
    logger.info({
      guildId,
      channelId: channel.id,
      policyType,
      userId: interaction.user.id,
    }, 'Policy removed');

    await interaction.reply({
      content: `Policy \`${policyType}\` removed from <#${channel.id}>.`,
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: `No policy \`${policyType}\` found for <#${channel.id}>.`,
      ephemeral: true,
    });
  }
}

export async function executeList(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const channel = interaction.options.getChannel('channel');

  let policies;
  let title;

  if (channel) {
    policies = getChannelPolicies(guildId, channel.id);
    title = `Policies for <#${channel.id}>`;
  } else {
    policies = getAllGuildPolicies(guildId);
    title = 'All channel policies';
  }

  if (policies.length === 0) {
    await interaction.reply({
      content: `${title}:\nNo policies configured.`,
      ephemeral: true,
    });
    return;
  }

  const policyList = policies.map((p) => {
    const status = p.enabled ? 'Enabled' : 'Disabled';
    return `- <#${p.channel_id}>: \`${p.policy_type}\` (${status})`;
  }).join('\n');

  await interaction.reply({
    content: `${title}:\n${policyList}`,
    ephemeral: true,
  });
}
