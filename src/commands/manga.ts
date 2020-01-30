import { Command } from 'yuuko'
import GamerClient from '../lib/structures/GamerClient'

export default new Command(`manga`, async (message, args, context) => {
  if (!message.guildID) return

  const Gamer = context.client as GamerClient
  const helpCommand = Gamer.commandForName('help')
  if (!helpCommand) return

  const language = Gamer.getLanguage(message.guildID)
  const guildSettings = await Gamer.database.models.guild.findOne({ id: message.guildID })

  // If the user is not an admin/mod cancel out
  if (
    !Gamer.helpers.discord.isModerator(message, guildSettings?.staff.modRoleIDs) &&
    !Gamer.helpers.discord.isAdmin(message, guildSettings?.staff.adminRoleID)
  )
    return

  const [type, ...fullTitle] = args
  if (!type) return helpCommand.process(message, [`manga`], context)

  const title = fullTitle.join(' ')
  if (type && type.toLowerCase() === `list`) {
    const mangaSubs = await Gamer.database.models.manga.find()

    const list: string[] = []
    mangaSubs.forEach(sub => {
      const listener = sub.subs.find(s => s.guildID === message.guildID)
      if (!listener) return

      list.push(`${sub.title} <#${listener.channelID}>`)
    })

    if (!list.length) return message.channel.createMessage(language(`weeb/manga:NONE`))
    return list.reduce((a, b, index) => {
      const response = `${a}\n${b}`

      if (response.length > 2000) {
        message.channel.createMessage(a)
        return b
      }

      if (index !== list.length - 1) return response

      message.channel.createMessage(response)
      return ``
    })
  }

  // Fetch this manga
  const subscription = await Gamer.database.models.manga.findOne({ title })

  const subPayload = {
    guildID: message.guildID,
    channelID: message.channel.id
  }

  switch (type.toLowerCase()) {
    case `subscribe`:
      // If it does not exist create a new subscription for the user
      if (!subscription) {
        const payload = {
          title,
          subs: [subPayload]
        }

        await Gamer.database.models.manga.create(payload)

        return message.channel.createMessage(
          language(`weeb/manga:SUBSCRIBED`, { title, channel: message.channel.mention })
        )
      }
      // Already has a subscription created
      const exists = subscription.subs.some(sub => sub.channelID === message.channel.id)
      if (exists) return message.channel.createMessage(language(`weeb/manga:ALREADY_SUBBED`, { title }))

      // we only need to add a sub to it
      subscription.subs.push(subPayload)
      subscription.save()

      return message.channel.createMessage(
        language(`weeb/manga:SUBSCRIBED`, { title, channel: message.channel.mention })
      )
    case `unsubscribe`:
      // If the user tries to remove a sub but this manga has no existing subscriptions
      if (!subscription) return message.channel.createMessage(language(`weeb/manga:NOT_SUBSCRIBED`, { title }))

      // If the manga does have a subscription BUT it wasnt subscribed to get alerts in this channel
      const relevantSubscription = subscription.subs.find(sub => sub.channelID === message.channel.id)
      if (!relevantSubscription) return message.channel.createMessage(language(`weeb/manga:NOT_SUBBED`, { title }))

      subscription.subs = subscription.subs.filter(sub => sub.channelID !== message.channel.id)
      subscription.save()

      return message.channel.createMessage(language(`weeb/manga:UNSUBBED`, { title }))
  }
  return helpCommand.process(message, [`manga`], context)
})
