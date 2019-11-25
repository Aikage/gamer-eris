import { Command } from 'yuuko'
import GamerClient from '../lib/structures/GamerClient'
import { PrivateChannel } from 'eris'
import { GamerEvent } from '../lib/types/gamer'
import GamerEmbed from '../lib/structures/GamerEmbed'

export default new Command([`eventshow`, `es`], async (message, args, context) => {
  if (message.channel instanceof PrivateChannel || !message.member) return
  const Gamer = context.client as GamerClient

  const guildSettings = await Gamer.database.models.guild.findOne({
    id: message.channel.guild.id
  })

  if (
    !Gamer.helpers.discord.isModerator(message, guildSettings ? guildSettings.staff.modRoleIDs : []) &&
    !Gamer.helpers.discord.isAdmin(message, guildSettings?.staff.adminRoleID)
  )
    return

  const language = Gamer.i18n.get(Gamer.guildLanguages.get(message.channel.guild.id) || `en-US`)
  if (!language) return

  const [eventID] = args
  if (!eventID) return message.channel.createMessage(language(`events/events:NEED_EVENT_ID`))

  // Get the event from this server using the id provided
  const event = (await Gamer.database.models.event.findOne({
    id: eventID,
    guildID: message.channel.guild.id
  })) as GamerEvent | null
  if (!event) return message.channel.createMessage(language(`events/events:INVALID_EVENT`))

  const attendees = Gamer.helpers.discord.idsToUserTag(event.attendees)
  const waitingList = Gamer.helpers.discord.idsToUserTag(event.waitingList)
  const denials = Gamer.helpers.discord.idsToUserTag(event.denials)

  const NONE = language(`common:NONE`)

  const embed = new GamerEmbed()
    .setAuthor(message.author.username, message.author.avatarURL)
    .setTitle(event.title)
    .setDescription(event.description)
    // .addField(
    //   language(`events/eventshow:BASIC_EMOJI`),
    //   language(`events/eventshow:BASIC`, {
    //     title: event.title,
    //     tags: event.tags.length ? event.tags.join(`, `) : language('common:NONE')
    //   })
    // )
    .addField(
      language(`events/eventshow:TIME_EMOJI`),
      language(`events/eventshow:TIME`, { duration: Gamer.helpers.transform.humanizeMilliseconds(event.duration) })
    )
    // .addField(language(`events/eventshow:DESC_EMOJI`), event.description)
    .addField(
      language(`events/eventshow:RSVP_EMOJI`),
      language(`events/eventshow:RSVP`, {
        stats: `${event.attendees.length} / ${event.maxAttendees}`,
        attendees: attendees.length ? attendees : NONE,
        waitingList: waitingList.length ? waitingList : NONE,
        denials: denials.length ? denials : NONE
      })
    )
    .addField(
      language(`events/eventshow:GAMING_EMOJI`),
      language(`events/eventshow:GAMING`, { platform: event.platform, game: event.game, activity: event.activity })
    )
    .setFooter(language(`events/eventshow:STARTS_AT`))
    .setTimestamp(event.start)

  return message.channel.createMessage({ embed: embed.code })
})
