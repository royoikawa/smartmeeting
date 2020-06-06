var express = require('express');
var router = express.Router();
var pg = require('../models/db');
var moment = require("moment");
var tz = require("moment-timezone");


router.get('/', function(req, res, next) {
    res.render('register', { title: '註冊'});
});



router.post('/', function(req, res) {
    var text = 'SELECT * FROM account where acc_id=$1'
    pg.query(text, [req.body.account]).then(result => {
        if (result.rowCount > 0){
            res.json({"status":1, "msg": "帳號已被註冊"});
        }
        else{
            var time = moment(new Date()).tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss"); 
            const insertacc = 'INSERT INTO account(acc_id, acc_name, acc_pw, acc_click) VALUES ($1, $2, $3, $4)';
            pg.query(insertacc, [req.body.account, req.body.name, req.body.password, time]);
            req.session.userAccount = req.body.account;
            req.session.userName = req.body.name;
            res.json({"status":0, "msg": "success"});             
        }
    })
    
 
});

module.exports = router;