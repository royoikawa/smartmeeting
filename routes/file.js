var express = require('express');
var router = express.Router();
var multer = require('multer');
var fs = require('fs');
var path = require('path');
var moment = require("moment");
var tz = require("moment-timezone");
var pool = require('../models/db');

//上傳檔案儲存的路徑和檔名
var storage = multer.diskStorage({
    destination: function(req, file, callback) {
        fs.exists('./public/minute', function(exists) {
            if(!exists){
                fs.mkdir('./public/minute', function(err) {
                    if(err){
                        console.log(err);
                    }
                    else{
                        callback(null, './public/minute');
                    }
                });
            }
            else{
                callback(null, './public/minute');
            }
        })
    },
    filename: function(req, file, callback) {
        var index = file.originalname.lastIndexOf('.');//找到區隔檔名與副檔名的.
        var arr = [file.originalname.substring(0, index), file.originalname.substr(index)];
        //更改檔名上傳到資料夾，命名方式:檔名(YYYY-MM-DD HH.mm.ss).副檔名
        callback(null, arr[0]+'('+moment(new Date()).tz("Asia/Taipei").format("YYYY-MM-DD HH.mm.ss")+')'+arr[1]);
    }
});

var upload = multer({
    storage: storage
})

//下載會議記錄
router.get('/:fileid', function(req, res, next) {
    var id = req.params.fileid;
    var sql = "SELECT * FROM record WHERE rec_id=$1";
    pool.query(sql, [id]).then(results => {//找檔案id
        res.download(results.rows[0].rec_path, results.rows[0].rec_name);//更改下載檔案的檔名 
     })
});

//上傳新會議記錄
router.post('/newminute', upload.single('files'), function(req, res, next) {
    var proid = req.query.proid;
    var index = req.file.filename.lastIndexOf('.');
    var time = req.file.filename.substring(index-20, index-1).replace(/\./g, ':');//上傳時間
    var insertfile = "INSERT INTO record (rec_name, rec_state, rec_path, rec_time, rec_upload, rec_proid) VALUES ($1, $2, $3, $4, $5, $6)";
    var filename = req.file.originalname;//以原始檔名儲存進資料庫
    var filepath = req.file.path.replace(/\\/g, '\/');
    pool.query(insertfile, [filename, "審核中", filepath, time, req.session.userAccount, proid], function(err) {//新增record
        if(err) throw err;
        var sql = "SELECT * FROM record WHERE rec_path=$1 and rec_proid=$2";
        pool.query(sql, [filepath, proid]).then(result => {//找檔案id
            var insertnotice = "INSERT INTO notice (notice_recid, notice_action, notice_time) VALUES ($1, $2, $3)";
            pool.query(insertnotice, [result.rows[0].rec_id, "新檔案上傳", time], function(err) {//新增notice
                if(err) throw err;
                res.redirect('/member/'+proid);
            });
        });
    }) 
    
    /*
    上傳=>新檔案上傳
    審核通過=>新檔案確立
    審核不通過=>審核不通過
    重新上傳(審核不通過)=>重新上傳
    修改上傳=>修改上傳
    審核修改通過=>修改通過
    審核修改不通過=>修改不通過
    */
       
});

//上傳舊會議記錄
router.post('/oldminute', upload.single('oldfiles'), function(req, res, next) {
    var proid = req.query.proid;
    var index = req.file.filename.lastIndexOf('.');
    var time = req.file.filename.substring(index-20, index-1).replace(/\./g, ':');
    var insertfile = "INSERT INTO record (rec_name, rec_path, rec_time, rec_upload, rec_proid) VALUES ($1, $2, $3, $4, $5)";
    var filename = req.file.originalname;
    var filepath = req.file.path.replace(/\\/g, '\/');
    pool.query(insertfile, [filename, filepath, time, req.session.userAccount, proid], function(err) {
        if(err) throw err;
        res.redirect('/member/'+proid);
    });   
});

//審核不通過重新上傳 覆蓋掉之前檔案
router.post('/reupload', upload.single('reuploadFile'), function(req, res, next){
    var proid = req.query.proid;
    var id = req.query.recid;
    var sql = "SELECT * FROM record WHERE rec_id=$1";
    pool.query(sql, [id]).then(results => {//找檔案id
        fs.unlink(results.rows[0].rec_path, function(err) {//刪除原審核不通過的檔案
            if(err) throw err;
            console.log('file delete');
        })
    })
    
    var index = req.file.filename.lastIndexOf('.');
    var time = req.file.filename.substring(index-20, index-1).replace(/\./g, ':');//取得上傳檔案的時間
    var filepath = req.file.path.replace(/\\/g, '\/');
    var update = "UPDATE record SET rec_name=$1, rec_state='審核中', rec_reason=null, rec_path=$2, rec_time=$3 WHERE rec_id=$4";
    pool.query(update, [req.file.originalname, filepath, time, id]).then(() => {
        var sql = "INSERT INTO notice (notice_recid, notice_action, notice_time) VALUES ($1, $2, $3)";
        pool.query(sql, [id, '重新上傳', time], function(err) {
            if(err) throw err;
            res.redirect('/member/'+proid);
        });
    })
});

//修改重新上傳 
router.post('/revise', upload.single('reviseFile'), function(req, res, next){
    var proid = req.query.proid;
    var id = req.query.recid;
    var reason = req.body.reviseReason;
    var index = req.file.filename.lastIndexOf('.');
    var time = req.file.filename.substring(index-20, index-1).replace(/\./g, ':');//取得上傳檔案的時間
    var filepath = req.file.path.replace(/\\/g, '\/');
    var update = "UPDATE record SET rec_state='審核中', rec_reason=$1, rec_time=$2, rec_revisepath=$3 WHERE rec_id=$4";
    pool.query(update, [reason, time, filepath, id]).then(() => {
        var sql = "INSERT INTO notice (notice_recid, notice_action, notice_time) VALUES ($1, $2, $3)";
        pool.query(sql, [id, '修改上傳', time], function(err) {
            if(err) throw err;
            res.redirect('/member/'+proid);
        });
    })
});


module.exports = router;