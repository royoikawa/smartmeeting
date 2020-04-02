var express = require('express');
var router = express.Router();
var pool = require('../models/db');
var fs = require('fs');
var moment = require("moment");
var tz = require("moment-timezone");

router.get('/:id_join', function(req, res, next) {
    var pro_id = req.params.id_join;
    res.render('admin', { title: 'SmartMeeting', username: req.session.userName, pro_id: pro_id});
});

//審核修改
router.post('/', function(req, res, next){
    var id = req.query.recid;
    // 管理者修改通過 刪除原檔案
    var time = moment(new Date()).tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss");
    var sql = "SELECT * FROM record WHERE rec_id=$1";
    pool.query(sql, [id]).then(results => {//找檔案id
        fs.unlink(results.rows[0].rec_path, function(err) {//刪除原檔案
            if(err) throw err;
            console.log('file delete');
        })
        var sql = "INSERT INTO notice (notice_recid, notice_action, notice_time) VALUES ($1, $2, $3)";
        pool.query(sql, [id, "修改通過", time]).then(() => {
            var repath = results.rows[0].rec_revisepath;
            var arr = [];
            arr = repath.split(repath.lastIndexOf('.'));
            sql = "UPDATE record SET rec_name=$1, rec_state=null, rec_reason=null, rec_path=$2, rec_time=$3, rec_revisepath=null WHERE rec_id=$4";
            var value = [arr[0].substring(0, arr[0].lastIndexOf('('))+arr[1], repath, time, id];
            pool.query(sql, value, function(err) {
                if(err) throw err;
                //res.redirect('');
            })
        })        
    })
    
});

module.exports = router;