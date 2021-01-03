const { Client, MessageAttachment } = require("discord.js")
const mongoose = require('mongoose')
const argumentsHandler = require('./argumentsHandler')
const urlRegexSafe = require('url-regex-safe')
require('dotenv').config()

const client = new Client()
client.login(process.env.TOKEN)

try {
    mongoose.connect(process.env.DB_URI, { 
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true
    })
    console.log('connected to database')
} catch (error) {
    console.log('database connection error')
    console.log(error)
}

const GuildInstance = require('./guildModel')

client.on('guildCreate', async guild => {
    try {
        const newGuild = new GuildInstance({
            guildId: guild.id
        })
        const result = await newGuild.save()
        console.log(result)
        console.log('New guild saved')
    } catch (error) {
        console.log(error.message)
    }
})

client.on('message', async (message) => {
    try {
        if (message.author.bot) return

    
        if (message.content.startsWith('!police ')) {
            const getGuildRes = await GuildInstance.findOne({ guildId: message.guild.id })
            if (getGuildRes == null) {
                console.log('Guild not found. Creating one...')
                const newGuild = new GuildInstance({
                    guildId: message.guild.id
                })
                await newGuild.save()
                console.log('Successful!')
            }
    
            const args = message.content.toLowerCase().split(' ')
            args.shift()
            const command = args.shift()
    
            if (command in argumentsHandler) {
                await argumentsHandler[command](client, message, args)
            } else {
                message.channel.send(`Sorry, I don't understand`)
            }
            return
        }

        const currentGuild = await GuildInstance.findOne({ guildId: message.guild.id })
        const activeChannels = currentGuild.channels.map(value => { return value.channelId })

        if (!activeChannels.includes(message.channel.id)) return
        
        const matches = message.content.match(urlRegexSafe())
        if (matches != null) {
            const result = matches.filter(word => !word.includes('tenor'))
            if (result.length === 0) return

            let searchResult = await GuildInstance.findOne({ guildId: message.guild.id, 'members.fullUsername': `${message.author.username}#${message.author.discriminator}` })
            if (searchResult == null) {
                await GuildInstance.updateOne({ guildId: message.guild.id }, { $push: { members: { fullUsername: `${message.author.username}#${message.author.discriminator}`, count: 1 } } })
                await message.channel.send(new MessageAttachment('https://i.kym-cdn.com/entries/icons/facebook/000/033/758/Screen_Shot_2020-04-28_at_12.21.48_PM.jpg'))
                await message.channel.send(`${message.author} is being horny for the first time!`)
            } else {
                const user = searchResult.members.filter(member => member.fullUsername == `${message.author.username}#${message.author.discriminator}` )[0]
                let aggRes = await GuildInstance.aggregate([
                    {
                        $match: { guildId: message.guild.id, 'members._id': user._id }
                    },
                    {
                        $addFields: {
                            index: {
                                $indexOfArray: [ '$members._id', user._id ]
                            }
                        }
                    }
                ])

                let updateRes = await GuildInstance.updateOne({ guildId: message.guild.id }, { $set: { [`members.${aggRes[0].index}.count`]: user.count + 1 } })
                await message.channel.send(new MessageAttachment('https://i.kym-cdn.com/entries/icons/facebook/000/033/758/Screen_Shot_2020-04-28_at_12.21.48_PM.jpg'))
                await message.channel.send(`${message.author} horny count: ${user.count + 1}`)
            }

            return
        }
        
    } catch (error) {
        message.channel.send("I'm having a problem. Please try again!")
        console.log(error)
        return
    }
})