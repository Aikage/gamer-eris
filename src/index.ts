import config from '../config'
import GamerClient from './lib/structures/GamerClient'
import { Message, PrivateChannel } from 'eris'
import { GuildSettings } from './lib/types/settings'

const Gamer = new GamerClient({
  token: config.token,
  prefix: config.defaultPrefix,
  maxShards: `auto`,
  ignoreGlobalRequirements: false,
  getAllUsers: true,
  disableEvents: {
    CHANNEL_PINS_UPDATE: true,
    GUILD_UPDATE: true,
    GUILD_INTEGRATIONS_UPDATE: true,
    PRESENCE_UPDATE: true,
    TYPING_START: true,
    USER_UPDATE: true,
    WEBHOOKS_UPDATE: true
  }
})

Gamer.globalCommandRequirements = {
  async custom(message: Message) {
    // DM should have necessary perms already
    if (message.channel instanceof PrivateChannel) return true

    const guildSettings = (await Gamer.database.models.guild.findOne({
      id: message.channel.guild.id
    })) as GuildSettings | null
    const language = Gamer.i18n.get(guildSettings ? guildSettings.language : 'en-US')
    if (!language) return false
    // Check if have send messages perms
    const botPerms = message.channel.permissionsOf(Gamer.user.id)
    if (!botPerms.has('sendMessages')) return false

    // Check if bot has embed links perms
    if (!botPerms.has('embedLinks')) {
      message.channel.createMessage(language(`common:NEED_EMBED_PERMS`))
      return false
    }

    return true
  }
}

Gamer.addCommandDir(`${__dirname}/commands`)
  .addDirectory(`${__dirname}/monitors`)
  .addDirectory(`${__dirname}/events`)
  .connect()

// bind so the `this` is relevent to the event
for (const [name, event] of Gamer.events) Gamer.on(name, event.execute.bind(event))
export default Gamer
