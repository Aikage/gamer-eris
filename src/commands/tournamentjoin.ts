import { Command } from 'yuuko'
import GamerClient from '../lib/structures/GamerClient'
import { PrivateChannel, GroupChannel } from 'eris'
import GamerEmbed from '../lib/structures/GamerEmbed'

export default new Command([`tournamentjoin`, `ej`], async (message, args, context) => {
  if (message.channel instanceof PrivateChannel || message.channel instanceof GroupChannel || !message.member) return

  const Gamer = context.client as GamerClient

  const language = Gamer.i18n.get(Gamer.guildLanguages.get(message.channel.guild.id) || `en-US`)
  if (!language) return

  const [number, teamName] = args
  const tournamentID = parseInt(number, 10)
  const helpCommand = Gamer.commandForName(`help`)
  if (!helpCommand) return

  if (!tournamentID || !teamName) return helpCommand.execute(message, [`tournamentjoin`], context)
  // Get the tournament from this server using the id provided
  const tournament = await Gamer.database.models.tournament.findOne({
    id: tournamentID,
    guildID: message.channel.guild.id
  })
  if (!tournament) return message.channel.createMessage(language(`tournaments/tournaments:INVALID`))

	// If the tournament requires more than 1 player on a team and no users were mentioned
  if (!message.mentions.length && tournament.playersPerTeam > 1)
    return message.channel.createMessage(
      language(`tournaments/tournamentjoin:NEED_PLAYERS`, { needed: tournament.playersPerTeam })
    )

  const playerIDs = message.mentions.map(user => user.id)
  if (!playerIDs.includes(message.author.id)) playerIDs.push(message.author.id)

  for (const userID of playerIDs) {
    const mention = `<@${userID}>`
    // Check if any of the users are already in a team
    if (tournament.teams.find(team => team.userIDs.includes(userID)))
      return message.channel.createMessage(language(`tournaments/tournamentjoin:ALREADY_PLAYING`, { mention }))

    const member = message.channel.guild.members.get(userID)
    if (!member) return message.channel.createMessage(language(`tournaments/tournamentjoin:NOT_MEMBER`, { mention }))

    // Does the user have the roles necessary to join this tournament OR If no roles were set everyone is allowed
    const hasPermission = tournament.allowedRoleIDs.length
      ? member.roles.some(roleID => tournament.allowedRoleIDs.includes(roleID))
      : true

    if (!hasPermission) {
      const embed = new GamerEmbed().setAuthor(message.author.username, message.author.avatarURL).setDescription(
        language(`tournaments/tournamentjoin:MISSING_ALLOWED_ROLES`, {
          roles: tournament.allowedRoleIDs.map(id => `<@&${id}>`).join(', ')
        })
      )
      return message.channel.createMessage({ embed: embed.code })
    }
  }

  tournament.teams.push({
    name: teamName,
    userIDs: playerIDs
  })
  tournament.save()
  return message.channel.createMessage(response)
})