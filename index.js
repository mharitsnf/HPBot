const {Client} = require("discord.js")
const urlRegexSafe = require('url-regex-safe')
require('dotenv').config()
const client = new Client()

client.login(process.env.TOKEN)

const messages = [
    'stop being horny',
    'go to horny jail',
    'HORNY POLICE OPEN UP',
    'stop horny or else',
    '*loads shotgun*'
]

client.on('message', (message) => {
    if (message.author.bot) return
    
    const matches = message.content.match(urlRegexSafe())
    if (matches != null) {
        const result = matches.filter(word => !word.includes('tenor'))
        if (result.length === 0) return
        message.channel.send(messages[Math.floor(Math.random() * messages.length)], { files: ['https://i.kym-cdn.com/entries/icons/facebook/000/033/758/Screen_Shot_2020-04-28_at_12.21.48_PM.jpg'] })
    }
})