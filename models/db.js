const Pool = require('pg').Pool
const pool = new Pool({
  user: 'root',//你的用戶名
  password: '12345',//你的密碼
  host: 'localhost',
  port: 5432,
  database: 'smartmeeting', 
})

module.exports = pool;