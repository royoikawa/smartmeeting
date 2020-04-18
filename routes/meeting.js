var express = require('express');
var router = express.Router();
var pool = require('../models/db');

//搜尋會議記錄
var pro_name;
var minute = [];
var isSearchM = false;

router.get('/:proid', function(req, res, next) {
    if(!req.session.userAccount){//若沒登入，跳到登入頁
        res.redirect('/login');
    }
    console.log(isSearchM);
    var pro_id = req.params.proid;
    var q = 'SELECT pro_name FROM project WHERE pro_id = $1';
    pool.query(q, [pro_id], function(err, results) {
        if (err) throw err;
        pro_name = results.rows[0].pro_name;
        next();
    })
    
});

router.all('/:proid', function(req, res, next) {
    pro_id = req.params.proid;
    var searchM = req.body.searchMinute;
    var q;
    if (searchM != null) {
        aggTags = "SELECT tag_recid, string_agg(tag_name,',') AS tag_names FROM tag WHERE tag_proid = $1 GROUP BY tag_recid";
        q = "SELECT * FROM record, (" + aggTags + ") AS t WHERE tag_recid = rec_id AND rec_name LIKE '%" + searchM + "%' ORDER BY rec_time DESC";
        
        pool.query(q, [pro_id], function(err, results) {
            if (err) throw err;
            minute = results.rows;
            isSearchM = true;
            res.render('meeting', { 
                title: 'SmartMeeting',
                username: req.session.userName,
                pro_id: pro_id, 
                pro_name: pro_name, 
                minute: minute,
                isSearchM: isSearchM
            });
        })
        // pool.query(q, [pro_id]).then(results => {
        //     console.log("ddssf");
        //     minute = results.rows;
        //     res.json(minute);
        // })
        
    }
    else {
        res.render('meeting', { 
            title: 'SmartMeeting',
            username: req.session.userName,
            pro_id: pro_id, 
            pro_name: pro_name, 
            minute: minute,
            isSearchM: isSearchM
        });
    }
    
})


module.exports = router;