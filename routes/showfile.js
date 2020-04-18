var express = require('express');
var router = express.Router();
var fs = require('fs');
var pool = require('../models/db');

//預覽畫面
router.get('/:recname', function (req, res, next) {
    var rec_name = req.params.recname;
    res.render('showfile', {rec_name: rec_name })
});

module.exports = router;