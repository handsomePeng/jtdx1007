const mongoose = require('mongoose')
mongoose.connect('mongodb://localhost:27017/jtdx',{ useNewUrlParser: true })

// 用户
const userSchema = new mongoose.Schema({
  name: String,
  password: String,
  createTime: {
    type: String,
    default: Date.now()
  }
})

// 账单
const billSchema = new mongoose.Schema({
  num: {
    type: Number,
    required: [true, '账单金额不能为空'],
  },
  date: {
    type: Date,
    required: [true, '花费日期不能为空']
  },
  remark: String,
  sharer: {
    type: Array,
    required: [true, '至少选择一个人分担账单']
  },
  payer: {
    type: String
  },
  changer:  {
    type: String
  },
  status: {
    type: Boolean,
    default: false,
    required: [true, '账单状态不能为空']
  },
  average: {
    type: Number,
    required: [true, '账单均分金额不能为空'],
  },
  createTime: String
})

const Model = {
  User: mongoose.model('User', userSchema),
  Bill: mongoose.model('Bill', billSchema)
}

module.exports = Model
