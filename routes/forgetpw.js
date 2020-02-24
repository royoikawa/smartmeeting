var express = require('express');
var router = express.Router();
var pg = require('../models/db');
var nodemailer = require('nodemailer');
var crypto = require('crypto');

router.get('/', function(req, res, next) {
    res.render('forgetpw', { title: '忘記密碼'});
});

router.post('/', function(req, res) {
    var newpw = crypto.randomBytes(32).toString('base64').substr(0, 10);//產生長度為10的亂數密碼
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
        /*
        service: 'Gmail',
        auth: {
            user: 'smartmeetingfjuim@gmail.com',
            pass: 'meet/530'
        }*/
    });

    var text = 'SELECT * FROM account where acc_id=$1'  
    pg.query(text, [req.body.email]).then(results => {
        if (results.rowCount == 0){
            res.json({"status":1, "msg": "請輸入註冊時的帳號"})
        }       
        else{
            var update = "UPDATE account SET acc_pw=$1 WHERE acc_id=$2";
            pg.query(update, [newpw, req.body.email]);
            var options = {
                //寄件者
                from: 'smartmeetingfjuim@gmail.com',
                //收件者
                to: req.body.email,    
                //主旨
                subject: '忘記密碼', // Subject line
                //嵌入 html 的內文
                html: '<h2>取回密碼</h2> <p> 您的新密碼是 '+ newpw +'<br>請登入系統更改密碼。</p><p>智慧會議系統團隊</p>',    
            };
            
            //發送信件方法
            transporter.sendMail(options, function(error, info){
                if(error){
                    res.json({"status":1, "msg":"發送失敗" });
                }else{
                    res.json({"status":0, "msg":"發送成功"});
                }
            });
            
       }
    })
    
});

module.exports = router;