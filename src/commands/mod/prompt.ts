import {
  SlashCommandSubcommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import {
  setSituationPrompt,
  getSituationPrompt,
  deleteSituationPrompt,
  getAllSituationPrompts,
} from '../../db/repositories/situationPrompts.js';
import { SituationType } from '../../utils/constants.js';
import { getDefaultPrompt } from '../../services/gemini/prompts.js';
import { truncateText } from '../../utils/sanitizer.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('cmd:prompt');

const situationChoices = Object.values(SituationType).map((s) => ({ name: s, value: s }));

export const setData = new SlashCommandSubcommandBuilder()
  .setName('set')
  .setDescription('Set a custom prompt for a situation')
  .addStringOption((option) =>
    option
      .setName('situation')
      .setDescription('The situation type')
      .setRequired(true)
      .addChoices(...situationChoices),
  )
  .addStringOption((option) =>
    option
      .setName('prompt')
      .setDescription('The custom prompt text')
      .setRequired(true)
      .setMaxLength(2000),
  );

export const viewData = new SlashCommandSubcommandBuilder()
  .setName('view')
  .setDescription('View the current prompt for a situation')
  .addStringOption((option) =>
    option
      .setName('situation')
      .setDescription('The situation type')
      .setRequired(true)
      .addChoices(...situationChoices),
  );

export const resetData = new SlashCommandSubcommandBuilder()
  .setName('reset')
  .setDescription('Reset a situation prompt to the default')
  .addStringOption((option) =>
    option
      .setName('situation')
      .setDescription('The situation type')
      .setRequired(true)
      .addChoices(...situationChoices),
  );

export const listData = new SlashCommandSubcommandBuilder()
  .setName('list')
  .setDescription('List all situation prompts and their status');

export async function executeSet(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const situation = interaction.options.getString('situation', true) as SituationType;
  const promptText = interaction.options.getString('prompt', true);

  if (promptText.length < 50) {
    await interaction.reply({
      content: 'Prompt is too short. Please provide at least 50 characters.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  setSituationPrompt(guildId, situation, promptText);

  logger.info({
    guildId,
    situation,
    promptLength: promptText.length,
    userId: interaction.user.id,
  }, 'Custom prompt set');

  await interaction.reply({
    content: `Custom prompt for \`${situation}\` has been set.\n\n**Note:** The JSON output enforcement is automatically appended to your prompt.`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function executeView(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const situation = interaction.options.getString('situation', true) as SituationType;

  const customPrompt = getSituationPrompt(guildId, situation);
  const defaultPrompt = getDefaultPrompt(situation);

  const isCustom = !!customPrompt;
  const promptText = customPrompt?.prompt_text ?? defaultPrompt;

  const embed = new EmbedBuilder()
    .setTitle(`Prompt: ${situation}`)
    .setColor(isCustom ? 0x00cc00 : 0x0099ff)
    .setDescription(`\`\`\`\n${truncateText(promptText, 1900)}\n\`\`\``)
    .addFields(
      { name: 'Status', value: isCustom ? 'Custom' : 'Default', inline: true },
      { name: 'Length', value: `${promptText.length} chars`, inline: true },
    );

  if (customPrompt) {
    embed.addFields({
      name: 'Last Updated',
      value: customPrompt.updated_at,
      inline: true,
    });
  }

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}

export async function executeReset(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const situation = interaction.options.getString('situation', true) as SituationType;

  const deleted = deleteSituationPrompt(guildId, situation);

  if (deleted) {
    logger.info({
      guildId,
      situation,
      userId: interaction.user.id,
    }, 'Custom prompt reset');

    await interaction.reply({
      content: `Prompt for \`${situation}\` has been reset to the default.`,
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content: `Prompt for \`${situation}\` is already using the default.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

export async function executeList(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;

  const customPrompts = getAllSituationPrompts(guildId);
  const customSituations = new Set(customPrompts.map((p) => p.situation));

  const allSituations = Object.values(SituationType);

  const statusLines = allSituations.map((situation) => {
    const isCustom = customSituations.has(situation);
    const icon = isCustom ? '(custom)' : '(default)';
    return `- \`${situation}\` ${icon}`;
  });

  const embed = new EmbedBuilder()
    .setTitle('Situation Prompts')
    .setColor(0x0099ff)
    .setDescription(statusLines.join('\n'))
    .addFields({
      name: 'Usage',
      value: 'Use `/mod prompt view <situation>` to see the full prompt text.\nUse `/mod prompt set <situation> <text>` to customize.',
    });

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
