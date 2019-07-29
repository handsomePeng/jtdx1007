const express = require('express')
const router = express.Router()
const Model = require('../data/mongodb')
const responseCode =  require('../config/responseCode')
const check = require('../middlewares/check')

// 所有请求都要经过这一步，统一请求返回的数据格式

let responseData

router.use((req, res, next) => {
  responseData = {
    code: 1000,
    desc: ''
  }
  next()
})

// 定义时间格式

const date = new Date(),
  yy = date.getFullYear(),
  MM = (date.getMonth() + 1) >= 10 ? (date.getMonth() + 1) : ('0'+(date.getMonth() + 1)),
  dd = (date.getDate()) >= 10 ? (date.getDate()) : ('0'+(date.getDate())),
  hh = (date.getHours()) >= 10 ? (date.getHours()) : ('0'+(date.getHours())),
  mm = (date.getMinutes()) >= 10 ? (date.getMinutes()) : ('0'+(date.getMinutes())),
  ss = (date.getSeconds()) >= 10 ? (date.getSeconds()) : ('0'+(date.getSeconds()))

const  time = yy + '-' + MM + '-' + dd + ' ' + hh + ':' + mm + ':' + ss

// 用户注册
router.post('/signUp', (req, res, next) => {
  const name = req.body.name
  const password = req.body.password
  const checkPassword = req.body.checkPassword
  if (password !== checkPassword) {
    responseData.code = responseCode.paramsErrorCode
    responseData.desc = '两次输入的密码不一致'
    res.json(responseData)
    return
  }

  const newUser = {
    name: name,
    password: password,
    createTime: time
  }

  Model.User.findOne({name: name}).then(userInfo => {
    if (userInfo) {
      responseData.code = responseCode.paramsErrorCode
      responseData.desc = '用户已被注册'
      res.json(responseData)
      return
    }
    Model.User.create(newUser).then(newUserInfo => {
      responseData.code = responseCode.normalCode
      responseData.desc = '注册成功'
      res.json(responseData)
    })
  })
})

// 用户登录
router.post('/login', check.checkNotLogin, (req, res, next) => {
  const name = req.body.name
  const password = req.body.password

  Model.User.findOne({name: name, password: password}).then(userInfo => {
    if (!userInfo) {
      responseData.code = responseCode.paramsErrorCode
      responseData.desc = '用户名或密码错误'
      res.json(responseData)
    }else{
      responseData.code = responseCode.normalCode
      responseData.message = '登录成功'
      let user = userInfo.toObject()
      delete user.password
      req.session.user = user
      res.json(responseData)
    }
  })
})

// 退出登录
router.get('/signOut', check.checkLogin, (req, res, next) => {
  req.session.user = null
  responseData.code = responseCode.normalCode
  responseData.message = '退出成功'
  res.json(responseData)
})

// 获取当前用户的信息
router.get('/getUserInfo', check.checkLogin, (req, res, next) => {
  const name = req.session.user.name

  Model.User.findOne({ name: name }).then(userInfo => {
    responseData.code = responseCode.normalCode
    let user = userInfo.toObject()
    delete user.password
    responseData.data = user
    responseData.desc = '成功'
    res.json(responseData)
  })

})

// 获取用户列表
router.get('/getUserList', (req, res, next) => {
  let page = Number(req.query.page || 1)
  let limit = Number(req.query.limit || 10)
  let pages = 0
  Model.User.countDocuments().then(count => {
    pages = Math.ceil(count/limit)
    page = Math.min(page, pages)
    page = Math.max(page, 1)
    let skip = (page - 1)*limit
    Model.User.find({}).sort({_id: -1}).limit(limit).skip(skip).then(doc =>{
      responseData.code = responseCode.normalCode
      responseData.desc = '用户列表'
      let data = [...doc.map((item, index) => {
        return {
          name: item.name,
          _id: item._id
        }
      })]
      responseData.data = data
      responseData.page = page
      responseData.limit = limit
      responseData.pages = pages
      responseData.skip = skip
      res.json(responseData)
    })
  })
})



module.exports = router
