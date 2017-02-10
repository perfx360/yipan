/** 签到表 */
var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

/**
 * 表结构 signs {
 *      name        签到的名称，一般就是签到对象群的名称
 *      ,owner      发起人
 *      ,create     发起时间
 *      ,signgroup  签到对象
 *      ,remark     备注
 *      ,isClosed   是否已经关闭
 *      ,numExpected    应签人数 = 实签人数 + 异常人数
 *      ,numReal    实签人数
 *      ,numException   异常人数，主要是指代签和请假的人数
 *      ,history:   {//记录开启，关闭等动作的时间
 *          date:   时间
 *          name:   执行动作的用户
 *          type:   执行动作的名称
 *          remark: 备注
 *      }
 *      ,detail: {
 *          name    学生对象id
 *          date    签到时间，或者记录最后修改状态的时间
 *          status  签到状态，默认为未签到，自行签到后变成签到状态，也可以被教师标记为代签，请假状态
 *          remark  备注
 *      }
 *  }
 * @type {Schema}
 */

/** 操作历史子文档结构 */
var HistorySchema = new Schema(
    {
        name: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
        ,date: {type: Date, default:Date.now()}
        ,type: {type: String, required: true}
        ,remark: {type: String}
    }
);

/** 签到明细子文档结构 */
var DetailSchema = new Schema(
    {
        name: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
        ,date: {type: Date, default:Date.now()}
        ,status: {type: String, default:'未签到'}
        ,ip: {type: String}
        ,remark: {type: String}
    }
);

/** 签到主文档结构 */
var SignSchema = new Schema({
    name: {type: String, required: true}
    ,owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
    ,create: {type: Date, default:Date.now()}
    ,signgroup: {type: mongoose.Schema.Types.ObjectId, ref: 'SignGroup'}
    ,remark: {type: String}
    ,isClosed: {type: Boolean, default:false}
    ,numExpected: {type:Number, default:0}
    ,numReal: {type:Number, default:0}
    ,numException: {type:Number, default:0}
    ,history:[HistorySchema]
    ,detail:[DetailSchema]
});

module.exports = mongoose.model('Sign', SignSchema);