import {
  SlashCommandSubcommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import {
  addWhitelistRole,
  addWhitelistUser,
  removeWhitelistRole,
  removeWhitelistUser,
  getWhitelistedRoles,
  getWhitelistedUsers,
} from '../../db/repositories/whitelist.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('cmd:whitelist');

export const addData = new SlashCommandSubcommandBuilder()
  .setName('add')
  .setDescription('Add a role or user to the whitelist')
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('What to whitelist')
      .setRequired(true)
      .addChoices(
        { name: 'Role', value: 'role' },
        { name: 'User', value: 'user' },
      ),
  )
  .addMentionableOption((option) =>
    option
      .setName('target')
      .setDescription('The role or user to whitelist')
      .setRequired(true),
  );

export const removeData = new SlashCommandSubcommandBuilder()
  .setName('remove')
  .setDescription('Remove a role or user from the whitelist')
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('What to remove')
      .setRequired(true)
      .addChoices(
        { name: 'Role', value: 'role' },
        { name: 'User', value: 'user' },
      ),
  )
  .addMentionableOption((option) =>
    option
      .setName('target')
      .setDescription('The role or user to remove')
      .setRequired(true),
  );

export const listData = new SlashCommandSubcommandBuilder()
  .setName('list')
  .setDescription('List all whitelisted roles and users');

export async function executeAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString('type', true);
  const target = interaction.options.getMentionable('target', true);
  const targetId = 'id' in target ? target.id : (target as any).user?.id;

  if (type === 'role') {
    if (!('color' in target)) {
      await interaction.reply({
        content: 'Please mention a role, not a user.',
        ephemeral: true,
      });
      return;
    }

    const added = addWhitelistRole(guildId, targetId);

    if (added) {
      logger.info({
        guildId,
        roleId: targetId,
        userId: interaction.user.id,
      }, 'Role whitelisted');

      await interaction.reply({
        content: `Role <@&${targetId}> added to whitelist.`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `Role <@&${targetId}> is already whitelisted.`,
        ephemeral: true,
      });
    }
  } else {
    if ('color' in target) {
      await interaction.reply({
        content: 'Please mention a user, not a role.',
        ephemeral: true,
      });
      return;
    }

    const added = addWhitelistUser(guildId, targetId);

    if (added) {
      logger.info({
        guildId,
        targetUserId: targetId,
        userId: interaction.user.id,
      }, 'User whitelisted');

      await interaction.reply({
        content: `User <@${targetId}> added to whitelist.`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `User <@${targetId}> is already whitelisted.`,
        ephemeral: true,
      });
    }
  }
}

export async function executeRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString('type', true);
  const target = interaction.options.getMentionable('target', true);
  const targetId = 'id' in target ? target.id : (target as any).user?.id;

  if (type === 'role') {
    const removed = removeWhitelistRole(guildId, targetId);

    if (removed) {
      logger.info({
        guildId,
        roleId: targetId,
        userId: interaction.user.id,
      }, 'Role removed from whitelist');

      await interaction.reply({
        content: `Role <@&${targetId}> removed from whitelist.`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `Role <@&${targetId}> was not whitelisted.`,
        ephemeral: true,
      });
    }
  } else {
    const removed = removeWhitelistUser(guildId, targetId);

    if (removed) {
      logger.info({
        guildId,
        targetUserId: targetId,
        userId: interaction.user.id,
      }, 'User removed from whitelist');

      await interaction.reply({
        content: `User <@${targetId}> removed from whitelist.`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `User <@${targetId}> was not whitelisted.`,
        ephemeral: true,
      });
    }
  }
}

export async function executeList(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;

  const roles = getWhitelistedRoles(guildId);
  const users = getWhitelistedUsers(guildId);

  if (roles.length === 0 && users.length === 0) {
    await interaction.reply({
      content: 'No roles or users are whitelisted.',
      ephemeral: true,
    });
    return;
  }

  const roleList = roles.length > 0
    ? `**Roles (${roles.length}):**\n${roles.map((r) => `- <@&${r}>`).join('\n')}`
    : 'No roles whitelisted.';

  const userList = users.length > 0
    ? `**Users (${users.length}):**\n${users.map((u) => `- <@${u}>`).join('\n')}`
    : 'No users whitelisted.';

  await interaction.reply({
    content: `**Whitelist**\n\n${roleList}\n\n${userList}`,
    ephemeral: true,
  });
}
