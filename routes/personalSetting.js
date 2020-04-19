var express = require('express');
var router = express.Router();
var pg = require('../models/db');

var notice;

router.get('/', function(req, res, next) {
    if(!req.session.userAccount){//若沒登入，跳到登入頁
        res.redirect('/login');
    }
    //通知
    var sql = "SELECT * FROM notice, record, project, account_project WHERE notice_recid=rec_id AND rec_proid=pro_id AND pro_id=ap_proid AND ap_accid=$1 ORDER BY notice_time DESC";
    pg.query(sql,[req.session.userAccount]).then(results => {
        notice = results.rows;
        res.render('personalSetting', { title: '個人設定', username:req.session.userName, userid:req.session.userAccount, notice: notice});
    });
    
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
