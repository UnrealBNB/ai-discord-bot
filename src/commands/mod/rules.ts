import {
  SlashCommandSubcommandBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import {
  createRule,
  deleteRuleByName,
  getGuildRules,
  getRuleByName,
  validateRegex,
} from '../../db/repositories/rules.js';
import { ActionType } from '../../utils/constants.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('cmd:rules');

const actionChoices = Object.values(ActionType).map((a) => ({ name: a, value: a }));

export const addData = new SlashCommandSubcommandBuilder()
  .setName('add')
  .setDescription('Add a moderation rule')
  .addStringOption((option) =>
    option
      .setName('name')
      .setDescription('Unique name for the rule')
      .setRequired(true)
      .setMaxLength(100),
  )
  .addStringOption((option) =>
    option
      .setName('regex')
      .setDescription('Regex pattern to match')
      .setRequired(true)
      .setMaxLength(500),
  )
  .addIntegerOption((option) =>
    option
      .setName('severity')
      .setDescription('Severity score (0-100)')
      .setRequired(false)
      .setMinValue(0)
      .setMaxValue(100),
  )
  .addStringOption((option) =>
    option
      .setName('action')
      .setDescription('Recommended action')
      .setRequired(false)
      .addChoices(...actionChoices),
  )
  .addStringOption((option) =>
    option
      .setName('description')
      .setDescription('Description of what this rule detects')
      .setRequired(false)
      .setMaxLength(500),
  );

export const removeData = new SlashCommandSubcommandBuilder()
  .setName('remove')
  .setDescription('Remove a moderation rule')
  .addStringOption((option) =>
    option
      .setName('name')
      .setDescription('Name of the rule to remove')
      .setRequired(true)
      .setMaxLength(100),
  );

export const listData = new SlashCommandSubcommandBuilder()
  .setName('list')
  .setDescription('List all moderation rules');

export async function executeAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const name = interaction.options.getString('name', true);
  const regex = interaction.options.getString('regex', true);
  const severity = interaction.options.getInteger('severity') ?? 50;
  const action = interaction.options.getString('action') as ActionType | null;
  const description = interaction.options.getString('description');

  const validation = validateRegex(regex);
  if (!validation.valid) {
    await interaction.reply({
      content: `Invalid regex pattern: ${validation.error}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const existing = getRuleByName(guildId, name);
  if (existing) {
    await interaction.reply({
      content: `A rule with name \`${name}\` already exists.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const id = createRule({
    guildId,
    name,
    regex,
    severity,
    recommendedAction: action ?? ActionType.LOG_ONLY,
    description,
  });

  logger.info({
    guildId,
    ruleId: id,
    name,
    userId: interaction.user.id,
  }, 'Rule created');

  await interaction.reply({
    content: `Rule \`${name}\` created with ID ${id}.`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function executeRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const name = interaction.options.getString('name', true);

  const removed = deleteRuleByName(guildId, name);

  if (removed) {
    logger.info({
      guildId,
      name,
      userId: interaction.user.id,
    }, 'Rule removed');

    await interaction.reply({
      content: `Rule \`${name}\` removed.`,
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content: `No rule found with name \`${name}\`.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

export async function executeList(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const rules = getGuildRules(guildId, false);

  if (rules.length === 0) {
    await interaction.reply({
      content: 'No rules configured.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const ruleList = rules.slice(0, 20).map((r) => {
    const status = r.enabled ? 'Active' : 'Disabled';
    const desc = r.description ? ` - ${r.description.substring(0, 50)}` : '';
    return `- \`${r.name}\` (Severity: ${r.severity}, ${status})${desc}`;
  }).join('\n');

  const footer = rules.length > 20 ? `\n_...and ${rules.length - 20} more_` : '';

  await interaction.reply({
    content: `**Moderation Rules (${rules.length})**\n${ruleList}${footer}`,
    flags: MessageFlags.Ephemeral,
  });
}
