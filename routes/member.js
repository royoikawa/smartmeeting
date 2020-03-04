var express = require('express');
var router = express.Router();
var pool = require('../models/db');

router.get('/:id_join', function(req, res, next) {
    var pro_id = req.params.id_join;
    res.render('member', { title: 'SmartMeeting', username: req.session.userName, pro_id: pro_id});
});

module.exports = router;