var express = require('express');
var router = express.Router();
var pool = require('../models/db');

var data;
router.get('/:id_join', function(req, res, next) {
    var pro_id = req.params.id_join;
    var q = 'SELECT pro_name FROM project WHERE pro_id = $1';
    pool.query(q, [pro_id], function(err, results) {
        if (err) throw err;
        pro_name = results.rows[0].pro_name;
        var recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id AND rec_state = '審核中'";
        var aggTags = "SELECT tag_recid, string_agg(tag_name,',') AS tag_names FROM tag WHERE tag_proid = $1 GROUP BY tag_recid";
        q = "SELECT * FROM (" + recPlusAcc + ") AS ra, (" + aggTags + ") AS t WHERE tag_recid = rec_id ORDER BY rec_time DESC";
        pool.query(q, [pro_id], function(err, results) {
            if (err) throw err;
            data = results.rows;
            //res.json(data);
            res.render('admin', { 
                title: 'SmartMeeting',
                username: req.session.userName,
                pro_id: pro_id, 
                pro_name: pro_name, 
                review: data 
            });
        })
    })
    
});

//顯示會議紀錄詳細資訊
router.get('/:proid/:rec_id', function(req, res, next) {
    pro_id = req.params.proid;
    var recid = req.params.rec_id;
    recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id AND rec_id = $1";
    aggTags = "select tag_recid, string_agg(tag_name,',') as tag_names from tag where tag_proid=$2 group by tag_recid";
    var q = "SELECT * FROM (" + recPlusAcc + ") AS ra, (" + aggTags + ") AS t WHERE tag_recid = rec_id";
    pool.query(q, [recid, pro_id]).then(results => {
        data = results.rows;
        res.render('adminReview', { 
            title: 'SmartMeeting', 
            username: req.session.userName, 
            pro_id: pro_id, 
            pro_name: pro_name, 
            record: data 
        });
    });
});

//router.post('/:proid/:rec_id', function(req, res, next) {
//    pro_id = req.params.proid;
//    var recid = req.params.rec_id;
//    var time = '2020-01-21';
//    var denyReason = req.body.denyReason;
//    
//    //重新上傳
//    if (!reviseReason) {
//        var q = "UPDATE record SET rec_state = '審核中', rec_reason = null, rec_time = $1 WHERE rec_id = $2";
//        pool.query(q, [time, recid], function(err, results) {
//            if (err) throw err;
//            data = results.rows;
//            //res.json(data);
//            res.redirect('/member/' + pro_id);
//        })
//    
//    //申請修改
//    } else {
//        var q = "UPDATE record SET rec_state = '審核中', rec_reason = $1, rec_time = $2 WHERE rec_id = $3";
//        pool.query(q, [reviseReason, time, recid], function(err, results) {
//            if (err) throw err;
//            data = results.rows;
//            //res.json(data);
//            res.redirect('/member/' + pro_id);
//        })
//    }
//});

module.exports = router;