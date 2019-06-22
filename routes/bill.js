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
  MM = date.getMonth() + 1,
  dd = date.getDate(),
  hh = date.getHours(),
  mm = date.getMinutes(),
  ss = date.getSeconds()

const  time = yy + '-' + MM + '-' + dd + ' ' + hh + ':' + mm + ':' + ss

// 创建账单
router.post('/add', check.checkLogin, (req, res, next) => {
  const payer = req.session.user.name
  const num = +req.body.num
  const date = req.body.date
  const sharer = req.body.sharer.split(',')
  const remark = req.body.remark


  if (!num) {
    responseData.code = responseCode.paramsErrorCode
    responseData.desc = '账单金额不能为空'
    return res.json(responseData)
  }
  if (typeof(num) != 'number') {
    responseData.code = responseCode.paramsErrorCode
    responseData.desc = '账单金额必须为数字'
    return res.json(responseData)
  }
  if (!sharer.length) {
    responseData.code = responseCode.paramsErrorCode
    responseData.desc = '账单承担人不能为空'
    return res.json(responseData)
  }

  let bill = {
    payer: payer,
    num: num,
    date: date,
    sharer: sharer,
    remark: remark,
    status: false,//账单创建时默认为未结算
    average: num/sharer.length, //账单均分金额
    createTime: time
  }

  Model.Bill.create(bill).then(newBill => {
    responseData.code = responseCode.normalCode
    responseData.desc = '账单创建成功'
    res.json(responseData)
  })
})

// 结算账单
router.post('/close', check.checkLogin, (req, res, next) => {
  const changer = req.session.user.name

  Model.Bill.updateMany({ 'status': false }, { $set: { 'status': true,'changer': changer  }}, function (error, doc) {
    if (error) {
      console.log(error)
    } else{
      responseData.code = responseCode.normalCode
      responseData.desc = '结算成功'
      res.json(responseData)
    }
  })

})

// 数据汇总
router.get('/queryTypeData', check.checkLogin, (req, res, next) => {
  const payer = req.session.user.name
  Promise.all([
    Model.Bill.find({ status: true }),//已结算总账单
    Model.Bill.find({ payer: payer }),//累计支出账单
    Model.Bill.find({ status: false }),//未结算总账单
    Model.Bill.find({ payer: payer, status: false,  }),//未结算支出账单
    Model.Bill.find({ sharer: { $in: [payer] } ,status: false }),// 用户当前尚未结算的账单
  ]).then(result => {
    const closeSumBills = result[0]
    const paySumBills = result[1]
    const unCloseSumBills = result[2]
    const unClosePayBills = result[3]
    const userUnCloseBills = result[4]

    console.log(userUnCloseBills)
    // 已结算总数
    let closeSum = closeSumBills.reduce((total, item, index, arr) => {
      return total + (+item.num)
    }, 0)

    //累计已支出
    let sumPay = paySumBills.reduce((total, item, index, arr) => {
      return total + (+item.num)
    }, 0)

    // 未结算总数
    let unCloseSum = unCloseSumBills.reduce((total, item, index, arr) => {
      return total + (+item.num)
    },0)

    // 未结算支出
    let unClosePay = unClosePayBills.reduce((total, item, index, arr) => {
      return total + (+item.num)
    }, 0)

    //本期累计应付
    let userUnPay = userUnCloseBills.reduce((total, item, index, arr) => {
      return total + (+item.average)
    }, 0)

    //本期剩余未付(负值则表示可收入)
    let shouldPay = userUnPay - unClosePay

    let data = {
      closeSum: closeSum.toFixed(2),
      sumPay: sumPay.toFixed(2),
      unCloseSum: unCloseSum.toFixed(2),
      unClosePay: unClosePay.toFixed(2),
      shouldPay: shouldPay.toFixed(2)
    }

    responseData.code = responseCode.normalCode
    responseData.data = data
    responseData.desc = '成功'
    res.json(responseData)
  })
})




module.exports = router
