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
        fs.exists('D:/minute', function(exists) {//../../solr-7.7.2/example/exampledocs
            if(!exists){
                fs.mkdir('D:/minute', function(err) {
                    if(err){
                        console.log(err);
                    }
                    else{
                        callback(null, 'D:/minute');
                    }
                });
            }
            else{
                callback(null, 'D:/minute');
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
        var index = results.rows[0].rec_name.lastIndexOf('.');
        var arr = [results.rows[0].rec_name.substring(0, index), results.rows[0].rec_name.substring(index)];//檔名與副檔名
        var filename = arr[0]+'('+results.rows[0].rec_uploadtime.replace(':', '.')+')'+arr[1];//拼湊成資料夾裡儲存的檔名，檔名(時間)副檔名
        var filePath = path.join('D:/minute', filename);
        res.download(filePath, results.rows[0].rec_name);//更改下載檔案的檔名 
     })
});

//上傳新會議記錄
router.post('/newminute', upload.single('files'), function(req, res, next) {
    var proid = req.query.proid;
    var index = req.file.filename.lastIndexOf('.');
    var time = req.file.filename.substring(index-20, index-1).replace('.', ':');
    var insertfile = "INSERT INTO record (rec_name, rec_state, rec_uploadtime, rec_time, rec_upload, rec_proid) VALUES ($1, $2, $3, $4, $5, $6)";
    var filename = req.file.originalname;//以原始檔名儲存進資料庫
    pool.query(insertfile, [filename, "審核中", time, time, req.session.userAccount, proid])//新增record
    var sql = "SELECT * FROM record WHERE rec_name=$1 and rec_uploadtime=$2 and rec_proid=$3";
    pool.query(sql, [filename, time, proid]).then(result => {//尋找file id
        var insertnotice = "INSERT INTO notice (notice_recid, notice_action, notice_time) VALUES ($1, $2, $3)";
        pool.query(insertnotice, [result.rows[0].rec_id, "新檔案上傳", time]);//新增notice
    });
    
    /*
    上傳=>新檔案上傳
    審核通過=>新檔案確立
    審核不通過=>審核不通過
    重新上傳(審核不通過)=>重新上傳
    修改上傳=>修改上傳
    審核修改通過=>修改通過
    審核修改不通過=>修改不通過
    */
    
    res.redirect('/member/'+proid);
});

//上傳舊會議記錄
router.post('/oldminute', upload.single('oldfiles'), function(req, res, next) {
    var proid = req.query.proid;
    var index = req.file.filename.lastIndexOf('.');
    var time = req.file.filename.substring(index-20, index-1).replace('.', ':');
    var insertfile = "INSERT INTO record (rec_name, rec_uploadtime, rec_time, rec_upload, rec_proid) VALUES ($1, $2, $3, $4, $5)";
    var filename = req.file.originalname;
    pool.query(insertfile, [filename, time, time, req.session.userAccount, proid]);
    res.redirect('/member/'+proid);
});

//審核不通過重新上傳 覆蓋掉之前檔案
router.post('/reupload', upload.single(''), function(req, res, next){//single後填<input type='file' name=''>name裡的東西
    var id = req.query.fileid;//原始檔案的id，看你是用query還是params
    var sql = "SELECT * FROM record WHERE rec_id=$1";
    pool.query(sql, [id]).then(results => {//找檔案id
        var index = results.rows[0].rec_name.lastIndexOf('.');//找檔名與副檔名中間的.
        var arr = [results.rows[0].rec_name.substring(0, index), results.rows[0].rec_name.substring(index)];//檔名與副檔名
        var filename = arr[0]+'('+results.rows[0].rec_uploadtime.replace(':', '.')+')'+arr[1];//拼湊成資料夾裡儲存的檔名，檔名(時間)副檔名
        var filePath = path.join('D:/minute', filename);//檔案路徑
        fs.unlink(filePath, function(err) {//刪除原審核不通過的檔案
            if(err) throw err;
            console.log('file delete');
        })
    })
    
    // var index = req.file.filename.lastIndexOf('.');
    // var time = req.file.filename.substring(index-20, index-1).replace('.', ':');//取得上傳檔案的時間，新增進資料庫用
    // var update = "UPDATE record SET rec_state='審核中', rec_uploadtime=$1, rec_time=$2 WHERE rec_id=$3";
    // pool.query(update, [time, time, id]).then(() => {
    //     var sql = "INSERT INTO notice (notice_recid, notice_action, notice_time) VALUES ($1, $2, $3)";
    //     pool.query(sql, [id, '重新上傳', time]);
    // })

    //res.redirect('');
});


module.exports = router;