var express = require('express');
var router = express.Router();
var multer = require('multer');
var fs = require('fs');
var path = require('path');
var moment = require("moment");
var tz = require("moment-timezone");
var pool = require('../models/db');
var nodemailer = require('nodemailer');

//宣告發信物件
var transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        type: 'OAuth2',
        user: 'smartmeetingfjuim@gmail.com',
        clientId: '8885475494-vprru9illuq8enjrfsh624akorp74dhj.apps.googleusercontent.com',
        clientSecret: 'b7mM_iGlNpzN9RLFMKOY3vca',
        refreshToken: '1//04l3utS89fJ_8CgYIARAAGAQSNwF-L9Ir8of7DRRTcc0PhUXyPKBmveFflzO8dgW4QnjaCEf835836KG7hZryaao-QXTuTqQNTvU',
        accessToken: 'ya29.Il-_B6nzAnVhDJAtjcw2jgt-HEQOl9RRRelxFn_vyio-d6GyzXMdWWbDJnz7rMxjIRVz5CRATg2ZsDETQYLOnnBSdK-wCdBaMx7SXz_KrRS6g0VMEL2cQfiEy59zC8tBWw',
        expires: 1484314697598
    }
    
});

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

//下載原始會議記錄
router.get('/:fileid', function(req, res, next) {
    var id = req.params.fileid;
    var sql = "SELECT * FROM record WHERE rec_id=$1";
    pool.query(sql, [id]).then(results => {//找檔案id
        res.download(results.rows[0].rec_path, results.rows[0].rec_name);//更改下載檔案的檔名 
     })
});

//下載修改會議記錄
router.get('/new/:fileid', function(req, res, next) {
    var id = req.params.fileid;
    var sql = "SELECT * FROM record WHERE rec_id=$1";
    pool.query(sql, [id]).then(results => {//找檔案id
        var revisepath = results.rows[0].rec_revisepath;
        res.download(results.rows[0].rec_revisepath, revisepath.substring(14, revisepath.lastIndexOf('.')-21)+revisepath.substring(revisepath.lastIndexOf('.')));//更改下載檔案的檔名 
     })
});

//上傳新會議記錄
router.post('/newminute', upload.single('files'), function(req, res, next) {
    var recid;
    var recipient = "";
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
            recid = result.rows[0].rec_id;
            var insertnotice = "INSERT INTO notice (notice_recid, notice_action, notice_time) VALUES ($1, $2, $3)";
            pool.query(insertnotice, [result.rows[0].rec_id, "新檔案上傳", time], function(err) {//新增notice
                if(err) throw err;
                
                pool.query("SELECT * FROM account_project, project WHERE ap_proid=pro_id AND ap_proid=$1 AND ap_authority='擁有者'", [proid]).then(results => {
                    var options = {
                        //寄件者
                        from: 'smartmeetingfjuim@gmail.com',
                        //收件者
                        to: results.rows[0].ap_accid,    
                        //主旨
                        subject: '專案' + results.rows[0].pro_name + '有新檔案須審核', // Subject line
                        //嵌入 html 的內文
                        html: '<p>專案'+ results.rows[0].pro_name + '有新檔案 '+ filename +' 須審核<br>請登入系統觀看。</p><p>智慧會議系統團隊</p>',    
                    };
                
                    //發送信件方法
                    transporter.sendMail(options, function(error, info){
                        if(error){
                            console.log("發送失敗");
                        }else{
                            console.log("發送成功");
                        }
                    });
                })
                pool.query("SELECT * FROM account_project, project WHERE ap_proid=pro_id AND ap_proid=$1 AND ap_authority='參與者'", [proid]).then(results => {
                    for(let i=0; i<results.rowCount; i++) {
                        recipient += results.rows[i].ap_accid;
                        if(i<results.rowCount-1){
                            recipient += ',';
                        }
                    }  
                
                    var options = {
                        //寄件者
                        from: 'smartmeetingfjuim@gmail.com',
                        //收件者
                        to: recipient,    
                        //主旨
                        subject: '專案' + results.rows[0].pro_name + '有新檔案上傳', // Subject line
                        //嵌入 html 的內文
                        html: '<p>專案' + results.rows[0].pro_name + '有新檔案 '+ filename +' 上傳<br>請登入系統觀看。</p><p>智慧會議系統團隊</p>',    
                    };
                
                    //發送信件方法
                    transporter.sendMail(options, function(error, info){
                        if(error){
                            console.log("發送失敗");
                        }else{
                            console.log("發送成功");
                        }
                    });
                });
                res.json({"status": 0, "recid": recid});
                //res.redirect('/member/'+proid);
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
    var recid;
    var proid = req.query.proid;
    var index = req.file.filename.lastIndexOf('.');
    var time = req.file.filename.substring(index-20, index-1).replace(/\./g, ':');
    var insertfile = "INSERT INTO record (rec_name, rec_path, rec_time, rec_upload, rec_proid) VALUES ($1, $2, $3, $4, $5)";
    var filename = req.file.originalname;
    var filepath = req.file.path.replace(/\\/g, '\/');
    pool.query(insertfile, [filename, filepath, time, req.session.userAccount, proid], function(err) {
        if(err) throw err;
        var sql = "SELECT * FROM record WHERE rec_path=$1 and rec_proid=$2";
        pool.query(sql, [filepath, proid]).then(result => {//找檔案id
            recid = result.rows[0].rec_id;
            res.json({"status": 0, "recid": recid});
        })
        //res.redirect('/member/'+proid);
    });   
});

//審核不通過重新上傳 覆蓋掉之前檔案
router.post('/reupload', upload.single('reuploadFile'), function(req, res, next){
    var recipient = "";
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
            
            pool.query("SELECT * FROM account_project, project WHERE ap_proid=pro_id AND ap_proid=$1 AND ap_authority='擁有者'", [proid]).then(results => {
                var options = {
                    //寄件者
                    from: 'smartmeetingfjuim@gmail.com',
                    //收件者
                    to: results.rows[0].ap_accid,    
                    //主旨
                    subject: '專案' + results.rows[0].pro_name + '有不通過檔案須審核', // Subject line
                    //嵌入 html 的內文
                    html: '<p>專案'+ results.rows[0].pro_name + '有不通過檔案 '+ req.file.originalname +' 已重新上傳，須審核<br>請登入系統觀看。</p><p>智慧會議系統團隊</p>',    
                };
            
                //發送信件方法
                transporter.sendMail(options, function(error, info){
                    if(error){
                        console.log("發送失敗");
                    }else{
                        console.log("發送成功");
                    }
                });
            })
            pool.query("SELECT * FROM account_project, project WHERE ap_proid=pro_id AND ap_proid=$1 AND ap_authority='參與者'", [proid]).then(results => {
                for(let i=0; i<results.rowCount; i++) {
                    recipient += results.rows[i].ap_accid;
                    if(i<results.rowCount-1){
                        recipient += ',';
                    }
                }  
            
                var options = {
                    //寄件者
                    from: 'smartmeetingfjuim@gmail.com',
                    //收件者
                    to: recipient,    
                    //主旨
                    subject: '專案' + results.rows[0].pro_name + '有檔案重新上傳', // Subject line
                    //嵌入 html 的內文
                    html: '<p>專案' + results.rows[0].pro_name + '有檔案 '+ req.file.originalname +' 重新上傳<br>請登入系統觀看。</p><p>智慧會議系統團隊</p>',    
                };
            
                //發送信件方法
                transporter.sendMail(options, function(error, info){
                    if(error){
                        console.log("發送失敗");
                    }else{
                        console.log("發送成功");
                    }
                });
            });

            res.redirect('/member/'+proid);
        });
    })
});

//修改重新上傳 
router.post('/revise', upload.single('reviseFile'), function(req, res, next){
    var recipient = "";
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
            
            pool.query("SELECT * FROM account_project, project, record WHERE ap_proid=pro_id AND ap_proid=$1 AND ap_authority='擁有者' AND rec_id=$2", [proid, id]).then(results => {
                var options = {
                    //寄件者
                    from: 'smartmeetingfjuim@gmail.com',
                    //收件者
                    to: results.rows[0].ap_accid,    
                    //主旨
                    subject: '專案' + results.rows[0].pro_name + '有已確立檔案須審核', // Subject line
                    //嵌入 html 的內文
                    html: '<p>專案'+ results.rows[0].pro_name + '有已確立檔案 '+ results.rows[0].rec_name +' 須審核<br>請登入系統觀看。</p><p>智慧會議系統團隊</p>',    
                };
            
                //發送信件方法
                transporter.sendMail(options, function(error, info){
                    if(error){
                        console.log("發送失敗");
                    }else{
                        console.log("發送成功");
                    }
                });
            })
            pool.query("SELECT * FROM account_project, project, record WHERE ap_proid=pro_id AND ap_proid=$1 AND ap_authority='參與者' AND rec_id=$2", [proid, id]).then(results => {
                for(let i=0; i<results.rowCount; i++) {
                    recipient += results.rows[i].ap_accid;
                    if(i<results.rowCount-1){
                        recipient += ',';
                    }
                }  
            
                var options = {
                    //寄件者
                    from: 'smartmeetingfjuim@gmail.com',
                    //收件者
                    to: recipient,    
                    //主旨
                    subject: '專案' + results.rows[0].pro_name + '有檔案上傳', // Subject line
                    //嵌入 html 的內文
                    html: '<p>專案' + results.rows[0].pro_name + '有檔案 '+ results.rows[0].rec_name +' 上傳<br>請登入系統觀看。</p><p>智慧會議系統團隊</p>',    
                };
            
                //發送信件方法
                transporter.sendMail(options, function(error, info){
                    if(error){
                        console.log("發送失敗");
                    }else{
                        console.log("發送成功");
                    }
                });
            });

            res.redirect('/member/'+proid);
        });
    })
});


module.exports = router;