import { Command } from 'yuuko'
import GamerClient from '../lib/structures/GamerClient'
import { PrivateChannel, GroupChannel } from 'eris'

export default new Command([`eventadd`, `eadd`], async (message, args, context) => {
  if (message.channel instanceof PrivateChannel || message.channel instanceof GroupChannel || !message.member) return

  const Gamer = context.client as GamerClient

  const guildSettings = await Gamer.database.models.guild.findOne({
    id: message.channel.guild.id
  })

  const language = Gamer.i18n.get(Gamer.guildLanguages.get(message.channel.guild.id) || `en-US`)
  if (!language) return

  if (
    !Gamer.helpers.discord.isModerator(message, guildSettings ? guildSettings.staff.modRoleIDs : []) &&
    !Gamer.helpers.discord.isAdmin(message, guildSettings?.staff.adminRoleID)
  )
    return

  const [number, ...roleIDsOrNames] = args
  const eventID = parseInt(number, 10)
  const helpCommand = Gamer.commandForName(`help`)
  if (!helpCommand) return

  if (!eventID) return helpCommand.process(message, [`eventadd`], context)
  // Get the event from this server using the id provided
  const event = await Gamer.database.models.event.findOne({
    id: eventID,
    guildID: message.channel.guild.id
  })
  if (!event) return message.channel.createMessage(language(`events/events:INVALID_EVENT`))

  message.channel.createMessage(language(`events/eventadd:PATIENCE`))

  for (const user of message.mentions) {
    if (event.attendees.includes(user.id)) continue
    const member = message.channel.guild.members.get(user.id)
    if (!member) continue
    if (event.allowedRoleIDs.length && !member.roles.some(roleID => event.allowedRoleIDs.includes(roleID))) continue
    Gamer.helpers.events.joinEvent(event, user.id, language)
  }

  for (const roleIDOrName of [...message.roleMentions, ...roleIDsOrNames]) {
    const role =
      message.channel.guild.roles.get(roleIDOrName) ||
      message.channel.guild.roles.find(r => r.name.toLowerCase() === roleIDOrName.toLowerCase())
    if (!role) continue
    const members = message.channel.guild.members.filter(m => m.roles.includes(role.id))
    for (const member of members) {
      if (event.attendees.includes(member.id)) continue
      if (event.allowedRoleIDs.length && !member.roles.some(roleID => event.allowedRoleIDs.includes(roleID))) continue
      Gamer.helpers.events.joinEvent(event, member.id, language)
    }
  }

  event.save()

  return message.channel.createMessage(language(`events/eventadd:ADDED`, { mention: message.author.mention }))
})
