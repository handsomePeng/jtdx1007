const responseCode = require('../config/responseCode')
module.exports = {
  checkLogin: function checkLogin(req, res, next) {
    if (!req.session.user) {
      return res.json({
        code: responseCode.loginErrorCode,
        desc: '用户未登录'
      })
    }
    next()
  },
  checkNotLogin: function checkNotLogin(req, res, next) {
    console.log('kkkkkkkkkkkkkkkkkkkkkkkkkk================',req.session)
    if (req.session && req.session.user) {
      return res.json({
        code: responseCode.loginOutErrorCode,
        desc: '用户已登录'
      })
    }
    next()
  }
}