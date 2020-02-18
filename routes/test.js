var express = require('express');
var router = express.Router();
var pg = require('../models/db');

router.get('/', function(req, res) {
  res.render('test', { title: 'test'});
});

router.post('/', function(req, res) {

  const sql = 'SELECT * FROM account'//若有參數改成 'SELECT * FROM account WHERE acc_id=$1'
  //var value = [req.body.loginacc]
  pg.query(sql).then(results => {//若有參數改成 pg.query(sql, value).then(results => {
    //results.rowCount列出所有筆數
    //results.rows列出所有筆數的全部資料
    //results.rows[0]列出第0筆全部資料
    //results.rows[0].colName列出第0筆資料欄位名稱的資料
    res.json({"count": results.rowCount, "alldata":results.rows, "data[0]":results.rows[0], "acc_id": results.rows[0].acc_id})
      
    /*const rows = results.rows;
    rows.map(row => {
        res.json({"count": row.rowCount, "data": row})//row是第0筆的全部資料、row.colName是第0筆欄位名稱的資料 我只會列第0筆後面的列不出來
    })*/
    
      
      
  })

})

module.exports = router;