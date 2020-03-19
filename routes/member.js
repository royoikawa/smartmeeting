var express = require('express');
var router = express.Router();
var pool = require('../models/db');

router.get('/:id_join', function(req, res, next) {
    var pro_id = req.params.id_join;
    var q = 'SELECT pro_name FROM project WHERE pro_id = $1';
    pool.query(q, [pro_id], function(err, results) {
        if (err) throw err;
        var pro_name = results.rows[0].pro_name;
        res.render('member', { title: 'SmartMeeting', username: req.session.userName, pro_id: pro_id, pro_name: pro_name });
    })
});

module.exports = router;