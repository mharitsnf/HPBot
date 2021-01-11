const { Client } = require("discord.js")
const mongoose = require('mongoose')
const checker = require('./checker')
const argumentsHandler = require('./argumentsHandler')
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

client.on('messageUpdate', async (_oldMessage, message) => {
    try {
        await checker(message)
        return
    } catch (error) {
        message.channel.send("I'm having a problem. Please try again!")
        console.log(error)
        return
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
        
        await checker(message)
        return
    } catch (error) {
        message.channel.send("I'm having a problem. Please try again!")
        console.log(error)
        return
    }
})