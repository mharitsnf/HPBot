const mongoose = require('mongoose')

const guildSchema = new mongoose.Schema({
    guildId: { type: String, unique: true},
    channels:[{ channelId: String }],
    members:[{ fullUsername: String, count: Number, memberId: String }]
})

module.exports = mongoose.model('Guild', guildSchema)