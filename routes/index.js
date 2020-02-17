var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express', username: '王大明' });
});

router.get('/hello', function(req, res, next) {
  res.send("helloworld");
});

module.exports = router;

