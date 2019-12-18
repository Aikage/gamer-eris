import { Command } from 'yuuko'
import { PrivateChannel, GroupChannel } from 'eris'
import GamerClient from '../lib/structures/GamerClient'

interface TagModules {
  aov: string
  [key: string]: string | undefined
}

const modules: TagModules = {
  aov: '293208951473045504'
}

export default new Command([`taginstall`], async (message, args, context) => {
  const Gamer = context.client as GamerClient
  if (message.channel instanceof PrivateChannel || message.channel instanceof GroupChannel) return

  const helpCommand = Gamer.commandForName('help')
  if (!helpCommand) return

  const language = Gamer.i18n.get(Gamer.guildLanguages.get(message.channel.guild.id) || `en-US`)
  if (!language) return

  if (!args.length) return helpCommand.execute(message, [`taginstall`], context)

  const guildSettings =
    (await Gamer.database.models.guild.findOne({
      id: message.channel.guild.id
    })) || (await Gamer.database.models.guild.create({ id: message.channel.guild.id }))

  // If the user is not an admin cancel out
  if (!Gamer.helpers.discord.isAdmin(message, guildSettings.staff.adminRoleID)) return

  // Check the module and convert it to a server id
  const [module] = args
  const serverID = modules[module] || module

  guildSettings.modules.push(serverID)
  guildSettings.save()
  return message.channel.createMessage(language(`tags/taginstall:IMPORTED`))
})