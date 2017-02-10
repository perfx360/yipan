/** 抽查表 */
var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

/**
 * 表结构 checks {
 *      ,owner      发起人
 *      ,create     发起时间
 *      ,signgroup  签到对象
 *      ,remark     备注
 *      ,isAccumulated   是否是累计抽查
 *      ,numExpected    设计抽查人数
 *      ,numReal        实际抽查人数，如果累计抽查可能会因为确保个人抽查次数一致而达不到设计人数
 *      ,detail: [学生对象id]
 *  }
 * @type {Schema}
 */

/** 抽查主文档结构 */
var CheckSchema = new Schema({
    owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
    ,create: {type: Date, default:Date.now()}
    ,signgroup: {type: mongoose.Schema.Types.ObjectId, ref: 'SignGroup'}
    ,remark: {type: String}
    ,isAccumulated: {type: Boolean, default:true}
    ,numExpected: {type:Number, default:0}
    ,numReal: {type:Number, default:0}
    ,detail:[{type: mongoose.Schema.Types.ObjectId, ref: 'User'}]
});

module.exports = mongoose.model('Check', CheckSchema);