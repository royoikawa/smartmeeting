var express = require('express');
var router = express.Router();
var pg = require('../models/db');



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
            const insertacc = 'INSERT INTO account(acc_id, acc_name, acc_pw) VALUES ($1, $2, $3)';
            pg.query(insertacc, [req.body.account, req.body.name, req.body.password]);
            res.json({"status":0, "msg": "success"});             
        }
        pg.end();
    })
    
 
});

module.exports = router;