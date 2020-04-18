var express = require('express');
var router = express.Router();
var pool = require('../models/db');
var solr = require('../models/solr');

//顯示 member 首頁
var pro_id;
var pro_name;
var recPlusAcc;
var aggTags;
var audioText;
//搜尋音檔文檔
router.all('/:proid', function(req, res, next) {
    if(!req.session.userAccount){//若沒登入，跳到登入頁
        res.redirect('/login');
    }
    pro_id = req.params.proid;
    var searchAT = req.body.searchAudioText;
    var q;
    if (searchAT != null) {
        q = "SELECT * FROM audiotext WHERE at_proid = $1 AND at_name LIKE '%" + searchAT + "%'";
        pool.query(q, [pro_id]).then(results => {
            audioText = results.rows;
            next();
        })
    }
    else {
        q = 'SELECT * FROM audiotext WHERE at_proid = $1';
        pool.query(q, [pro_id]).then(results => {
            audioText = results.rows;
            next();
        })
    }
})

router.all('/:proid', function(req, res, next) {
    pro_id = req.params.proid;
    var searchRecord = req.body.searchRecord;
    var state = req.body.filter;//傳過來的checkbox 內容，有勾選的有哪些狀態
    var s = "";//資料庫搜尋音文檔的語法
    var arr = [];
    var filter = "";//資料庫搜尋狀態的語法
    var checkbox = [true, true, true];//紀錄三個狀態有哪些有勾、哪些沒勾
    var q = 'SELECT pro_name FROM project WHERE pro_id = $1';
    pool.query(q, [pro_id]).then(results => {
        pro_name = results.rows[0].pro_name;

        //搜尋會議記錄
        if (searchRecord != null) {
            s = " AND (tag_names LIKE '%" + searchRecord + "%' OR rec_name LIKE '%" + searchRecord + "%'" ;                
            // var str = solr.query().q('text:'+ searchRecord);//全文檢索
            // solr.search(str, function(err, results) {                
            //     var count = parseInt(results.response.numFound);               
            //     for(var i=0; i<count; i++){
            //         var filename = results.response.docs[i].fileName;
            //         arr[i] = filename.substring(0, filename.lastIndexOf('.')-21)+filename.substring(filename.lastIndexOf('.')) ;
            //         s += " OR rec_name = '" + arr[i] + "'";//符合條件的所有檔名
            //     }
                 s += ")";
                // recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id";
                // aggTags = "SELECT tag_recid, string_agg(tag_name,',') AS tag_names FROM tag WHERE tag_proid = $1 GROUP BY tag_recid";
                // q = "SELECT * FROM (" + recPlusAcc + ") AS ra, (" + aggTags + ") AS t WHERE tag_recid = rec_id" + s + filter + " ORDER BY rec_time DESC";
                // pool.query(q, [pro_id]).then(results => {
                //     data_rec_t_a = results.rows;
                //     //res.json(data_rec_t_a);           
                //     res.render('member', { 
                //         title: 'SmartMeeting', 
                //         username: req.session.userName, 
                //         pro_id: pro_id, 
                //         pro_name: pro_name, 
                //         record: data_rec_t_a, 
                //         cb: checkbox, 
                //         audioText: audioText 
                //     });
                // });
            // })                      
        }

        //篩選狀態
        if (state) {
            state = JSON.parse(state);//把一個JSON字串轉換成JavaScript的物件，該物件為{val:[] }，[]裡面放checkbox的值
            filter += " AND (";
            checkbox = [false, false, false];
            for (var i in state.val) {
                if (i >= 1) {
                    filter += " OR ";
                }
                if (state.val[i] == "審核不通過") {
                    filter += "rec_state = '" + state.val[i] + "'";
                    checkbox[0] = true;
                } else if (state.val[i] == "審核中") {
                    filter += "rec_state = '" + state.val[i] + "'";
                    checkbox[1] = true;
                } else if (state.val[i] == "已確立檔案") {
                    filter += "rec_state ISNULL" ;
                    checkbox[2] = true;
                }
            }
            filter += ")";
        }
        
        if (checkbox[0] == false && checkbox[1] == false && checkbox[2] == false ) {
            res.render('member', { 
                title: 'SmartMeeting', 
                username: req.session.userName, 
                pro_id: pro_id, 
                pro_name: pro_name, 
                record: [], 
                cb: checkbox, 
                audioText: audioText 
            });
        } else {
            recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id";
            aggTags = "SELECT tag_recid, string_agg(tag_name,',') AS tag_names FROM tag WHERE tag_proid = $1 GROUP BY tag_recid";
            q = "SELECT * FROM (" + recPlusAcc + ") AS ra, (" + aggTags + ") AS t WHERE tag_recid = rec_id" + s + filter + " ORDER BY rec_time DESC";
            pool.query(q, [pro_id]).then(results => {
                data_rec_t_a = results.rows;
                //res.json(data_rec_t_a);           
                res.render('member', { 
                    title: 'SmartMeeting', 
                    username: req.session.userName, 
                    pro_id: pro_id, 
                    pro_name: pro_name, 
                    record: data_rec_t_a, 
                    cb: checkbox, 
                    audioText: audioText 
                });
            });
        }
    })
});

var data;
//顯示record 詳細資料頁面
router.get('/:proid/:rec_id', function(req, res, next) {
    pro_id = req.params.proid;
    var recid = req.params.rec_id;
    recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id AND rec_id = $1";
    aggTags = "select tag_recid, string_agg(tag_name,',') as tag_names from tag where tag_proid=$2 group by tag_recid";
    var q = "SELECT * FROM (" + recPlusAcc + ") AS ra, (" + aggTags + ") AS t WHERE tag_recid = rec_id";;
    pool.query(q, [recid, pro_id]).then(results => {
        data = results.rows;
        //res.render('memberMinute', { title: 'SmartMeeting', username: req.session.userName, pro_id: pro_id, pro_name: pro_name, record: data });
        next();
    });
    //pool.query(q, [recid, pro_id], function(err, results) {
    //    if (err) throw err;
    //    data = results.rows;
    //    //res.json(data);
    //    //res.render('memberMinute', { title: 'SmartMeeting', username: req.session.userName, pro_id: pro_id, pro_name: pro_name, record: data });
    //    next();
    //});
});

//顯示tag
router.get('/:proid/:rec_id', function(req, res, next) {
    pro_id = req.params.proid;
    var recid = req.params.rec_id;
    //recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id AND rec_id = $1";
    //aggTags = "select tag_recid, string_agg(tag_name,',') as tag_names from tag where tag_proid=$2 group by tag_recid";
    //var q = "SELECT * FROM (" + recPlusAcc + ") AS ra, (" + aggTags + ") AS t WHERE tag_recid = rec_id";;
    var q = "SELECT * FROM (SELECT DISTINCT ON (tag_name) * FROM tag WHERE tag_proid = $1) AS distinctTag ORDER BY CASE tag_recid WHEN $2 THEN 1 ELSE 2 END, tag_id;";
    pool.query(q, [pro_id, recid], function(err, results) {
        if (err) throw err;
        var distinctTag = results.rows;
        //res.json(data);
        res.render('memberMinute', { title: 'SmartMeeting', username: req.session.userName, pro_id: pro_id, pro_name: pro_name, record: data, tag: distinctTag});
    })
});


module.exports = router;