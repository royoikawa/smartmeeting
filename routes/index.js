var express = require('express');
var router = express.Router();
var pool = require('../models/db');

/* GET home page. */

/* 搜尋特定專案 */

// 先判斷是否用搜尋功能，即搜尋框中是否有值，若沒有，執行next()，路由轉移到下面router.get
// 若搜尋框有值，else if 判斷是否為大於等於1 的數字
// 若不符合 else 直接回傳空的資料
router.all('/', function(req, res, next) {
  if(!req.session.userAccount){//若沒登入，跳到登入頁
    res.redirect('/login');
  }
  var id = req.body.pro_id;
  if (id == null) { 
    next();
  } else if (id != "" && !isNaN(id) && Number.isInteger(parseFloat(id)) && parseInt(id) >= 1) {

    // 顯示搜尋結果，並顯示使用者身分
    // 先判斷是否在該專案中，利用 EXISTS語法 得到一欄位exist，欄位值為 true(有在該專案) 或 false(沒有在該專案)
    var q = 'SELECT EXISTS (SELECT * FROM project, account_project WHERE ap_proid = pro_id AND pro_id=$1 AND ap_accid = $2)';
    pool.query(q, [id, req.session.userAccount], function(err, results) {
      if (err) throw err;
      var isInproject = results.rows[0].exists;
      var data;
      if (isInproject == false) {
        q = 'SELECT * FROM project, account_project WHERE ap_proid = pro_id AND pro_id=$1 LIMIT 1';// LIMIT 1 : 只需回傳一個結果
        pool.query(q, [id], function(err, results) {
          if (err) throw err;
          data = results.rows;
          res.render('index', { title: 'SmartMeeting', username: req.session.userName, projectData: data, content:'搜尋結果', isInProject: isInproject});
        })
      } else {
        q = 'SELECT * FROM project, account_project WHERE ap_proid = pro_id AND pro_id=$1 AND ap_accid=$2';
        pool.query(q, [id, req.session.userAccount], function(err, results) {
          if (err) throw err;
          data = results.rows;
          res.render('index', { title: 'SmartMeeting', username: req.session.userName, projectData: data, content:'搜尋結果', isInProject: isInproject});
          
        })
      }
    })
  } else {
    res.render('index', { title: 'SmartMeeting', username: req.session.userName, projectData: [], content:'搜尋結果', isInProject: false});
  }
  
  
});

/* 顯示所有與使用者有關的專案 */
router.get('/', function(req, res, next) {
  var q = 'SELECT * FROM project, account_project WHERE ap_proid = pro_id AND ap_accid = $1 ORDER BY pro_id ASC';
  pool.query(q,[req.session.userAccount], function(err, results) { //若有傳回值，傳回值會儲存於「results」參數中
    if (err) throw err;
    var data = results.rows;
    
    res.render('index', { title: 'SmartMeeting', username: req.session.userName, projectData: data, content: '我的專案', isInProject: true });
  })
});

/* 建立專案 */
router.post('/', function(req, res, next) {
  if (req.body.id_join) {
    next();
  } else {
    var pro_name = req.body.pro_name;
    var pro_pw = req.body.pro_pw;
    var p = 'INSERT INTO project (pro_name, pro_pw) VALUES ($1, $2)';
    
    pool.query(p, [pro_name, pro_pw], function(err) {
      if(err) throw err;
      
      p = 'SELECT pro_id FROM project WHERE pro_name = $1';
      pool.query(p, [pro_name], function(err, results) {
        if(err) throw err;
        var newpid = results.rows[0].pro_id;

      p = 'INSERT INTO account_project (ap_proid, ap_accid, ap_authority) VALUES ($1, $2, $3)';
      pool.query(p, [newpid, req.session.userAccount, "管理員"], function(err) {
        if(err) throw err;
        res.redirect('/admin/' + newpid);
      });


      });
    });
  }
});

/* 加入專案 */
router.post('/', function(req, res, next) {
  p = req.body.id_join;
  var q = 'INSERT INTO account_project (ap_proid, ap_accid, ap_authority) VALUES ($1, $2, $3)';

  pool.query(q, [p, req.session.userAccount, '成員'], function(err) {
    if(err) throw err;
    res.redirect('/member/' + p);
  })
});


module.exports = router;