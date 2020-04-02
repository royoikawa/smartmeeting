var express = require('express');
var router = express.Router();
var pool = require('../models/db');

//預覽畫面
const testFolder = 'D:/txt';
const fs = require('fs');
var mammoth = require("mammoth");

// router.get('/showfile/:recid', function(req, res, next) {
//     var filelist = new Array();
//     const filedata = new Array();
//     var rec_id = req.params.recid;
//     //var options = {
//     //    styleMap: [
//     //        "p[style-name='Section Title'] => h1:fresh",
//     //        "p[style-name='Subsection Title'] => h2:fresh",
//     //        "b => em",
//     //        "i => strong",
//     //        "u => em",
//     //        "strike => del"
//     //    ]
//     //};
//     //filedata.push("1");
//     //console.log("abc");
//     // fs.readdirSync(testFolder).forEach(file => {
//     //   filelist.push(file);
//     //   fs.readFile(file, (err, data) => { 
//     //     mammoth.extractRawText({ path: "C:/Users/Admin/Desktop/wordmeeting/"+file })
//     //     .then(function (result) {
//     //       var text = result.value; // The raw text 
  
//     //       //console.log("text:"+text);
//     //       //filedata.push(text);
//     //       //var messages = result.messages;
//     //     }).done();
  
//     //   }) 
//     //   //console.log("file:"+file);
//     // });
//     var a = new Promise(function (resolve, reject) {
      
//         fs.readdir(testFolder, (err, files) => {
//             files.forEach(file => {
//                 if (file == rec_id) {
//                     filelist.push(file);
//                     //console.log("C:/Users/Admin/Desktop/wordmeeting/" + file);
//                     mammoth.extractRawText({ path: "D:/txt/" + file }).then(function (result) {
//                         var text = result.value; // The raw text 
                        
//                         //console.log(text);
//                         filedata.push(text);
//                         //console.log("file1:" + filedata[1]);
//                         // var messages = result.messages;
//                     }).done();
//                     resolve('hello world');
//                     // console.log("file000:" + filedata[1]);
//                     // console.log("file" + file);
//                 }
//             });
  
//         });
//     });
  
   
//     a.then(function(value) {
//       console.log(value);
//        setTimeout(function () { 
//          res.render('showfile', { title: 'Smartmeeting', filedata: filedata });
//        }, 200);
//     });
//     a.catch(function(value) {
//         console.log("error");
//     });
// });

//顯示 member 首頁
var pro_id;
var pro_name;
var recPlusAcc;
var aggTags;
router.all('/:proid', function(req, res, next) {
    pro_id = req.params.proid;
    var searchRecord = req.body.searchRecord;
    var state = req.body.filter;
    var s = "";
    var filter = "";
    var checkbox = [true, true, true];
    var q = 'SELECT pro_name FROM project WHERE pro_id = $1';
    pool.query(q, [pro_id], function(err, results) {
        if (err) throw err;
        pro_name = results.rows[0].pro_name;
        if (searchRecord != null) {
            s = " AND (tag_names LIKE '%" + searchRecord + "%' OR rec_name LIKE '%" + searchRecord + "%')";
        }

        if (state) {
            state = JSON.parse(state);
            filter += " AND (";
            checkbox = [false, false, false];
            for (var i in state.val) {
                if (state.val[i] == "審核不通過") {
                    checkbox[0] = true;
                } else if (state.val[i] == "審核中") {
                    checkbox[1] = true;
                } else if (state.val[i] == "已確立檔案") {
                    state.val[i] = "";
                    checkbox[2] = true;
                }
                if (i >= 1) {
                    filter += " OR ";
                }
                filter += "rec_state = '" + state.val[i] + "'";
            }
            filter += ")";
        }
        
        if (checkbox[0] == false && checkbox[1] == false && checkbox[2] == false ) {
            res.render('member', { title: 'SmartMeeting', username: req.session.userName, pro_id: pro_id, pro_name: pro_name, record: [], cb: checkbox });
        } else {
            recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id";
            aggTags = "SELECT tag_recid, string_agg(tag_name,',') AS tag_names FROM tag WHERE tag_proid = $1 GROUP BY tag_recid";
            q = "SELECT * FROM (" + recPlusAcc + ") AS ra, (" + aggTags + ") AS t WHERE tag_recid = rec_id" + s + filter + " ORDER BY rec_time DESC";
            pool.query(q, [pro_id], function(err, results) {
                if (err) throw err;
                data_rec_t_a = results.rows;
                //res.json(data_rec_t_a);           
                res.render('member', { title: 'SmartMeeting', username: req.session.userName, pro_id: pro_id, pro_name: pro_name, record: data_rec_t_a, cb: checkbox });
            });
        }
    })
});

//顯示record 詳細資料頁面
router.get('/:proid/:rec_id', function(req, res, next) {
    pro_id = req.params.proid;
    var recid = req.params.rec_id;
    recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id AND rec_id = $1";
    aggTags = "select tag_recid, string_agg(tag_name,',') as tag_names from tag where tag_proid=$2 group by tag_recid";
    var q = "SELECT * FROM (" + recPlusAcc + ") AS ra, (" + aggTags + ") AS t WHERE tag_recid = rec_id";;
    pool.query(q, [recid, pro_id]).then(results => {
        data = results.rows;
        res.render('memberMinute', { title: 'SmartMeeting', username: req.session.userName, pro_id: pro_id, pro_name: pro_name, record: data });
    });
    next();
});

router.get('/:proid/:rec_id', function(req, res, next) {
    pro_id = req.params.proid;
    var recid = req.params.rec_id;
    //recPlusAcc = "SELECT * FROM record, account WHERE rec_upload = acc_id AND rec_id = $1";
    //aggTags = "select tag_recid, string_agg(tag_name,',') as tag_names from tag where tag_proid=$2 group by tag_recid";
    //var q = "SELECT * FROM (" + recPlusAcc + ") AS ra, (" + aggTags + ") AS t WHERE tag_recid = rec_id";;
    var q = "SELECT * FROM tag WHERE tag_proid = $1";
    pool.query(q, [pro_id]).then(results => {
        data = results.rows;
        //res.json(data);
        res.render('memberMinute', { title: 'SmartMeeting', username: req.session.userName, pro_id: pro_id, pro_name: pro_name, record: data });
    })
});

module.exports = router;