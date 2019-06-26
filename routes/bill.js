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

// 查询账单
router.post('/queryBillList', check.checkLogin, (req, res, next) =>{
  const payer = req.body.payer || undefined
  const sharer = req.body.sharer || undefined
  const changer = req.body.changer || undefined
  const remark = req.body.remark || undefined
  const startTimes = req.body.startTimes || undefined
  const endTimes = req.body.endTimes || undefined
  const status = req.body.status || undefined
  const currentPage = +req.body.currPage || 1 // 当前页
  const pageSize = +req.body.pageSize || 10 // 每页条数
  let skip = (currentPage - 1)*pageSize // 跳过的条数

  //查询条件
  const query = {}
  // 支付人
  if (payer) {
    query.payer =  payer
  }
  // 结算人
  if (changer) {
    query.changer =  changer
  }
  // 备注模糊匹配
  if (remark) {
    query.remark =  new  RegExp(remark)
  }
  // 结算状态
  if (status != undefined) {
    query.status =  status
  }
  // 承担人
  if (sharer) {
    query.sharer =  { $in: [payer] }
  }
  // 花费时间===>时间范围筛选
  let timeRound = {}
  if (startTimes) {
    timeRound['$gte'] =  startTimes
    query.date = timeRound
  }
  if (endTimes) {
    timeRound['$lt'] =  endTimes
    query.date = timeRound
  }



  console.log(query)
  // 当前查询条件下的总数
  Model.Bill.find(query).countDocuments((error, count) => {
    console.log(count)
    let total = count
    // 条件查训结果 ===> 时间排序 ===> 跳过skip条/查询偏移量 ===> 只返回pageSize条
    Model.Bill
      .find(query)
      .sort({date: -1})
      .skip(skip)
      .limit(pageSize)
      .then(result => {
        responseData.code = responseCode.normalCode
        responseData.desc = '账单列表查询'
        responseData.data = result
        responseData.currentPage = currentPage
        responseData.pageSize = pageSize
        responseData.total = total
        res.json(responseData)
    })
  })


})




module.exports = router
