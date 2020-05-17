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
var notice;

//搜尋音檔文檔
router.all('/:proid', function(req, res, next) {
    if(!req.session.userAccount){//若沒登入，跳到登入頁
        res.redirect('/login');
    }
    //通知
    var sql = "SELECT * FROM notice, record, project, account_project WHERE notice_recid=rec_id AND rec_proid=pro_id AND pro_id=ap_proid AND ap_accid=$1 ORDER BY notice_time DESC";
    pool.query(sql,[req.session.userAccount]).then(results => {
        notice = results.rows;
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
    });
    
})

router.all('/:proid', function(req, res, next) {
    pro_id = req.params.proid;
    var searchRecord = req.body.searchRecord;
    var state = req.body.filter;//傳過來的checkbox 內容，有勾選的有哪些狀態
    var s = "";//資料庫搜尋會議記錄的語法
    var arr = [];
    var filter = "";//資料庫搜尋狀態的語法
    var checkbox = [true, true, true];//紀錄三個狀態有哪些有勾、哪些沒勾
    var q = 'SELECT pro_name FROM project WHERE pro_id = $1';
    pool.query(q, [pro_id]).then(results => {
        pro_name = results.rows[0].pro_name;

        //搜尋會議記錄
        if (searchRecord) {
            s = " (tag_names LIKE '%" + searchRecord + "%' OR rec_name LIKE '%" + searchRecord + "%'" ;                
            /*var str = solr.query().q('text:'+ searchRecord);//全文檢索
            solr.search(str, function(err, results) {                
                var count = parseInt(results.response.numFound);          
                for(var i=0; i<count; i++){
                    var filename = results.response.docs[i].fileName;
                    arr[i] = filename.substring(0, filename.lastIndexOf('.')-21)+filename.substring(filename.lastIndexOf('.')) ;
                    s += " OR rec_name = '" + arr[i] + "'";//符合條件的所有檔名
                }*/
                s += ")";
                /*recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id AND rec_proid=$1";
                aggTags = "SELECT tag_recid, string_agg(tag_name,',') AS tag_names FROM tag WHERE tag_proid = $1 GROUP BY tag_recid";
                q = "SELECT * FROM (" + recPlusAcc + ") AS ra LEFT JOIN (" + aggTags + ") AS t ON tag_recid = rec_id WHERE " + s  + " ORDER BY rec_time DESC";
                console.log(q+ "   1")
                pool.query(q, [pro_id]).then(results => {
                    data_rec_t_a = results.rows;
                    //res.json(data_rec_t_a);           
                    res.render('member', { 
                        title: 'SmartMeeting', 
                        username: req.session.userName,
                        userid: req.session.userAccount, 
                        pro_id: pro_id, 
                        pro_name: pro_name, 
                        record: data_rec_t_a, 
                        cb: checkbox, 
                        audioText: audioText,
                        notice: notice 
                    });
                });
            })*/
                                 
        }

        //篩選狀態
        if (state) {
            state = JSON.parse(state);//把一個JSON字串轉換成JavaScript的物件，該物件為{val:[] }，[]裡面放checkbox的值
            filter += "  (";
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
                userid: req.session.userAccount,
                pro_id: pro_id, 
                pro_name: pro_name, 
                record: [], 
                cb: checkbox, 
                audioText: audioText,
                notice: notice 
            });
        } else {

            recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id AND rec_proid=$1";
            aggTags = "SELECT tag_recid, string_agg(tag_name,',') AS tag_names FROM tag WHERE tag_proid = $1 GROUP BY tag_recid";
            if(s=="" && filter==""){
                q = "SELECT * FROM (" + recPlusAcc + ") AS ra LEFT JOIN (" + aggTags + ") AS t ON tag_recid = rec_id ORDER BY rec_time DESC";
            }
            
            else if(s!="" && filter!=""){
                q = "SELECT * FROM (" + recPlusAcc + ") AS ra LEFT JOIN (" + aggTags + ") AS t ON tag_recid = rec_id WHERE " + s + " AND " + filter + " ORDER BY rec_time DESC";
            }
            else if(s=="" || filter==""){
                q = "SELECT * FROM (" + recPlusAcc + ") AS ra LEFT JOIN (" + aggTags + ") AS t ON tag_recid = rec_id WHERE " + s + filter + " ORDER BY rec_time DESC";
            }
            
            pool.query(q, [pro_id]).then(results => {
                data_rec_t_a = results.rows;
                //res.json(data_rec_t_a);
                for (var i in data_rec_t_a) {
                    if (data_rec_t_a[i].tag_names != null)
                        data_rec_t_a[i].tag_names = data_rec_t_a[i].tag_names.split(",");
                }
                res.render('member', { 
                    title: 'SmartMeeting', 
                    username: req.session.userName,
                    userid: req.session.userAccount,
                    pro_id: pro_id, 
                    pro_name: pro_name, 
                    record: data_rec_t_a, 
                    cb: checkbox, 
                    audioText: audioText,
                    notice: notice 
                });
            });
        }
    })
});

var data;
//顯示record 詳細資料頁面
router.get('/:proid/:rec_id', function(req, res, next) {
    //通知
    var sql = "SELECT * FROM notice, record, project, account_project WHERE notice_recid=rec_id AND rec_proid=pro_id AND pro_id=ap_proid AND ap_accid=$1 ORDER BY notice_time DESC";
    pool.query(sql,[req.session.userAccount]).then(results => {
        notice = results.rows;
    });

    pro_id = req.params.proid;
    var recid = req.params.rec_id;
    recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id AND rec_id = $1";
    aggTags = "select tag_recid, string_agg(tag_name,',') as tag_names from tag where tag_proid=$2 group by tag_recid";
    var q = "SELECT * FROM (" + recPlusAcc + ") AS ra LEFT JOIN (" + aggTags + ") AS t ON tag_recid = rec_id";
    pool.query(q, [recid, pro_id]).then(results => {
        data = results.rows;
        //res.render('memberMinute', { title: 'SmartMeeting', username: req.session.userName, userid: req.session.userAccount, pro_id: pro_id, pro_name: pro_name, record: data });
        next();
    });
    
});

//顯示tag
router.get('/:proid/:rec_id', function(req, res, next) {
    pro_id = req.params.proid;
    var recid = req.params.rec_id;
    var arr = [];//存整筆
    var arr1 = [];//存標籤名
    //recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id AND rec_id = $1";
    //aggTags = "select tag_recid, string_agg(tag_name,',') as tag_names from tag where tag_proid=$2 group by tag_recid";
    //var q = "SELECT * FROM (" + recPlusAcc + ") AS ra, (" + aggTags + ") AS t WHERE tag_recid = rec_id";
    var test = "SELECT * FROM tag WHERE tag_proid=$1 ORDER BY CASE tag_recid WHEN $2 THEN 1 ELSE 2 END, tag_id";
    pool.query(test, [pro_id, recid]).then(results => {    
        for(let i = 0;i<results.rowCount; i++){
            if(!(arr1.includes(results.rows[i].tag_name))){
                arr.push(results.rows[i]);
                arr1.push(results.rows[i].tag_name);
            }
        }
        res.render('memberMinute', { 
            title: 'SmartMeeting', 
            username: req.session.userName, 
            userid: req.session.userAccount, 
            pro_id: pro_id, 
            pro_name: pro_name, 
            record: data, 
            tag: arr, 
            notice: notice});
    })
    /*
    var q = "SELECT * FROM (SELECT DISTINCT ON (tag_name) * FROM tag WHERE tag_proid = $1) AS distinctTag ORDER BY CASE tag_recid WHEN $2 THEN 1 ELSE 2 END, tag_id;";
    pool.query(q, [pro_id, recid], function(err, results) {
        if (err) throw err;
        var distinctTag = results.rows;
        //res.json(data);
        res.render('memberMinute', { 
            title: 'SmartMeeting', 
            username: req.session.userName, 
            userid: req.session.userAccount, 
            pro_id: pro_id, 
            pro_name: pro_name, 
            record: data, 
            tag: distinctTag, 
            notice: notice});
    })*/
});

router.post('/tag/:proid/:recid', function(req, res, next) {
    var proid = req.params.proid;
    var recid = req.params.recid;
    var newtag = req.body.newTag;
    var tag = req.body.cb;
    
    if(newtag){ //新增新標籤
        var arr = new Array();
        arr = newtag.split(' ');
        for(let i=0; i<arr.length; i++){
            //console.log(arr[i]);
            var selecttag = "SELECT * FROM tag WHERE tag_name=$1 AND tag_recid=$2";
            pool.query(selecttag, [arr[i], recid]).then(results => {
                if(results.rowCount==0){
                    var addnewtag = "INSERT INTO tag(tag_name, tag_recid, tag_proid) VALUES ($1, $2, $3)";
                    pool.query(addnewtag, [arr[i], recid, proid]).then(() => {
                        if(i==arr.length-1){
                            res.redirect('/member/'+pro_id+'/'+recid);
                        }
                    });
                }               
            })

        }
        
        /*
        var selecttag = "SELECT * FROM tag WHERE tag_name=$1 AND tag_recid=$2";
        pool.query(selecttag, [newtag, recid]).then(results => {
            if(results.rowCount==0){
                var addnewtag = "INSERT INTO tag(tag_name, tag_recid, tag_proid) VALUES ($1, $2, $3)";
                pool.query(addnewtag, [newtag, recid, proid]).then(() => {
                    res.redirect('/member/'+pro_id+'/'+recid);
                })
            }
            else{
                res.redirect('/member/'+pro_id+'/'+recid);
            }
        }) */      
    }
    
    else if(!tag){
        var deletetag = "DELETE FROM tag WHERE tag_recid=$1";
        pool.query(deletetag, [recid], function(err, results) {
            if(err) throw err;
            res.redirect('/member/'+pro_id+'/'+recid);
        })
    }
    else if (tag) {    
        var arr = [];
        var checktag = "SELECT * FROM tag WHERE tag_recid=$1";
        pool.query(checktag, [recid]).then(results => {
            for(let i=0; i<results.rowCount; i++){
                arr.push(results.rows[i].tag_name);//現有的標籤
            }
        }).then(() => {
            for(let i=0; i<tag.length; i++){//表單勾選沒出現在現有標籤，新增
                if(!arr.includes(tag[i])){
                    var addtag = "INSERT INTO tag(tag_name, tag_recid, tag_proid) VALUES ($1, $2, $3)";
                    pool.query(addtag, [tag[i], recid, proid]);
                }                                
            }
        }).then(() => {
            for(let i=0; i<arr.length; i++){//現有標籤沒出現在表單勾選，刪除
                if(!tag.includes(arr[i])){
                    var addtag = "DELETE FROM tag WHERE tag_name=$1 AND tag_recid=$2";
                    pool.query(addtag, [arr[i], recid]);
                }                
            }
        }).then(() => {            
            res.redirect('/member/'+pro_id+'/'+recid);                      
        })
    }    
    
});

module.exports = router;