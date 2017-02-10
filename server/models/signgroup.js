/** 签到对象表 */
var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

/**
 * 表结构 signgroups {
 *      name        对象群的名称
 *      ,pattern    对象群一般是通过学号的前缀来区分的，这里记住其正则表达式
 *      ,remark     备注
 *  }
 * @type {Schema}
 */
var SigngroupSchema = new Schema({
    name: {type: String, index: {unique: true}, required: true}
    ,pattern: {type: String, required: true}
    ,remark: {type: String}
});

module.exports = mongoose.model('SignGroup', SigngroupSchema);