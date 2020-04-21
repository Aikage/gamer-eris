import { Message, Member, PrivateChannel, Guild, GuildChannel } from 'eris'
import config from '../../../config'
import constants from '../../constants'
import { MessageEmbed } from 'helperis'
import GamerClient from '../structures/GamerClient'
import { GuildSettings } from '../types/settings'
import { highestRole } from 'helperis'

const emojiRegex = /<?(?:(a):)?(\w{2,32}):(\d{17,19})?>?/

export default class {
  embedResponse(message: Message, text: string) {
    const embed = new MessageEmbed()
      .setAuthor(
        `${message.member?.nick || message.author.username}#${message.author.discriminator}`,
        message.author.avatarURL
      )
      .setDescription(text)

    return message.channel.createMessage({ embed: embed.code })
  }

  // Evaluate if the user is a bot owner or a bot mod
  isBotOwnerOrMod(message: Message) {
    const botMods = config.staff.mods
    const botOwners = config.staff.developers

    return botOwners.includes(message.author.id) || botMods.includes(message.author.id)
  }

  // If the roleid is undefined its to also check the admin perm
  isAdmin(message: Message, roleID?: string) {
    return message.member?.permission.has('administrator') || (roleID && message.member?.roles.includes(roleID))
  }

  isModOrAdmin(message: Message, settings: GuildSettings | null) {
    return (
      this.isAdmin(message, settings?.staff.adminRoleID) ||
      Boolean(settings?.staff.modRoleIDs.some(id => message.member?.roles.includes(id)))
    )
  }

  userToChannelName(username: string, discriminator: string) {
    const tag = `${username}#${discriminator}`
    return tag.replace(/^-+|[^\w-]|-+$/g, ``).toLowerCase()
  }

  convertEmoji(
    emoji: string,
    type: `data`
  ): undefined | { animated: string; name: string; id: string; fullCode: string }
  convertEmoji(emoji: string, type: `id` | `reaction`): undefined | string
  convertEmoji(emoji: string, type: `id` | `reaction` | `data`) {
    const validEmoji = emoji.match(emojiRegex)
    if (!validEmoji) return
    validEmoji.shift()
    const [animated, name, id] = validEmoji

    switch (type) {
      case `id`:
        return id ? id : undefined
      case `reaction`:
        return name && id ? `${name}:${id}` : undefined
      case `data`:
        return {
          animated,
          name,
          id,
          fullCode: `<${animated ? `a` : ``}:${name}:${id}>`
        }
      default:
        return emoji
    }
  }

  checkPermissions(channel: GuildChannel | PrivateChannel, userID: string, permissions: string[]) {
    if (channel instanceof PrivateChannel) return true

    const perms = channel.permissionsOf(userID)
    return permissions.every(permission => perms.has(permission))
  }

  idsToUserTag(ids: string[]) {
    return ids.map(id => `<@!${id}>`).join(`, `)
  }

  compareMemberPosition(member: Member, target: Member) {
    const memberHighestRole = highestRole(member)
    const targetHighestRole = highestRole(target)
    return memberHighestRole.position > targetHighestRole.position
  }

  booleanEmoji(enabled: boolean) {
    return enabled ? constants.emojis.greenTick : constants.emojis.redX
  }

  async fetchMember(guild: Guild, id: string) {
    // Dumb ts shit on array destructuring
    if (!id) return

    const userID = id.startsWith('<@') ? id.substring(id.startsWith('<@!') ? 3 : 2, id.length - 1) : id
    const cachedMember = guild.members.get(userID)
    if (cachedMember) return cachedMember

    const member = await guild.shard.client.getRESTGuildMember(guild.id, userID).catch(() => undefined)
    return member
  }

  async fetchUser(Gamer: GamerClient, id: string) {
    // dumb ts shit
    if (!id) return

    const userID = id.startsWith('<@') ? id.substring(id.startsWith('<@!') ? 3 : 2, id.length - 1) : id

    const cachedUser = Gamer.users.get(userID)
    if (cachedUser) return cachedUser

    const user = await Gamer.getRESTUser(userID).catch(() => undefined)
    if (user) Gamer.users.add(user)

    return user
  }
}
