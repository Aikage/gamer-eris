import { Command } from 'yuuko'
import GamerClient from '../../lib/structures/GamerClient'
import { MessageEmbed } from 'helperis'

export default new Command(['memberrole', 'mr'], async (message, args, context) => {
  if (!message.guildID || !message.member) return

  const Gamer = context.client as GamerClient
  const roleIDOrName = args.join(' ')
  const [roleID] = message.roleMentions

  // If they are using default settings, they won't be vip server
  if (!Gamer.vipGuildIDs.has(message.member.guild.id)) return

  const role = roleID
    ? message.member.guild.roles.get(roleID)
    : message.member.guild.roles.find(r => r.id === roleIDOrName || r.name.toLowerCase() === roleIDOrName.toLowerCase())
  if (!role) return

  const language = Gamer.getLanguage(message.guildID)

  if (!Gamer.allMembersFetchedGuildIDs.has(message.member.guild.id)) {
    await message.member.guild.fetchAllMembers()
    Gamer.allMembersFetchedGuildIDs.add(message.member.guild.id)
  }

  const members = message.member.guild.members.filter(member => member.roles.includes(role.id))
  const embed = new MessageEmbed()
    .setAuthor(role.name, message.author.avatarURL)
    .addField(language(`vip/memberrole:ROLE_NAME`), role.mention, true)
    .addField(language(`vip/memberrole:ROLE_ID`), role.id, true)
    .addField(language(`vip/memberrole:ROLE_MEMBERS`), members.length.toString(), false)
    .setFooter(language(`vip/memberrole:CREATED_AT`))
    .setTimestamp(role.createdAt)

  message.channel.createMessage({ embed: { ...embed.code, color: role.color } })
})
