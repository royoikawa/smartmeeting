var pg = require("pg")
var connectionString = "pg://postgres:vajus@localhost:5432/smartmeeting"
var client = new pg.Client(connectionString)
client.connect();

module.exports = {
    query: (text, params, callback) => {
        return client.query(text, params, callback)
    }
};