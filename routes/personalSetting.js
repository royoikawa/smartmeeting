var express = require('express');
var router = express.Router();
var pg = require('../models/db');

router.get('/', function(req, res, next) {
  res.render('personalSetting', { title: '個人設定', username:req.session.userName, useracc:req.session.userAccount});
});

//修改姓名
router.post('/changename', function(req, res) {
    var text = "UPDATE account SET acc_name=$1 WHERE acc_id=$2";
    pg.query(text, [req.body.name, req.session.userAccount]);
    req.session.userName = req.body.name;
    res.json({"status": 0});
    
});

//修改密碼
router.post('/changepw', function(req, res) {      
    var checkpw = "SELECT * FROM account WHERE acc_id=$1 and acc_pw=$2";
    pg.query(checkpw, [req.session.userAccount, req.body.old]).then(results => {
        if(results.rowCount == 0){
            res.json({"status": 1, "msg": "原始密碼錯誤"});
        }
        else{
            var updatepw = "UPDATE account SET acc_pw=$1 WHERE acc_id=$2";
            pg.query(updatepw, [req.body.newpw, req.session.userAccount]);
            res.json({"status": 0})
        }
    })
    
});


module.exports = router;
