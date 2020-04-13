var express = require('express');
var router = express.Router();
var pg = require('../models/db');
var solr = require('../models/solr');

router.get('/', function(req, res) {
  var data;
  var sql = "SELECT * FROM record";
  pg.query(sql, function(err, results){
    if (err) throw err;
    data = results.rows;
    res.render('test', { title: 'test', data: data});
  })
});

router.post('/', function(req, res) {
  //資料庫查詢方法
  // const sql = 'SELECT * FROM account'//若有參數改成 'SELECT * FROM account WHERE acc_id=$1'
  // //var value = [req.body.loginacc]
  // pg.query(sql).then(results => {//若有參數改成 pg.query(sql, value).then(results => {
  //   //results.rowCount列出所有筆數
  //   //results.rows列出所有筆數的全部資料
  //   //results.rows[0]列出第0筆全部資料
  //   //results.rows[0].colName列出第0筆資料欄位名稱的資料
  //   res.json({"count": results.rowCount, "alldata":results.rows, "data[0]":results.rows[0], "acc_id": results.rows[0].acc_id})
      
  //   /*const rows = results.rows;
  //   rows.map(row => {
  //       res.json({"count": row.rowCount, "data": row})//row是第0筆的全部資料、row.colName是第0筆欄位名稱的資料 我只會列第0筆後面的列不出來
  //   })*/      
  // })

  //關鍵字查詢solr檔案 
  var query = req.body.loginacc;
  var arr = [];
  var strquery = solr.query().q('text:'+ query);//text是檔案的內文
  solr.search(strquery, function(err, results) {
    // if(err){
    //   res.json({"關鍵字": query, "err": err});
    // }
    // res.json({"關鍵字": query, "length": result.response.numFound, "name": result.response.docs[0].fileName, "data": result.response});
    for(var i=0; i<results.response.numFound; i++){
      var filename = results.response.docs[i].fileName;
      arr[i] = filename.substring(0, filename.lastIndexOf('.')-21)+filename.substring(filename.lastIndexOf('.'));
    }
    //res.send(arr);
    //aggTags = "SELECT tag_recid, string_agg(tag_name,',') AS tag_names FROM tag WHERE tag_proid = $1 GROUP BY tag_recid";
    var p = "SELECT * FROM record WHERE rec_name = ANY($1::text[])";  
    pg.query(p, [arr]).then(results => {
      res.send(results.rows)
    })
  })
  
  

})

module.exports = router;