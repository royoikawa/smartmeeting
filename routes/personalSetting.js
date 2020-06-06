var express = require('express');
var router = express.Router();
var pg = require('../models/db');
var moment = require("moment");
var tz = require("moment-timezone");

var notice;

router.get('/', function(req, res, next) {
    if(!req.session.userAccount){//若沒登入，跳到登入頁
        res.redirect('/login');
    }
    //通知
    var sql = "SELECT * FROM notice, record, project, account_project, account WHERE notice_recid=rec_id AND rec_proid=pro_id AND pro_id=ap_proid AND ap_accid=$1 AND ap_accid=acc_id ORDER BY notice_time DESC";
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

//點擊通知
router.post('/click', function(req, res) {   
    var time = moment(new Date()).tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss");  
    var click = "UPDATE account SET acc_click=$1 WHERE acc_id=$2";
    pg.query(click, [time, req.session.userAccount]).then(results => {
        res.json({"status": 0, "time": time});
    })  
});

module.exports = router;
