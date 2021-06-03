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
            let searchResult
            try {
                searchResult = await GuildInstance.findOne({ guildId: message.guild.id, 'members.fullUsername': `${message.author.username}#${message.author.discriminator}` })
            } catch (error) {
            }
            let searchResultId = await GuildInstance.findOne({ guildId: message.guild.id, 'members.memberId': `${message.author.id}` })
            console.log(searchResultId)

            if (searchResultId) {
                const user = searchResultId.members.filter(member => member.memberId == `${message.author.id}`)[0]
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
                        [`members.${aggRes[0].index}.count`]: user.count + parseInt(process.env.UPDATE_COUNT)
                    }
                }
                if (user.gayCount == undefined) {
                    updateData['$set'][`members.${aggRes[0].index}.gayCount`] = 0
                }

                await GuildInstance.updateOne({ guildId: message.guild.id }, updateData)
                await message.channel.send(new MessageAttachment('https://i.kym-cdn.com/entries/icons/facebook/000/033/758/Screen_Shot_2020-04-28_at_12.21.48_PM.jpg'))
                await message.channel.send(`${message.author} horny count: ${user.count + parseInt(process.env.UPDATE_COUNT)}, gay count: ${user.gayCount == undefined ? '0' : user.gayCount}`)
            } else {
                await GuildInstance.updateOne({ guildId: message.guild.id }, { $push: { members: { fullUsername: `${message.author.username}#${message.author.discriminator}`, count: 1, memberId: `${message.author.id}`, gayCount: 0 } } })
                await message.channel.send(new MessageAttachment('https://i.kym-cdn.com/entries/icons/facebook/000/033/758/Screen_Shot_2020-04-28_at_12.21.48_PM.jpg'))
                await message.channel.send(`${message.author} is being horny for the first time!`)    
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