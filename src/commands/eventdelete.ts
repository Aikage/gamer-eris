import { Command } from 'yuuko'
import GamerClient from '../lib/structures/GamerClient'
import { PrivateChannel } from 'eris'
import { GuildSettings } from '../lib/types/settings'
import { GamerEvent } from '../lib/types/gamer'

export default new Command([`eventdelete`, `ed`], async (message, args, context) => {
  if (message.channel instanceof PrivateChannel || !message.member) return

  const Gamer = context.client as GamerClient

  const guildSettings = (await Gamer.database.models.guild.findOne({
    id: message.channel.guild.id
  })) as GuildSettings | null

  if (
    !Gamer.helpers.discord.isModerator(message, guildSettings ? guildSettings.staff.modRoleIDs : []) &&
    !Gamer.helpers.discord.isAdmin(message, guildSettings?.staff.adminRoleID)
  )
    return

  const language = Gamer.i18n.get(guildSettings ? guildSettings.language : `en-US`)
  if (!language) return

  const [number] = args
  const eventID = parseInt(number, 10)
  if (!eventID) return

  // Get the event from this server using the id provided
  const event = (await Gamer.database.models.event.findOne({
    id: eventID,
    guildID: message.channel.guild.id
  })) as GamerEvent | null
  if (!event) return message.channel.createMessage(language(`events/event:INVALID_EVENT`))

  // Delete the event ad as well
  const eventMessage =
    event.adChannelID && event.adMessageID ? await Gamer.getMessage(event.adChannelID, event.adMessageID) : undefined
  if (eventMessage) eventMessage.delete()

  // Delete the event itself from the database
  Gamer.database.models.event.findOneAndDelete({
    id: eventID,
    guildID: message.channel.guild.id
  })
  // Let the user know it was deleted
  return message.channel.createMessage(language(`events/eventdelete:DELETE`, { id: event.id }))
})