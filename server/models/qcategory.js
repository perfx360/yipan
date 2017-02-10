/** 试题类属对象表
 * 每个试题所属的章节信息，例如"第三章 白盒测试"等，主要用于组卷时能区分挑选哪些试题参与组卷。
 * 目前试题都直接依附于一个类属，将来可以设计类属的树形结构，可以在选择试题时更加灵活的选择章
 * 节。
 * */
var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

/**
 * 表结构 qcategorys {
 *      name        类属名称
 *      remark      备注
 *  }
 * @type {Schema}
 */
var QcategorySchema = new Schema({
    name: {type: String, index: {unique: true}, required: true}
    ,remark: {type: String}
});

module.exports = mongoose.model('Qcategory', QcategorySchema);