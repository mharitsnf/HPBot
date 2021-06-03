const urlRegexSafe = require('url-regex-safe')

const argumentsHandler = {
    channel: async (client, message, args) => {
        try {
            if (args.length < 1) {
                message.channel.send('Channel options: `add #channel`, `remove #channel`, or `show`')
                return
            }

            if (args[0] == 'add' || args[0] == 'remove') {
                if (args.length != 2) {
                    message.channel.send('Please identify a channel like: `!police channel add #general` or `!police channel remove #general`')
                    return
                }
            }

            const guildId = message.guild.id

            const GuildInstance = require('./models/guildModel')

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
            const GuildInstance = require('./models/guildModel')

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
                        'members.count': -1
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

            const finalResult = getResult.map(value => {
                return {
                    name: value.member.fullUsername.split('#')[0],
                    value: `Count: ${value.member.count}, Gay count: ${value.member.gayCount == undefined ? '0' : value.member.gayCount}`
                }
            })

            message.channel.send({
                embed: {
                    title: 'Top 5 Horny Level',
                    fields: finalResult
                }
            })

            return

        } catch (error) {
            message.channel.send("I'm having a problem. Please try again!")
            console.log(error)
            return
        }
    },
    gayalert: async (client, message, args) => {
        try {
            if (!message.reference) {
                await message.channel.send("Please reply to another user's message!")
                return
            }
            const referenceChannel = client.channels.resolve(message.reference.channelID)
            if (!referenceChannel) {
                await message.channel.send("Please reply to another user's message!")
                return
            }
            const refMsg = referenceChannel.messages.resolve(message.reference.messageID)

            const AppealInstance = require('./models/appealModel')
            const GuildInstance = require('./models/guildModel')


            if (refMsg == null) {
                await message.channel.send("Please reply to another user's message!")
                return
            }

            if (refMsg.author.bot) {
                await message.channel.send("Please reply to a message not from a bot!")
                return
            }

            const appealSearch = await AppealInstance.findOne({
                guildId: refMsg.guild.id,
                channelId: refMsg.channel.id,
                messageId: refMsg.id,
            })

            if (appealSearch != null) {
                await message.channel.send("That message has been appealed. Move along.")
                return
            }

            let matches = refMsg.content.match(urlRegexSafe())
            let urlCheck = false
            if (matches != null) {
                const gifFilter = matches.filter(word => !word.includes('tenor'))
                if (gifFilter.length != 0) urlCheck = true
            }

            const condition = refMsg.attachments.size > 0 || urlCheck

            if (!condition) {
                await message.channel.send("The message does not have any image or link. Move along.")
                return
            }

            let rainbowCount = 0
            let crossCount = 0

            const msg = await message.channel.send(`Is the message sent by ${refMsg.author} gay? Vote within ${process.env.VOTE_TIME} minute(s):`)
            await msg.react('🏳️‍🌈')
            await msg.react('❌')

            const filter = (reaction, user) => {
                return ['🏳️‍🌈', '❌'].includes(reaction.emoji.name)
            }

            const newAppeal = new AppealInstance({
                guildId: refMsg.guild.id,
                channelId: refMsg.channel.id,
                messageId: refMsg.id,
            })

            const newAppealResult = await newAppeal.save()

            const collector = msg.createReactionCollector(filter, { time: parseInt(process.env.VOTE_TIME) * 60000 })
            collector.on('collect', (reaction, reactionCollector) => {
                if (reaction.emoji.name === '🏳️‍🌈') {
                    rainbowCount += 1
                } else if (reaction.emoji.name === '❌') {
                    crossCount += 1
                }
            })
            collector.on('end', async (reaction, reactionCollector) => {
                if (rainbowCount > crossCount) {
                    await message.channel.send(`${refMsg.author} is gay. Moving previous ${process.env.GAY_TRANSFER_COUNT} count(s) to gay count.`)

                    let searchResult = await GuildInstance.findOne({ guildId: refMsg.guild.id, 'members.fullUsername': `${refMsg.author.username}#${refMsg.author.discriminator}` })
                    let searchResultId = await GuildInstance.findOne({ guildId: refMsg.guild.id, 'members.memberId': `${refMsg.author.id}` })

                    if (searchResultId) {
                        const user = searchResultId.members.filter(member => member.memberId == `${refMsg.author.id}`)[0]
                        let aggRes = await GuildInstance.aggregate([
                            {
                                $match: { guildId: refMsg.guild.id, 'members._id': user._id }
                            },
                            {
                                $addFields: {
                                    index: {
                                        $indexOfArray: ['$members._id', user._id]
                                    }
                                }
                            }
                        ])

                        let updateData = {
                            $set: {
                                [`members.${aggRes[0].index}.count`]: user.count - parseInt(process.env.GAY_TRANSFER_COUNT)
                            }
                        }
                        if (user.gayCount == undefined) {
                            updateData['$set'][`members.${aggRes[0].index}.gayCount`] = 1
                        } else {
                            updateData['$set'][`members.${aggRes[0].index}.gayCount`] = user.gayCount + parseInt(process.env.GAY_TRANSFER_COUNT)
                        }

                        await GuildInstance.updateOne({ guildId: refMsg.guild.id }, updateData)
                        await message.channel.send(`${refMsg.author} horny count: ${updateData['$set'][`members.${aggRes[0].index}.count`]}, gay count: ${updateData['$set'][`members.${aggRes[0].index}.gayCount`]}`)
                    }
                } else {
                    await message.channel.send(`${refMsg.author} is not gay. Count is not changed.`)
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