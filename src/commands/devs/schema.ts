import { Command } from 'yuuko'
import Gamer from '../..'

export default new Command('schema', async message => {
  if (message.author.id !== '130136895395987456') return

  const sortedGuilds = [...Gamer.guilds.values()].sort((a, b) => b.memberCount - a.memberCount)

  let counter = 0
  for (const guild of sortedGuilds) {
    Gamer.helpers.logger.blue(`Starting ${guild.name} with ${guild.memberCount.toLocaleString()}`)
    if (guild.memberCount !== guild.members.size) await guild.fetchAllMembers()
    Gamer.helpers.logger.green(`Finished fetching ${guild.name}`)
    let guildCounter = 0

    await Gamer.helpers.utils.sleep(1)
    for (const member of guild.members.values()) {
      Gamer.database.models.roles
        .findOneAndUpdate(
          { memberID: member.id, guildID: guild.id },
          { memberID: member.id, guildID: guild.id, roleIDs: member.roles },
          { upsert: true }
        )
        .exec()

      if (counter >= 10000) {
        console.log(`Finished ${guildCounter.toLocaleString()} of ${guild.memberCount.toLocaleString()}`)
        await Gamer.helpers.utils.sleep(5)
        counter = 0
      }

      guildCounter++
      counter++
    }

    guild.members.clear()
  }

  return message.channel.createMessage('done updating schema')
})