import { Command } from 'yuuko'
import GamerClient from '../lib/structures/GamerClient'
import { PrivateChannel } from 'eris'

export default new Command([`networkfollow`, `follow`], async (message, args, context) => {
  const Gamer = context.client as GamerClient
  if (message.channel instanceof PrivateChannel) return

  const language = Gamer.i18n.get(Gamer.guildLanguages.get(message.channel.guild.id) || `en-US`)
  if (!language) return

  const [userID] = args
  const helpCommand = Gamer.commandForName(`help`)
  if (!helpCommand) return

  const user = message.mentions.length ? message.mentions[0] : Gamer.users.get(userID)
  if (!user) return helpCommand.execute(message, [`networkfollow`], context)

  // The command users settings
  const userSettings = await Gamer.database.models.user.findOne({
    userID: message.author.id
  })

  if (!userSettings || !userSettings.network.guildID)
    return message.channel.createMessage(language(`network/networkfollow:NEED_PROFILE_SERVER`))

  const usersProfileGuildSettings = await Gamer.database.models.guild.findOne({
    id: userSettings.network.guildID
  })

  if (!usersProfileGuildSettings)
    return message.channel.createMessage(language(`network/networkfollow:NEED_PROFILE_SERVER`))

  // The target users settings
  const targetUserSettings = await Gamer.database.models.user.findOne({
    userID: message.author.id
  })
  if (!targetUserSettings || !targetUserSettings.network.guildID)
    return message.channel.createMessage(language(`network/networkfollow:NEED_TARGET_PROFILE_SERVER`))

  const targetUsersProfileGuildSettings = await Gamer.database.models.guild.findOne({
    id: targetUserSettings.network.guildID
  })

  if (!targetUsersProfileGuildSettings || !usersProfileGuildSettings.network.channelIDs.feed)
    return message.channel.createMessage(language(`network/networkfollow:NEED_TARGET_PROFILE_SERVER`))

  // Check if the user is already following the user specified in the command
  const isAlreadyFollowing = targetUsersProfileGuildSettings.network.channelIDs.followers.includes(
    usersProfileGuildSettings.network.channelIDs.feed
  )

  // Remove the users feed channel from the targets followers
  if (isAlreadyFollowing)
    targetUsersProfileGuildSettings.network.channelIDs.followers = targetUsersProfileGuildSettings.network.channelIDs.followers.filter(
      id => id !== usersProfileGuildSettings.network.channelIDs.feed
    )
  // Add the users feed channel to the targets followers
  else
    targetUsersProfileGuildSettings.network.channelIDs.followers.push(usersProfileGuildSettings.network.channelIDs.feed)

  targetUsersProfileGuildSettings.save()

  return message.channel.createMessage(
    language(isAlreadyFollowing ? `network/networkfollow:UNFOLLOWED` : `network/networkfollow:FOLLOWED`, {
      user: user.username
    })
  )
})