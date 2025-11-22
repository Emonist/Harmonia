const mongo = require('mongoose')

const Schema = new mongo.Schema({
    Guild: String,
    SMember: String,
    SReason: String,
    STime: String
})

module.exports = mongo.model('safk', Schema)
