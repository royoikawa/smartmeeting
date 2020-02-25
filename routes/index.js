var express = require('express');
var router = express.Router();
var pool = require('../node-api-postgres/query');

/* GET home page. */

/* 搜尋特定專案 */
// 先判斷是否用搜尋功能，即搜尋框中是否有值，若沒有，執行next()，路由轉移到下面router.get
router.all('/', function(req, res, next) {
  var id = req.body.pro_id;
  if (id == null) { 
    next();
  } else {
    var q = 'SELECT * FROM project WHERE pro_id = $1 ORDER BY pro_id ASC';
    pool.query(q, [id], function(err, results) {
      if (err) throw err;
      var data = results.rows;
      
      res.render('index', { title: 'SmartMeeting', username: '王大明', projectData: data, content:'搜尋結果' });
    })
  }
  
});

/* 顯示所有與使用者有關的專案 */
router.get('/', function(req, res, next) {
  var q = 'SELECT * FROM project ORDER BY pro_id ASC';
  //'SELECT * FROM project, account_project WHERE ap_proid = pro_id AND ap_accid = "Wang@gmail.com" ORDER BY pro_id ASC';
  pool.query(q, function(err, results) { //若有傳回值，傳回值會儲存於「results」參數中
    if (err) throw err;
    var data = results.rows;
    
    res.render('index', { title: 'SmartMeeting', username: '王大明', projectData: data, content: '我的專案' });
  })
});


router.post('/', function(req, res) {
  var pro_name = req.body.pro_name;
  var pro_pw = req.body.pro_pw;
  
  pool.query('INSERT INTO project (pro_name, pro_pw) VALUES ($1, $2)', [pro_name, pro_pw], function(err) {
    if(err) throw err;
    res.redirect('/');
  });
  
});

module.exports = router;