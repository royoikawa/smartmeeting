var express = require('express');
var router = express.Router();
var pool = require('../node-api-postgres/query');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'SmartMeeting', username: '王大明'});
});


router.post('/', function(req, res) {
  var pro_name = req.body.pro_name;
  var pro_pw = req.body.pro_pw;
  
  pool.query('INSERT INTO public."project" (pro_name, pro_pw) VALUES ($1, $2)', [pro_name, pro_pw], function(err, results) { //若有傳回值，傳回值會儲存於「results」參數中
    if(err) throw err;
    //res.render('/', { data: results});
    res.redirect('/');
  });
  
});

module.exports = router;