const express = require('express')
const bodyParser = require('body-parser')
const http = require('http')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)

const bill = require('./routes/bill')
const user = require('./routes/user')

const app = express()

app.use(session({
  name: 'jtdx1007', //设置cookie中保存 session id 的字段名称
  secret: 'jtdx1007', // 通过设置secret来计算hash值并放在cookie中，使产生的signedCookie放篡改
  resave: true, //强制更新 session
  saveUninitialized: false, //设置为 false，强制创建一个session，即使用户未登录
  cookie: {
    maxAge: 2592000000 //过期时间，过期后cookie中的 session id 自动删除
  },
  store: new MongoStore({  //将session存储到mongodb
    url: 'mongodb://localhost:27017/jtdx'  //mongodb 地址
  }),
}))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/bills', bill);
app.use('/user', user);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});




// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.user =  req.session.user
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.log(err.message)
  // render the error page
  res.status(err.status || 500);
  res.json({
    code: 500,
    desc: '服务器错误'
  })
});



app.set('port', 3000)

const server = http.createServer(app)


server.listen(3000, () => { console.log('listening on 3000') })


