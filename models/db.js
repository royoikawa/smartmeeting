var pg = require("pg")
var connectionString = "pg://root:12345@localhost:5432/smartmeeting"
//pg://你自己的用戶名:你自己的密碼@域名(沒有server所以用localhost):port號(預設5432)/你自己的database name
var client = new pg.Client(connectionString)
client.connect();

module.exports = {
    query: (text, params, callback) => {
        return client.query(text, params, callback)
    }
};