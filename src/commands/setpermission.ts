import { Command } from 'yuuko'
import GamerClient from '../lib/structures/GamerClient'

export default new Command([`setpermission`, `setignore`, `setperm`], async (message, args, context) => {
  if (!message.guildID || !message.member) return

  const Gamer = context.client as GamerClient
  const language = Gamer.getLanguage(message.guildID)
  const helpCommand = Gamer.commandForName('help')
  if (!helpCommand) return

  const guildSettings = await Gamer.database.models.guild.findOne({
    id: message.guildID
  })

  // If the user is not an admin cancel out
  if (!Gamer.helpers.discord.isAdmin(message, guildSettings?.staff.adminRoleID)) return

  const [commandName, type, ...targets] = args
  if (!commandName || !type) return helpCommand.process(message, [`setpermission`], context)

  const ON = language(`common:ON`).toLowerCase()
  const OFF = language(`common:OFF`).toLowerCase()
  const ENABLED = language(`common:ENABLED`).toLowerCase()
  const DISABLED = language(`common:DISABLED`).toLowerCase()

  if (![`on`, `off`, ON, OFF, ENABLED, DISABLED].includes(type.toLowerCase()))
    return helpCommand.process(message, [`setpermission`], context)

  const enable = [`on`, ON, ENABLED].includes(type.toLowerCase())
  const roleID = targets.join(' ')
  const roleIDs = [...message.roleMentions]
  if (!roleIDs.includes(roleID) && message.member.guild.roles.has(roleID)) roleIDs.push(roleID)

  if (commandName.toLowerCase() === 'allcommands') {
    const perms = Gamer.guildCommandPermissions.get(`${message.guildID}.allcommands`)
    if (!perms) {
      if (enable) return message.channel.createMessage(language(`settings/setpermission:ALREADY_ENABLED_ALL_COMMANDS`))

      message.channel.createMessage(language(`settings/setpermission:DISABLED_ALL_COMMANDS`))

      const payload = {
        name: 'allcommands',
        guildID: message.guildID,
        enabled: false,
        exceptionChannelIDs: [],
        exceptionRoleIDs: []
      }

      const newPerms = await Gamer.database.models.command.create(payload)
      return Gamer.guildCommandPermissions.set(`${message.guildID}.allcommands`, newPerms)
    }

    // If there were no target channels or roles provided
    if (!targets.length) {
      if (perms.enabled && enable)
        return message.channel.createMessage(language(`settings/setpermission:ALREADY_ENABLED_ALL_COMMANDS`))
      if (!perms.enabled && !enable)
        return message.channel.createMessage(language(`settings/setpermission:ALREADY_DISABLED_ALL_COMMANDS`))

      perms.enabled = enable
      perms.exceptionChannelIDs = []
      perms.exceptionRoleIDs = []
      perms.save()

      Gamer.guildCommandPermissions.set(`${message.guildID}.allcommands`, perms)
      return message.channel.createMessage(
        language(
          perms.enabled ? `settings/setpermission:ENABLED_ALL_COMMANDS` : `settings/setpermission:DISABLED_ALL_COMMANDS`
        )
      )
    }

    // Some channel or role was provided to be made an exception
    if (message.channelMentions.length) {
      message.channelMentions.forEach(channelID => {
        if (perms.exceptionChannelIDs.includes(channelID))
          perms.exceptionChannelIDs = perms.exceptionChannelIDs.filter(id => id !== channelID)
        else perms.exceptionChannelIDs.push(channelID)
      })
    }

    roleIDs.forEach(ID => {
      if (perms.exceptionRoleIDs.includes(ID)) perms.exceptionRoleIDs.filter(id => id !== ID)
      else perms.exceptionRoleIDs.push(ID)
    })

    perms.save()
    Gamer.guildCommandPermissions.set(`${message.guildID}.allcommands`, perms)
    return message.channel.createMessage(language(`settings/setpermission:COMMAND_UPDATED`))
  }

  // A specific command was provided
  const command = Gamer.commandForName(commandName)
  if (!command) return helpCommand.process(message, [`setpermission`], context)

  const perms = Gamer.guildCommandPermissions.get(`${message.guildID}.${commandName}`)
  if (!perms) {
    if (enable) return message.channel.createMessage(language(`settings/setpermission:ALREADY_ENABLED_COMMAND`))

    // Disable the command fully
    if (!targets.length) {
      message.channel.createMessage(language(`settings/setpermission:COMMAND_UPDATED`))

      const newPerms = await Gamer.database.models.command.create({
        name: command.names[0],
        guildID: message.guildID,
        enabled: false,
        exceptionChannelIDs: [],
        exceptionRoleIDs: []
      })
      return Gamer.guildCommandPermissions.set(`${message.guildID}.${commandName}`, newPerms)
    }
    // Update the targeted channels
    message.channel.createMessage(language(`settings/setpermission:COMMAND_UPDATED`))

    const channelIDs = new Set(message.channelMentions)

    const newPerms = await Gamer.database.models.command.create({
      name: command.names[0],
      guildID: message.guildID,
      enabled: true,
      exceptionChannelIDs: [...channelIDs],
      exceptionRoleIDs: roleIDs
    })

    return Gamer.guildCommandPermissions.set(`${message.guildID}.${command.names[0]}`, newPerms)
  }

  // No targets were made so it affects the whole command
  if (!targets.length) {
    if (perms.enabled && enable)
      return message.channel.createMessage(language(`settings/setpermission:ALREADY_ENABLED_COMMAND`))
    if (!perms.enabled && !enable)
      return message.channel.createMessage(language(`settings/setpermission:ALREADY_DISABLED_COMMAND`))

    // Disable/Enable the whole command
    perms.enabled = enable
    perms.exceptionChannelIDs = []
    perms.exceptionRoleIDs = []
    perms.save()

    return message.channel.createMessage(language(`settings/setpermission:COMMAND_UPDATED`))
  }

  if (!message.channelMentions.length && !roleIDs.length)
    return message.channel.createMessage(language(`settings/setpermission:NO_CHANNELS_ROLES PROVIDED`))

  // Specific channels or roles were targeted
  if (message.channelMentions.length) {
    message.channelMentions.forEach(channelID => {
      if (perms.exceptionChannelIDs.includes(channelID))
        perms.exceptionChannelIDs = perms.exceptionChannelIDs.filter(id => id !== channelID)
      else perms.exceptionChannelIDs.push(channelID)
    })
  }

  if (roleIDs.length) {
    roleIDs.forEach(ID => {
      if (perms.exceptionRoleIDs.includes(ID)) perms.exceptionRoleIDs = perms.exceptionRoleIDs.filter(id => id !== ID)
      else perms.exceptionRoleIDs.push(ID)
    })
  }

  perms.save()
  return message.channel.createMessage(language(`settings/setpermission:COMMAND_UPDATED`))
})
