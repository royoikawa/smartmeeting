var express = require('express');
var router = express.Router();
var pg = require('../models/db');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('login', { title: '登入'});
});

router.post('/', function(req, res) {
    var text = 'SELECT * FROM account where acc_id=$1'  
    pg.query(text, [req.body.account]).then(results => {
        if (results.rowCount == 0){
            res.json({"status":1, "msg": "沒有該帳號"})
        }
        else if (results.rows[0].acc_pw != req.body.password){
            res.json({"status":1, "msg": "密碼不符合"})
        }
        
        else{
            res.json({"status":0, "msg": "success"})
       }
       pg.end();
    })
    
})


module.exports = router;
