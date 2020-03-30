var express = require('express');
var router = express.Router();
var pool = require('../models/db');

var pro_id;
var pro_name;
var recPlusAcc;
var aggTags;
router.all('/:proid', function(req, res, next) {
    pro_id = req.params.proid;
    var searchRecord = req.body.searchRecord;
    var state = req.body.filter;
    var s = "";
    var filter = "";
    var checkbox = [true, true, true];
    var q = 'SELECT pro_name FROM project WHERE pro_id = $1';
    pool.query(q, [pro_id], function(err, results) {
        if (err) throw err;
        pro_name = results.rows[0].pro_name;
        if (searchRecord != null) {
            s = " AND (tag_names LIKE '%" + searchRecord + "%' OR rec_name LIKE '%" + searchRecord + "%')";
        }

        if (state) {
            state = JSON.parse(state);
            filter += " AND (";
            checkbox = [false, false, false];
            for (var i in state.val) {
                if (state.val[i] == "審核不通過") {
                    checkbox[0] = true;
                } else if (state.val[i] == "審核中") {
                    checkbox[1] = true;
                } else if (state.val[i] == "已確立檔案") {
                    state.val[i] = "";
                    checkbox[2] = true;
                }
                if (i >= 1) {
                    filter += " OR ";
                }
                filter += "rec_state = '" + state.val[i] + "'";
            }
            filter += ")";
        }
        
        if (checkbox[0] == false && checkbox[1] == false && checkbox[2] == false ) {
            res.render('member', { title: 'SmartMeeting', username: req.session.userName, pro_id: pro_id, pro_name: pro_name, record: [], cb: checkbox });
        } else {
            recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id";
            aggTags = "SELECT tag_recid, string_agg(tag_name,',') AS tag_names FROM tag WHERE tag_proid = $1 GROUP BY tag_recid";
            q = "SELECT * FROM (" + recPlusAcc + ") AS ra, (" + aggTags + ") AS t WHERE tag_recid = rec_id" + s + filter + " ORDER BY rec_time DESC";
            pool.query(q, [pro_id], function(err, results) {
                if (err) throw err;
                data_rec_t_a = results.rows;
                //res.json(data_rec_t_a);           
                res.render('member', { title: 'SmartMeeting', username: req.session.userName, pro_id: pro_id, pro_name: pro_name, record: data_rec_t_a, cb: checkbox });
            });
        }
    })
});

router.get('/:proid/:rec_id', function(req, res, next) {
    pro_id = req.params.proid;
    var recid = req.params.rec_id;
    recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id AND rec_id = $1";
    aggTags = "select tag_recid, string_agg(tag_name,',') as tag_names from tag where tag_proid=$2 group by tag_recid";
    var q = "SELECT * FROM (" + recPlusAcc + ") AS ra, (" + aggTags + ") AS t WHERE tag_recid = rec_id";;
    pool.query(q, [recid, pro_id], function(err, results) {
        if (err) throw err;
        data = results.rows;
        //res.json(data);
        res.render('memberMinute', { title: 'SmartMeeting', username: req.session.userName, pro_id: pro_id, pro_name: pro_name, record: data });
    })
});

router.post('/:proid/:rec_id', function(req, res, next) {
    pro_id = req.params.proid;
    var recid = req.params.rec_id;
    var time = '2020-01-21';
    var reviseReason = req.body.reviseReason;
    
    //重新上傳
    if (!reviseReason) {
        var q = "UPDATE record SET rec_state = '審核中', rec_reason = '', rec_time = $1 WHERE rec_id = $2";
        pool.query(q, [time, recid], function(err, results) {
            if (err) throw err;
            data = results.rows;
            //res.json(data);
            res.redirect('/member/' + pro_id);
        })
    
    //申請修改
    } else {
        var q = "UPDATE record SET rec_state = '審核中', rec_reason = $1, rec_time = $2 WHERE rec_id = $3";
        pool.query(q, [reviseReason, time, recid], function(err, results) {
            if (err) throw err;
            data = results.rows;
            //res.json(data);
            res.redirect('/member/' + pro_id);
        })
    }
});

module.exports = router;