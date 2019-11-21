import { Command } from 'yuuko'
import GamerClient from '../lib/structures/GamerClient'
import { PrivateChannel } from 'eris'
import { GuildSettings } from '../lib/types/settings'

export default new Command([`roletoall`, `oprahrole`], async (message, args, context) => {
  if (message.channel instanceof PrivateChannel || !message.member) return

  const Gamer = context.client as GamerClient

  const botMember = message.channel.guild.members.get(Gamer.user.id)
  if (!botMember || !botMember.permission.has('manageRoles')) return
  if (!message.member.permission.has(`manageRoles`)) return

  const guildSettings = (await Gamer.database.models.guild.findOne({
    id: message.channel.guild.id
  })) as GuildSettings | null

  // If they are using default settings, they won't be vip server
  if (!guildSettings || !guildSettings.vip.isVIP) return

  // If the user does not have a modrole or admin role quit out
  if (!Gamer.helpers.discord.isAdmin(message, guildSettings.staff.adminRoleID)) return

  const language = Gamer.i18n.get(Gamer.guildLanguages.get(message.channel.guild.id) || `en-US`)
  if (!language) return

  const [roleIDOrName] = args
  const role = message.roleMentions.length
    ? message.channel.guild.roles.get(message.roleMentions[0])
    : message.channel.guild.roles.find(
        r => r.id === roleIDOrName || r.name.toLowerCase() === roleIDOrName.toLowerCase()
      )
  if (!role) return message.channel.createMessage(language(`vip/roletoall:NEED_ROLE`))

  const botsHighestRole = Gamer.helpers.discord.highestRole(botMember)
  if (botsHighestRole.position < role.position)
    return message.channel.createMessage(language(`vip/roletoall:BOT_TOO_LOW`))

  const memberHighestRole = Gamer.helpers.discord.highestRole(message.member)
  if (memberHighestRole.position < role.position)
    return message.channel.createMessage(language(`vip/roletoall:USER_TOO_LOW`))

  const REASON = language(`vip/roletoall:REASON`, { user: message.author.username })

  message.channel.createMessage(
    language(`vip/roletoall:PATIENCE`, { amount: message.channel.guild.members.size, mention: message.author.mention })
  )

  // Create a counter that will help us rate limit the amount of members we are editing
  // Otherwise all role commands like .role .mute .verify stuff would not work until this finished
  let counter = 0

  for (const member of message.channel.guild.members.values()) {
    // If the member has the role already skip
    if (message.member.roles.includes(role.id)) continue

    if (counter === 3) {
      // Make the bot wait for 5 seconds
      await Gamer.helpers.utils.sleep(5)
      counter = 0
    }
    member.addRole(role.id, REASON)

    Gamer.amplitude.push({
      authorID: message.author.id,
      channelID: message.channel.id,
      guildID: message.channel.guild.id,
      messageID: message.id,
      timestamp: message.timestamp,
      memberID: member.id,
      type: 'ROLE_ADDED'
    })
  }

  return message.channel.createMessage(language(`vip/vipregister:SUCCESS`, { mention: message.author.mention }))
})