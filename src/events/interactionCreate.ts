import type { Interaction, ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';
import { handleCommand } from '../commands/index.js';
import { decodeButtonCustomId } from '../ui/buttons/actionButtons.js';
import { executeAction } from '../modules/actions/index.js';
import { BUTTON_CUSTOM_ID_PREFIX } from '../utils/constants.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('interactionCreate');

export async function handleInteractionCreate(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      await handleChatInputCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    }
  } catch (error) {
    logger.error({ error, interactionId: interaction.id }, 'Error handling interaction');

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: 'An error occurred while processing your request.',
          ephemeral: true,
        });
      } catch {
        // Ignore reply errors
      }
    }
  }
}

async function handleChatInputCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  logger.debug({
    command: interaction.commandName,
    subcommand: interaction.options.getSubcommand(false),
    userId: interaction.user.id,
    guildId: interaction.guildId,
  }, 'Slash command received');

  await handleCommand(interaction);
}

async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;

  if (!customId.startsWith(BUTTON_CUSTOM_ID_PREFIX)) {
    return;
  }

  const buttonData = decodeButtonCustomId(customId);

  if (!buttonData) {
    logger.warn({ customId }, 'Invalid button custom ID');
    await interaction.reply({
      content: 'Invalid button data.',
      ephemeral: true,
    });
    return;
  }

  logger.debug({
    action: buttonData.action,
    messageId: buttonData.messageId,
    targetUserId: buttonData.targetUserId,
    actorId: interaction.user.id,
  }, 'Action button clicked');

  await interaction.deferUpdate();

  const result = await executeAction(
    interaction,
    buttonData.action,
    buttonData.messageId,
    buttonData.channelId,
    buttonData.targetUserId,
  );

  if (!result.success) {
    try {
      await interaction.followUp({
        content: `Action failed: ${result.error}`,
        ephemeral: true,
      });
    } catch {
      // Ignore followUp errors
    }
  }
}
