const { MessageAttachment } = require("discord.js")
const urlRegexSafe = require('url-regex-safe')
const GuildInstance = require('./models/guildModel')

const checker = async (message) => {
    try {
        let matches = message.content.match(urlRegexSafe())
        let urlCheck = false
        if (matches != null) {
            const gifFilter = matches.filter(word => !word.includes('tenor'))
            if (gifFilter.length != 0) urlCheck = true
        }
        
        const condition = message.attachments.size > 0 || urlCheck

        if (condition) {
            let searchResult = await GuildInstance.findOne({ guildId: message.guild.id, 'members.fullUsername': `${message.author.username}#${message.author.discriminator}` })
            let searchResultId = await GuildInstance.findOne({ guildId: message.guild.id, 'members.memberId': `${message.author.id}` })
            
            // Both results are null: new user
            if (searchResult == null && searchResultId == null) {
                await GuildInstance.updateOne({ guildId: message.guild.id }, { $push: { members: { fullUsername: `${message.author.username}#${message.author.discriminator}`, count: 1, memberId: `${message.author.id}`, gayCount: 0 } } })
                await message.channel.send(new MessageAttachment('https://i.kym-cdn.com/entries/icons/facebook/000/033/758/Screen_Shot_2020-04-28_at_12.21.48_PM.jpg'))
                await message.channel.send(`${message.author} is being horny for the first time!`)    
            }

            // Search result with ID is null: No ID is stored, insert new ID
            else if (searchResult != null && searchResultId == null) {
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

                let updateData = {
                    $set: {
                        [`members.${aggRes[0].index}.count`]: user.count + 1,
                        [`members.${aggRes[0].index}.memberId`]: `${message.author.id}`
                    }
                }
                if (user.gayCount == undefined) {
                    updateData['$set'][`members.${aggRes[0].index}.gayCount`] = 0
                }

                await GuildInstance.updateOne({ guildId: message.guild.id }, updateData)
                await message.channel.send(new MessageAttachment('https://i.kym-cdn.com/entries/icons/facebook/000/033/758/Screen_Shot_2020-04-28_at_12.21.48_PM.jpg'))
                await message.channel.send(`${message.author} horny count: ${user.count + 1}, gay count: ${user.gayCount == undefined ? '0' : user.gayCount}`)
            }
            
            // Search and update by ID
            else {
                console.log(searchResult.members)
                const user = searchResult.members.filter(member => member.memberId == `${message.author.id}`)[0]
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

                let updateData = {
                    $set: {
                        [`members.${aggRes[0].index}.count`]: user.count + 1
                    }
                }
                if (user.gayCount == undefined) {
                    updateData['$set'][`members.${aggRes[0].index}.gayCount`] = 0
                }

                await GuildInstance.updateOne({ guildId: message.guild.id }, updateData)
                await message.channel.send(new MessageAttachment('https://i.kym-cdn.com/entries/icons/facebook/000/033/758/Screen_Shot_2020-04-28_at_12.21.48_PM.jpg'))
                await message.channel.send(`${message.author} horny count: ${user.count + 1}, gay count: ${user.gayCount == undefined ? '0' : user.gayCount}`)
            }
        }

        return
    } catch (error) {
        message.channel.send("I'm having a problem. Please try again!")
        console.log(error)
        return
    }
}

module.exports = checker