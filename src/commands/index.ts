import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  MessageFlags,
} from 'discord.js';

import * as setLogChannel from './mod/set-log-channel.js';
import * as scan from './mod/scan.js';
import * as policy from './mod/policy.js';
import * as rules from './mod/rules.js';
import * as whitelist from './mod/whitelist.js';
import * as automode from './mod/automode.js';
import * as prompt from './mod/prompt.js';

import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('commands');

const modCommand = new SlashCommandBuilder()
  .setName('mod')
  .setDescription('Moderation bot configuration commands')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false)
  .addSubcommand(setLogChannel.data)
  .addSubcommandGroup((group) =>
    group
      .setName('scan')
      .setDescription('Manage message scanning')
      .addSubcommand(scan.enableData)
      .addSubcommand(scan.disableData)
      .addSubcommand(scan.statusData),
  )
  .addSubcommandGroup((group) =>
    group
      .setName('policy')
      .setDescription('Manage channel policies')
      .addSubcommand(policy.setData)
      .addSubcommand(policy.removeData)
      .addSubcommand(policy.listData),
  )
  .addSubcommandGroup((group) =>
    group
      .setName('rules')
      .setDescription('Manage moderation rules')
      .addSubcommand(rules.addData)
      .addSubcommand(rules.removeData)
      .addSubcommand(rules.listData),
  )
  .addSubcommandGroup((group) =>
    group
      .setName('whitelist')
      .setDescription('Manage scan whitelist')
      .addSubcommand(whitelist.addData)
      .addSubcommand(whitelist.removeData)
      .addSubcommand(whitelist.listData),
  )
  .addSubcommandGroup((group) =>
    group
      .setName('automode')
      .setDescription('Manage automatic actions')
      .addSubcommand(automode.enableData)
      .addSubcommand(automode.disableData)
      .addSubcommand(automode.statusData),
  )
  .addSubcommandGroup((group) =>
    group
      .setName('prompt')
      .setDescription('Manage situation prompts')
      .addSubcommand(prompt.setData)
      .addSubcommand(prompt.viewData)
      .addSubcommand(prompt.resetData)
      .addSubcommand(prompt.listData),
  );

export function getCommands(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  return [modCommand.toJSON()];
}

export async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const commandName = interaction.commandName;

  if (commandName !== 'mod') {
    logger.warn({ commandName }, 'Unknown command');
    return;
  }

  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand();

  try {
    if (!subcommandGroup) {
      if (subcommand === 'set-log-channel') {
        await setLogChannel.execute(interaction);
      }
      return;
    }

    switch (subcommandGroup) {
      case 'scan':
        switch (subcommand) {
          case 'enable':
            await scan.executeEnable(interaction);
            break;
          case 'disable':
            await scan.executeDisable(interaction);
            break;
          case 'status':
            await scan.executeStatus(interaction);
            break;
        }
        break;

      case 'policy':
        switch (subcommand) {
          case 'set':
            await policy.executeSet(interaction);
            break;
          case 'remove':
            await policy.executeRemove(interaction);
            break;
          case 'list':
            await policy.executeList(interaction);
            break;
        }
        break;

      case 'rules':
        switch (subcommand) {
          case 'add':
            await rules.executeAdd(interaction);
            break;
          case 'remove':
            await rules.executeRemove(interaction);
            break;
          case 'list':
            await rules.executeList(interaction);
            break;
        }
        break;

      case 'whitelist':
        switch (subcommand) {
          case 'add':
            await whitelist.executeAdd(interaction);
            break;
          case 'remove':
            await whitelist.executeRemove(interaction);
            break;
          case 'list':
            await whitelist.executeList(interaction);
            break;
        }
        break;

      case 'automode':
        switch (subcommand) {
          case 'enable':
            await automode.executeEnable(interaction);
            break;
          case 'disable':
            await automode.executeDisable(interaction);
            break;
          case 'status':
            await automode.executeStatus(interaction);
            break;
        }
        break;

      case 'prompt':
        switch (subcommand) {
          case 'set':
            await prompt.executeSet(interaction);
            break;
          case 'view':
            await prompt.executeView(interaction);
            break;
          case 'reset':
            await prompt.executeReset(interaction);
            break;
          case 'list':
            await prompt.executeList(interaction);
            break;
        }
        break;

      default:
        logger.warn({ subcommandGroup, subcommand }, 'Unknown subcommand group');
    }
  } catch (error) {
    logger.error({ error, subcommandGroup, subcommand }, 'Command execution error');

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred while executing this command.',
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.followUp({
        content: 'An error occurred while executing this command.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
