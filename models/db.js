const Pool = require('pg').Pool
const pool = new Pool({
  user: 'postgres',//你的用戶名
  password: 'vajus',//你的密碼
  host: 'localhost',
  port: 5432,
  database: 'smartmeeting', 
})

module.exports = pool;