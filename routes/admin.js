var express = require('express');
var router = express.Router();
var pool = require('../models/db');
var fs = require('fs');
var moment = require("moment");
var tz = require("moment-timezone");

var data;
router.get('/:id_join', function(req, res, next) {
    if(!req.session.userAccount){//若沒登入，跳到登入頁
        res.redirect('/login');
    }
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

//審核上傳
router.post('/audit', function(req, res, next){
    var id = req.query.recid;
    var reason = req.body.auditreason;//自行改auditreason
    var time = moment(new Date()).tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss");
    if(!reason) {
        // 管理者審核通過                       
        var sql = "INSERT INTO notice (notice_recid, notice_action, notice_time) VALUES ($1, $2, $3)";
        pool.query(sql, [id, "新檔案確立", time]).then(() => {               
            sql = "UPDATE record SET rec_state=null, rec_time=$1 WHERE rec_id=$2";
            pool.query(sql, [time, id]).then(() => {
                res.send('審核通過');
            })
        })        
    }
    else {
        // 管理者審核不通過          
        var sql = "INSERT INTO notice (notice_recid, notice_action, notice_time) VALUES ($1, $2, $3)";
        pool.query(sql, [id, "審核不通過", time]).then(() => {
            sql = "UPDATE record SET rec_state='審核不通過', rec_reason=$1, rec_time=$2 WHERE rec_id=$3";
            pool.query(sql, [reason, time, id]).then(() => {
                res.send('審核不通過');
            })
        })      
    }   
});

//審核修改
router.post('/', function(req, res, next){
    var id = req.query.recid;
    var reason = req.body.reason;//自行改reason
    var time = moment(new Date()).tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss");
    if(!reason) {
        // 管理者修改通過 刪除原檔案       
        var sql = "SELECT * FROM record WHERE rec_id=$1";
        pool.query(sql, [id]).then(results => {//找檔案id
            fs.unlink(results.rows[0].rec_path, function(err) {//刪除原檔案
                if(err) throw err;
                console.log('file delete');
            })
            var sql = "INSERT INTO notice (notice_recid, notice_action, notice_time) VALUES ($1, $2, $3)";
            pool.query(sql, [id, "修改通過", time]).then(() => {
                var repath = results.rows[0].rec_revisepath;
                //var filename = repath.substring(10, repath.lastIndexOf('('))+repath.substring(repath.lastIndexOf('.'));//D:/minute/xxx(yyyy-mm-dd hh.mm.ss).xxx
                var filename = repath.substring(14, repath.lastIndexOf('.')-21)+repath.substring(repath.lastIndexOf('.'));//public/minute/xxx(yyyy-mm-dd hh.mm.ss).xxx
                sql = "UPDATE record SET rec_name=$1, rec_state=null, rec_reason=null, rec_path=$2, rec_time=$3, rec_revisepath=null WHERE rec_id=$4";
                pool.query(sql, [filename, repath, time, id], function(err) {
                    if(err) throw err;
                    res.send(filename);
                })
            })        
        })
    }
    else {
        // 管理者修改不通過 刪除新檔案 
        var sql = "SELECT * FROM record WHERE rec_id=$1";
        pool.query(sql, [id]).then(results => {//找檔案id
            fs.unlink(results.rows[0].rec_revisepath, function(err) {//刪除新檔案
                if(err) throw err;
                console.log('file delete');
            })
            var sql = "INSERT INTO notice (notice_recid, notice_action, notice_time) VALUES ($1, $2, $3)";
            pool.query(sql, [id, "修改不通過", time]).then(() => {
                sql = "UPDATE record SET rec_state=null, rec_reason=$1, rec_time=$2, rec_revisepath=null WHERE rec_id=$3";
                pool.query(sql, [reason, time, id], function(err) {
                    if(err) throw err;
                    res.send('修改不通過');
                })
            })        
        })
    }  
});

module.exports = router;