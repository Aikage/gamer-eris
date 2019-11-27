import { Command } from 'yuuko'
import * as util from 'util'

export default new Command(
  ['debug', `eval`],
  async function debug(message, args, context) {
    const string = args
      .join(' ')
      .replace(/^\s+/, '')
      .replace(/\s*$/, '')

    // Allows use of Gamer in the evals
    const Gamer = context.client
    if (!Gamer) return

    // Eval the things and send the results
    let result
    try {
      result = eval(string)
    } catch (e) {
      result = e
    }
    const response = ['```js', '```']

    // We returned a promise?
    if (result && typeof result.then === 'function') {
      // Sweet. Wait for that to resolve.
      let value
      try {
        value = util.inspect(await result, {
          depth: 1
        })
      } catch (err) {
        value = err
      }
      response.splice(1, 0, value.substring(0, 1985))
    } else {
      response.splice(1, 0, String(result).substring(0, 1985))
    }

    await message.channel.createMessage(response.join('\n'))
  },
  {
    owner: true
  }
)
