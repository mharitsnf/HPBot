const mongoose = require('mongoose')

const appealSchema = new mongoose.Schema({
    guildId: String,
    channelId: String,
    messageId: String
})

module.exports = mongoose.model('Appeal', appealSchema)