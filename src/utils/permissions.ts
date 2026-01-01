import {
  GuildMember,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel,
  type NewsChannel,
  type PermissionResolvable,
} from 'discord.js';

export function hasPermission(member: GuildMember, permission: PermissionResolvable): boolean {
  return member.permissions.has(permission);
}

export function isAdmin(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

export function canModerateMembers(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.ModerateMembers);
}

export function canManageMessages(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.ManageMessages);
}

export function canTimeout(member: GuildMember): boolean {
  return canModerateMembers(member);
}

export function canDelete(member: GuildMember): boolean {
  return canManageMessages(member);
}

export async function checkBotPermissions(
  channel: TextChannel | NewsChannel,
  requiredPermissions: PermissionResolvable[],
): Promise<{ hasAll: boolean; missing: string[] }> {
  const me = channel.guild.members.me;
  if (!me) {
    return { hasAll: false, missing: ['Bot not in guild'] };
  }

  const channelPerms = channel.permissionsFor(me);
  if (!channelPerms) {
    return { hasAll: false, missing: ['Cannot determine permissions'] };
  }

  const missing: string[] = [];
  for (const perm of requiredPermissions) {
    if (!channelPerms.has(perm)) {
      missing.push(String(perm));
    }
  }

  return { hasAll: missing.length === 0, missing };
}

export function requireAdmin(interaction: ChatInputCommandInteraction): boolean {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return false;
  }
  return true;
}

export function canTargetMember(actor: GuildMember, target: GuildMember): boolean {
  if (target.id === actor.guild.ownerId) {
    return false;
  }

  if (actor.id === actor.guild.ownerId) {
    return true;
  }

  return actor.roles.highest.position > target.roles.highest.position;
}

export function canBotTargetMember(target: GuildMember): boolean {
  const bot = target.guild.members.me;
  if (!bot) {
    return false;
  }

  if (target.id === target.guild.ownerId) {
    return false;
  }

  return bot.roles.highest.position > target.roles.highest.position;
}
