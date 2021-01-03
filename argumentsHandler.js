
const argumentsHandler = {
    channel: async (client, message, args) => {
        try {
            if (args.length < 1) {
                message.channel.send('Channel options: `add #channel`, `remove #channel`, or `show`')
                return
            }

            if (args[0] == 'add' || args[0] == 'remove') {
                if( args.length != 2) {
                    message.channel.send('Please identify a channel like: `!police channel add #general` or `!police channel remove #general`')
                    return
                }
            }

            const guildId = message.guild.id

            const GuildInstance = require('./guildModel')

            if (args[0] == 'add') {
                const channelCheck = args[1].match(/^<#(.*)>$/gm)
                if (channelCheck == null) throw new Error('Please input a channel!')
                const channelId = args[1].substring(2, args[1].length - 1)

                const getGuildRes = await GuildInstance.findOne({ guildId: guildId })
                const guildChannels = getGuildRes.channels.map(value => value.channelId)
                if (guildChannels.includes(channelId)) {
                    message.channel.send(`Already patrolling in that channel!`)
                    return
                }

                const updateResult = await GuildInstance.updateOne({ guildId: guildId }, { $push: { channels: { channelId: channelId } } })
                console.log(`Push success: ${updateResult}`)

                message.channel.send(`Now patrolling in channel ${client.channels.cache.get(channelId)}`)

            } else if (args[0] == 'remove') {
                const channelCheck = args[1].match(/^<#(.*)>$/gm)
                if (channelCheck == null) throw new Error('Please input a channel!')
                const channelId = args[1].substring(2, args[1].length - 1)

                const updateResult = await GuildInstance.updateOne({ guildId: guildId }, { $pull: { channels: { channelId: channelId } } })
                console.log(`Pull success: ${updateResult}`)

                message.channel.send(`Stop patrolling in channel ${client.channels.cache.get(channelId)}`)

            } else if (args[0] == 'show') {
                const getResult = await GuildInstance.findOne({ guildId: guildId })
                const channels = getResult.channels.map(value => { return client.channels.cache.get(value.channelId) })
                message.channel.send(`Patrolling in channels: ${channels == 0 ? 'nothing' : channels}`)

            }

            return
        } catch (error) {
            message.channel.send("I'm having a problem. Please try again!")
            console.log(error)
            return
        }
    },
    rank: async (client, message, args) => {
        try {
            const GuildInstance = require('./guildModel')

            let getResult = await GuildInstance.aggregate([
                {
                    $match: {
                        guildId: message.guild.id
                    }
                },
                {
                    $unwind: '$members'
                },
                {
                    $sort: {
                        'members.count': 1
                    }
                },
                {
                    $limit: 5
                },
                {
                    $project: {
                        member: '$members'
                    }
                }
            ])

            if (getResult.length == 0) {
                message.channel.send("No one is horny here. Keep it up!")
                return
            }

            let parsedResult = [
                { name: 'Name', value: '', inline: true },
                { name: 'Count', value: '', inline: true }
            ]
            getResult.forEach(value => {
                parsedResult[0].value += value.member.fullUsername.split('#')[0] + "\ "
                parsedResult[1].value += value.member.count + "\ "
            })

            parsedResult[0].value.trim()
            parsedResult[1].value.trim()

            message.channel.send({
                embed: {
                    title: 'Top 5 Horny Level',
                    fields: parsedResult
                }
            })

            return
            
        } catch (error) {
            message.channel.send("I'm having a problem. Please try again!")
            console.log(error)
            return
        }
    }
}

module.exports = argumentsHandler