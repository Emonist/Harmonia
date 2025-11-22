const mongo = require('mongoose')

const Schema = new mongo.Schema({
    Member: String,
    Reason: String,
    Time: String
})

module.exports = mongo.model('afk', Schema)
