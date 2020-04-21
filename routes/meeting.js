var express = require('express');
var router = express.Router();
var pool = require('../models/db');
var solr = require('../models/solr');

//搜尋會議記錄
var pro_name;
var minute = [];
var isSearchM = false;
var notice;

router.get('/:proid', function(req, res, next) {
    if(!req.session.userAccount){//若沒登入，跳到登入頁
        res.redirect('/login');
    }
    //通知
    var sql = "SELECT * FROM notice, record, project, account_project WHERE notice_recid=rec_id AND rec_proid=pro_id AND pro_id=ap_proid AND ap_accid=$1 ORDER BY notice_time DESC";
    pool.query(sql,[req.session.userAccount]).then(results => {
        notice = results.rows;
        console.log(isSearchM);
        var pro_id = req.params.proid;
        var q = 'SELECT pro_name FROM project WHERE pro_id = $1';
        pool.query(q, [pro_id], function(err, results) {
            if (err) throw err;
            pro_name = results.rows[0].pro_name;
            next();
        })
    })
    
});

router.all('/:proid', function(req, res, next) {
    pro_id = req.params.proid;
    var searchM = req.body.searchMinute;
    var q;
    var arr = [];
    var s = "AND (rec_name LIKE '%" + searchM + "%'";
    if (searchM != null) {
              
        // var str = solr.query().q('text:'+ searchM);//全文檢索
        // solr.search(str, function(err, results) {                
        //     var count = parseInt(results.response.numFound);               
        //     for(var i=0; i<count; i++){
        //         var filename = results.response.docs[i].fileName;
        //         arr[i] = filename.substring(0, filename.lastIndexOf('.')-21)+filename.substring(filename.lastIndexOf('.')) ;
        //         s += " OR rec_name = '" + arr[i] + "'";//符合條件的所有檔名
        //     }
            s += ")";

            aggTags = "SELECT tag_recid, string_agg(tag_name,',') AS tag_names FROM tag WHERE tag_proid = $1 GROUP BY tag_recid";
            q = "SELECT * FROM record, (" + aggTags + ") AS t WHERE tag_recid = rec_id "+ s + "ORDER BY rec_time DESC";
            pool.query(q, [pro_id], function(err, results) {
                if (err) throw err;
                minute = results.rows;
                for(var j in minute) {
                    var path = minute[j].rec_path;
                    minute[j].rec_path = path.substring(14);
                }
                isSearchM = true;
                res.render('meeting', { 
                    title: 'SmartMeeting',
                    username: req.session.userName,
                    userid: req.session.userAccount,
                    pro_id: pro_id, 
                    pro_name: pro_name, 
                    minute: minute,
                    isSearchM: isSearchM,
                    notice: notice
                });
            })   
        // })


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
            userid: req.session.userAccount,
            pro_id: pro_id, 
            pro_name: pro_name, 
            minute: minute,
            isSearchM: isSearchM,
            notice: notice
        });
    }
    
})


module.exports = router;