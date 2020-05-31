var express = require('express');
var router = express.Router();
var pool = require('../models/db');
var fs = require('fs');
var moment = require("moment");
var tz = require("moment-timezone");
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

var data;
var pro_name;
var prodata;
var notice;

router.all('/:id_join', function(req, res, next) {
    console.log("isisis");
    if(!req.session.userAccount){//若沒登入，跳到登入頁
        res.redirect('/login');
    }
    var pro_id = req.params.id_join;
    //通知
    var sql = "SELECT * FROM notice, record, project, account_project WHERE notice_recid=rec_id AND rec_proid=pro_id AND pro_id=ap_proid AND ap_accid=$1 ORDER BY notice_time DESC";
    pool.query(sql,[req.session.userAccount]).then(results => {
        notice = results.rows;
        //專案參與者資料
        var pro = "SELECT * FROM project, account_project, account WHERE ap_accid=acc_id AND ap_proid=pro_id AND pro_id=$1 AND ap_authority!='擁有者'";
        pool.query(pro, [pro_id]).then(results => {
            prodata = results.rows;
            next();
        })
    })
});

router.get('/:id_join', function(req, res, next) {    
    console.log("wewewe");
    var pro_id = req.params.id_join;     
    
    var q = "SELECT pro_name FROM project WHERE pro_id = $1";
    pool.query(q, [pro_id]).then(results => {     
        pro_name = results.rows[0].pro_name;       
        var recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id AND rec_proid=$1 AND rec_state = '審核中'";
        var aggTags = "SELECT tag_recid, string_agg(tag_name,',') AS tag_names FROM tag WHERE tag_proid = $1 GROUP BY tag_recid";
        q = "SELECT * FROM (" + recPlusAcc + ") AS ra LEFT JOIN (" + aggTags + ") AS t ON tag_recid = rec_id ORDER BY rec_time DESC";
        pool.query(q, [pro_id], function(err, results) {
            if (err) throw err;
            data = results.rows;
            //res.json(data);
            for (var i in data) {
                if (data[i].tag_names != null)
                    data[i].tag_names = data[i].tag_names.split(",");
            }
            res.render('admin', { 
                title: 'SmartMeeting',
                username: req.session.userName, 
                userid: req.session.userAccount,
                pro_id: pro_id, 
                pro_name: pro_name, 
                review: data,
                prodata: prodata,
                notice: notice
            });
        })
    })
    
});

//顯示會議記錄詳細資訊
router.get('/:proid/:rec_id', function(req, res, next) {
    //通知
    var sql = "SELECT * FROM notice, record, project, account_project WHERE notice_recid=rec_id AND rec_proid=pro_id AND pro_id=ap_proid AND ap_accid=$1 ORDER BY notice_time DESC";
    pool.query(sql,[req.session.userAccount]).then(results => {
        notice = results.rows;
    })

    pro_id = req.params.proid;
    var recid = req.params.rec_id;
    recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id AND rec_id = $1";
    aggTags = "SELECT tag_recid, string_agg(tag_name,',') AS tag_names FROM tag WHERE tag_proid=$2 GROUP BY tag_recid";
    var q = "SELECT * FROM (" + recPlusAcc + ") AS ra LEFT JOIN (" + aggTags + ") AS t ON tag_recid = rec_id";
    pool.query(q, [recid, pro_id]).then(results => {
        data = results.rows;
        res.render('adminReview', { 
            title: 'SmartMeeting', 
            username: req.session.userName,
            userid: req.session.userAccount, 
            pro_id: pro_id, 
            pro_name: pro_name, 
            record: data,
            notice: notice
        });
    });
});

//審核上傳
router.post('/:proid/:recid/audit', function(req, res, next){
    console.log("audit");
    var recipient = "";
    var proid = req.params.proid;
    var id = req.params.recid;
    var reason = req.body.denyReason;
    var time = moment(new Date()).tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss");
    if(!reason) {
        // 擁有者審核通過                       
        var sql = "INSERT INTO notice (notice_recid, notice_action, notice_time) VALUES ($1, $2, $3)";
        pool.query(sql, [id, "新檔案確立", time]).then(() => {               
            sql = "UPDATE record SET rec_state=null, rec_time=$1 WHERE rec_id=$2";
            pool.query(sql, [time, id]).then(() => {

                pool.query("SELECT * FROM account_project, project, record WHERE ap_proid=pro_id AND ap_proid=$1 AND rec_id=$2 AND rec_upload=ap_accid", [proid, id]).then(results => {
                    var options = {
                        //寄件者
                        from: 'smartmeetingfjuim@gmail.com',
                        //收件者
                        to: results.rows[0].ap_accid,    
                        //主旨
                        subject: '專案' + results.rows[0].pro_name + '有檔案審核通過', // Subject line
                        //嵌入 html 的內文
                        html: '<p>專案'+ results.rows[0].pro_name + ' 您上傳的檔案 '+ results.rows[0].rec_name +' 審核通過<br>請登入系統觀看。</p><p>智慧會議系統團隊</p>',    
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
                pool.query("SELECT * FROM account_project, project, record WHERE ap_proid=pro_id AND ap_proid=$1 AND ap_authority='參與者' AND rec_id=$2 AND rec_upload!=ap_accid", [proid, id]).then(results => {
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
                        subject: '專案' + results.rows[0].pro_name + '有新檔案確立', // Subject line
                        //嵌入 html 的內文
                        html: '<p>專案' + results.rows[0].pro_name + '有新檔案 '+ results.rows[0].rec_name +' 確立<br>請登入系統觀看。</p><p>智慧會議系統團隊</p>',    
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
                
                res.redirect('/admin/'+proid);
            })
        })        
    }
    else {
        // 擁有者審核不通過          
        var sql = "INSERT INTO notice (notice_recid, notice_action, notice_time) VALUES ($1, $2, $3)";
        pool.query(sql, [id, "審核不通過", time]).then(() => {
            sql = "UPDATE record SET rec_state='審核不通過', rec_reason=$1, rec_time=$2 WHERE rec_id=$3";
            pool.query(sql, [reason, time, id]).then(() => {

                pool.query("SELECT * FROM account_project, project, record WHERE ap_proid=pro_id AND ap_proid=$1 AND rec_id=$2 AND rec_upload=ap_accid", [proid, id]).then(results => {
                    var options = {
                        //寄件者
                        from: 'smartmeetingfjuim@gmail.com',
                        //收件者
                        to: results.rows[0].ap_accid,    
                        //主旨
                        subject: '專案' + results.rows[0].pro_name + '有檔案審核不通過', // Subject line
                        //嵌入 html 的內文
                        html: '<p>專案'+ results.rows[0].pro_name + ' 您上傳的檔案 '+ results.rows[0].rec_name +' 審核不通過，需重新上傳<br>請登入系統觀看。</p><p>智慧會議系統團隊</p>',    
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
                // 審核不過非上傳者的郵件
                // pool.query("SELECT * FROM account_project, project, record WHERE ap_proid=pro_id AND ap_proid=$1 AND ap_authority='參與者' AND rec_id=$2 AND rec_upload!=ap_accid", [proid, id]).then(results => {
                //     for(let i=0; i<results.rowCount; i++) {
                //         recipient += results.rows[i].ap_accid;
                //         if(i<results.rowCount-1){
                //             recipient += ',';
                //         }
                //     }  
                //
                //     var options = {
                //         //寄件者
                //         from: 'smartmeetingfjuim@gmail.com',
                //         //收件者
                //         to: recipient,    
                //         //主旨
                //         subject: '專案' + results.rows[0].pro_name + '檔案審核不通過', // Subject line
                //         //嵌入 html 的內文
                //         html: '<p>專案' + results.rows[0].pro_name + '檔案 '+ results.rows[0].rec_name +' 審核不通過<br>請登入系統觀看。</p><p>智慧會議系統團隊</p>',    
                //     };
                
                //     //發送信件方法
                //     transporter.sendMail(options, function(error, info){
                //         if(error){
                //             console.log("發送失敗");
                //         }else{
                //             console.log("發送成功");
                //         }
                //     });
                // });

                res.redirect('/admin/'+proid);
            })
        })      
    }   
});

//審核修改
router.post('/', function(req, res, next){
    var recipient = "";
    var proid = req.query.proid;
    var id = req.query.recid;
    var reason = req.body.denyReason2;
    var time = moment(new Date()).tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss");
    if(!reason) {
        // 擁有者修改通過 刪除原檔案       
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
                    pool.query("SELECT * FROM account_project, project, record WHERE ap_proid=pro_id AND ap_proid=$1 AND rec_id=$2 AND rec_upload=ap_accid", [proid, id]).then(results => {
                        var options = {
                            //寄件者
                            from: 'smartmeetingfjuim@gmail.com',
                            //收件者
                            to: results.rows[0].ap_accid,    
                            //主旨
                            subject: '專案' + results.rows[0].pro_name + '有檔案修改通過', // Subject line
                            //嵌入 html 的內文
                            html: '<p>專案'+ results.rows[0].pro_name + ' 您修改的檔案 '+ results.rows[0].rec_name +' 審核通過<br>請登入系統觀看。</p><p>智慧會議系統團隊</p>',    
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
                    pool.query("SELECT * FROM account_project, project, record WHERE ap_proid=pro_id AND ap_proid=$1 AND ap_authority='參與者' AND rec_id=$2 AND rec_upload!=ap_accid", [proid, id]).then(results => {
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
                            subject: '專案' + results.rows[0].pro_name + '有檔案已修改', // Subject line
                            //嵌入 html 的內文
                            html: '<p>專案' + results.rows[0].pro_name + ' 有檔案 '+ results.rows[0].rec_name +' 已修改<br>請登入系統觀看。</p><p>智慧會議系統團隊</p>',    
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
                    res.redirect('/admin/'+proid);
                })
            })        
        })
    }
    else {
        // 擁有者修改不通過 刪除新檔案 
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

                    pool.query("SELECT * FROM account_project, project, record WHERE ap_proid=pro_id AND ap_proid=$1 AND rec_id=$2 AND rec_upload=ap_accid", [proid, id]).then(results => {
                        var options = {
                            //寄件者
                            from: 'smartmeetingfjuim@gmail.com',
                            //收件者
                            to: results.rows[0].ap_accid,    
                            //主旨
                            subject: '專案' + results.rows[0].pro_name + '有修改檔案審核不通過', // Subject line
                            //嵌入 html 的內文
                            html: '<p>專案'+ results.rows[0].pro_name + ' 您修改的檔案 '+ results.rows[0].rec_name +' 審核不通過<br>請登入系統觀看。</p><p>智慧會議系統團隊</p>',    
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
                    // 修改審核不過非上傳者的郵件
                    // pool.query("SELECT * FROM account_project, project, record WHERE ap_proid=pro_id AND ap_proid=$1 AND ap_authority='參與者' AND rec_id=$2 AND rec_upload!=ap_accid", [proid, id]).then(results => {
                    //     for(let i=0; i<results.rowCount; i++) {
                    //         recipient += results.rows[i].ap_accid;
                    //         if(i<results.rowCount-1){
                    //             recipient += ',';
                    //         }
                    //     }  
                    //
                    //     var options = {
                    //         //寄件者
                    //         from: 'smartmeetingfjuim@gmail.com',
                    //         //收件者
                    //         to: recipient,    
                    //         //主旨
                    //         subject: '專案' + results.rows[0].pro_name + '有修改檔案審核不通過', // Subject line
                    //         //嵌入 html 的內文
                    //         html: '<p>專案' + results.rows[0].pro_name + ' 修改檔案 '+ results.rows[0].rec_name +' 審核不通過<br>請登入系統觀看。</p><p>智慧會議系統團隊</p>',    
                    //     };
                    
                    //     //發送信件方法
                    //     transporter.sendMail(options, function(error, info){
                    //         if(error){
                    //             console.log("發送失敗");
                    //         }else{
                    //             console.log("發送成功");
                    //         }
                    //     });
                    // });
                    res.redirect('/admin/'+proid);
                })
            })        
        })
    }  
});

//專案管理
router.post('/:proid/pm/change', function(req, res, next){
    var proid = req.params.proid;
    var proname = req.body.proname;
    var propw = req.body.propw;
    var newpropw1 = req.body.newpropw1;
    var member = req.body.member;
    var chpw = req.body.chpw;
    var newadmin = req.body.newadmin;
    if(proname){//更改專案名稱
        console.log("ds");
        var sql = "UPDATE project SET pro_name=$1 WHERE pro_id=$2";
        pool.query(sql, [proname, proid], function(err) {
            if(err) throw err;
            res.redirect('/admin/'+proid);
        })
    }
    if(propw && newpropw1){//更改密碼
        var checkpw = "SELECT * FROM project WHERE pro_id=$1 and pro_pw=$2";
        pool.query(checkpw, [proid, propw]).then(results => {
            if(results.rowCount == 0){
                res.json({"status": 1, "msg": "專案密碼錯誤"});
            }
            else{
                var updatepw = "UPDATE project SET pro_pw=$1 WHERE pro_id=$2";
                pool.query(updatepw, [newpropw1, proid])                  
                res.json({"status": 0, "msg": "success"});
            }
        })
    }
    if(member){//移除參與者    
        var delmem = "DELETE FROM account_project WHERE ap_accid=$1 and ap_proid=$2";
        pool.query(delmem, [member, proid])
        res.json({"status": 0})       
    }
    if(chpw){//認證擁有者密碼
        var adminpw = "SELECT * FROM account WHERE acc_id=$1 and acc_pw=$2";
        pool.query(adminpw, [req.session.userAccount, chpw]).then(results => {
            if(results.rowCount == 0){
                res.json({"status": 1, "msg": "密碼錯誤"})
            }
            else{
                res.json({"status": 0, "msg": "success"})
            }
        })
    }
    if(newadmin){//換新的擁有者
        var chadmin1 = "UPDATE account_project SET ap_authority='參與者' WHERE ap_proid=$1 and ap_authority='擁有者'";
        pool.query(chadmin1, [proid]).then(() => {
            var chadmin2 = "UPDATE account_project SET ap_authority='擁有者' WHERE ap_proid=$1 and ap_accid=$2";
            pool.query(chadmin2, [proid, newadmin])
            res.redirect('/');
        })
    }
})

module.exports = router;