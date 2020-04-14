import { Command } from 'yuuko'
import GamerClient from '../../lib/structures/GamerClient'
import { milliseconds } from '../../lib/types/enums/time'

export default new Command([`eventcreate`, `ec`], async (message, args, context) => {
  if (!message.guildID || !message.member) return

  const Gamer = context.client as GamerClient
  const guildSettings = await Gamer.database.models.guild.findOne({ id: message.guildID })

  if (
    !Gamer.helpers.discord.isModOrAdmin(message, guildSettings) &&
    (!guildSettings?.roleIDs.eventsCreate || !message.member.roles.includes(guildSettings.roleIDs.eventsCreate))
  )
    return

  const [templateName] = args
  // create new event based on input
  const eventID = await Gamer.helpers.events.createNewEvent(message, templateName, guildSettings)
  const language = Gamer.getLanguage(message.guildID)
  if (!eventID) return message.channel.createMessage(language(`events/eventcreate:CREATE_FAILED`))
  // Let the user know it succeeded
  message.channel.createMessage(language(`events/eventcreate:CREATE_SUCCESS`, { number: eventID }))
  // Run the show command for this event so they can see the event details
  const eventshowCommand = Gamer.commandForName(`eventshow`)
  if (!eventshowCommand) return
  eventshowCommand.process(message, [eventID.toString()], context)

  const event = await Gamer.database.models.event.findOne({
    id: eventID,
    guildID: message.guildID
  })
  if (!event) return

  if (!guildSettings?.vip.isVIP) return Gamer.helpers.events.advertiseEvent(event)

  // VIP EVENT CREATE
  Gamer.helpers.events.advertiseEvent(event, message.channel.id)
  return Gamer.collectors.set(message.author.id, {
    authorID: message.author.id,
    channelID: message.channel.id,
    createdAt: Date.now(),
    guildID: message.guildID,
    data: {
      language
    },
    callback: async (msg, collector) => {
      if (!msg.guildID || !msg.member) return

      const CANCEL_OPTIONS = language(`common:CANCEL_OPTIONS`, { returnObjects: true })
      if (CANCEL_OPTIONS.includes(msg.content)) {
        message.channel.createMessage(language(`events/eventcreate:SAVED`, { mention: msg.author.mention }))
        return
      }

      const args = msg.content.split(' ')
      const [type, ...fullValue] = args
      const [value] = fullValue
      const roleID = message.roleMentions.length ? message.roleMentions[0] : value

      let response = `events/eventedit:TITLE_UPDATED`
      switch (type.toLowerCase()) {
        case `title`:
        case `1`:
          event.title = fullValue.join(' ')
          break
        case `description`:
        case `2`:
          event.description = fullValue.join(' ')
          response = `events/eventedit:DESCRIPTION_UPDATED`
          break
        case `platform`:
        case `6`:
          event.platform = fullValue.join(' ')
          response = `events/eventedit:PLATFORM_UPDATED`
          break
        case `game`:
        case `7`:
          event.game = fullValue.join(' ')
          response = `events/eventedit:GAME_UPDATED`
          break
        case `activity`:
        case `8`:
          event.activity = fullValue.join(' ')
          response = `events/eventedit:ACTIVITY_UPDATED`
          break
        case `background`:
          if (!guildSettings?.vip.isVIP) {
            message.channel.createMessage(language(`events/eventedit:VIP_BACKGROUND`))
            return
          }
          event.backgroundURL = value
          response = `events/eventedit:BACKGROUND_UPDATED`
          break
        case `attendees`:
        case `5`:
          const maxAttendees = parseInt(value, 10)
          if (!maxAttendees) return
          while (event.attendees.length < maxAttendees && event.waitingList.length)
            Gamer.helpers.events.transferFromWaitingList(event)
          event.maxAttendees = maxAttendees
          response = `events/eventedit:ATTENDEES_UPDATED`
          break
        case `repeat`:
          event.isRecurring = !event.isRecurring
          response = `events/eventedit:REPEAT_UPDATED`
          break
        case `remove`:
          event.removeRecurringAttendees = !event.removeRecurringAttendees
          response = `events/eventedit:REMOVE_UPDATED`
          break
        case `dm`:
        case `dms`:
        case `9`:
          event.dmReminders = !event.dmReminders
          response = `events/eventedit:DM_UPDATED`
          break
        case `showattendees`:
          event.showAttendees = !event.showAttendees
          response = `events/eventedit:SHOWATTENDEES_UPDATED`
          break
        case `reminder`:
        case `4`:
          const reminder = Gamer.helpers.transform.stringToMilliseconds(value)
          if (!reminder) {
            msg.channel.createMessage(language(`events/eventcreate:INVALID_TIME`, { mention: msg.author.mention }))
            return
          }

          if (event.reminders.includes(reminder)) event.reminders = event.reminders.filter(r => r === reminder)
          else event.reminders.push(reminder)
          response = `events/eventedit:REMINDERS_UPDATED`
          break
        case `frequency`:
          const frequency = Gamer.helpers.transform.stringToMilliseconds(value)
          if (!frequency) {
            msg.channel.createMessage(language(`events/eventcreate:INVALID_TIME`, { mention: msg.author.mention }))
            return
          }

          event.frequency = frequency
          response = `events/eventedit:FREQUENCY_UPDATED`
          break
        case `duration`:
        case `3`:
          const duration = Gamer.helpers.transform.stringToMilliseconds(value)
          if (!duration) {
            msg.channel.createMessage(language(`events/eventcreate:INVALID_TIME`, { mention: msg.author.mention }))
            return
          }

          event.duration = duration
          event.end = event.start + event.duration
          response = `events/eventedit:DURATION_UPDATED`
          break
        case `start`:
        case `12`:
          const start = Gamer.helpers.transform.stringToMilliseconds(value)
          const startTime = new Date(fullValue.join(' ')).getTime()

          if (!start && !startTime) {
            msg.channel.createMessage(language(`events/eventcreate:INVALID_TIME`, { mention: msg.author.mention }))
            return
          }

          event.start = start ? Date.now() + start : startTime
          event.end = event.start + event.duration
          response = `events/eventedit:START_UPDATED`
          break
        case `allowedrole`:
        case `10`:
          const allowedRole =
            msg.member.guild.roles.get(roleID) ||
            msg.member.guild.roles.find(r => r.name.toLowerCase() === fullValue.join(' ').toLowerCase())
          if (!allowedRole) {
            msg.channel.createMessage(language(`events/eventcreate:INVALID_TIME`, { mention: msg.author.mention }))
            return
          }

          if (event.allowedRoleIDs.includes(allowedRole.id))
            event.allowedRoleIDs = event.allowedRoleIDs.filter(id => id !== allowedRole.id)
          else event.allowedRoleIDs.push(allowedRole.id)
          response = `events/eventedit:ALLOWEDROLE_UPDATED`
          break
        case `alertrole`:
        case `11`:
          const roleToAlert =
            msg.member.guild.roles.get(roleID) ||
            msg.member.guild.roles.find(r => r.name.toLowerCase() === fullValue.join(' ').toLowerCase())
          if (!roleToAlert) {
            msg.channel.createMessage(language(`events/eventcreate:INVALID_TIME`, { mention: msg.author.mention }))
            return
          }

          if (event.alertRoleIDs.includes(roleToAlert.id))
            event.alertRoleIDs = event.alertRoleIDs.filter(id => id !== roleToAlert.id)
          else event.alertRoleIDs.push(roleToAlert.id)
          response = `events/eventedit:ALERTROLE_UPDATED`
          break

        case `template`:
          event.templateName = value
          response = `events/eventedit:TEMPLATE_UPDATED`
          break
        default:
          // If they used the command wrong show them the help
          message.channel.createMessage(language(`events/eventcreate:INVALID_EDIT`, { mention: msg.author.mention }))
          return
      }

      // Save any change to the events
      event.save()
      msg.channel
        .createMessage(language(response))
        .then(alert =>
          setTimeout(() => alert.delete(language(`common:CLEAR_SPAM`)).catch(() => undefined), milliseconds.SECOND * 3)
        )
      msg.delete(language(`common:CLEAR_SPAM`)).catch(() => undefined)

      Gamer.helpers.events.advertiseEvent(event)
      collector.createdAt = Date.now()
      Gamer.collectors.set(message.author.id, collector)
    }
  })
})
