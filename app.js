var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');//session
var PostgreSqlStore = require('connect-pg-simple')(session);//connect-pg-simple
var logger = require('morgan');

const pg = require('./models/db');//引入session存在postgresql所需要設定的連線池
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var registerRouter = require('./routes/register');//register
var loginRouter = require('./routes/login');//login
var forgetpwRouter = require('./routes/forgetpw');//forgetpw
var logoutRouter = require('./routes/logout');//logout
var personalSettingRouter = require('./routes/personalSetting');//personalSetting
var testRouter = require('./routes/test');//test我測試查詢用的

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const sessionOptions = {
  secret:'secret',
  resave:false,
  saveUninitialized:true,
  cookie: {maxAge: 30*24*60*60*1000},//30 days
  store:new PostgreSqlStore({
    pool: pg,  
  })
}

app.use(session(sessionOptions));
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/register', registerRouter);//register
app.use('/login', loginRouter);//login
app.use('/forgetpw', forgetpwRouter);//forgetpw
app.use('/logout', logoutRouter);//logout
app.use('/personalSetting', personalSettingRouter);//personalSetting
app.use('/test', testRouter);//test我測試查詢用的

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
