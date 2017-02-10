var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

/**
 * 定义系统变量，主要用于记录一次性的值，
 * 例如当前最大编号
 * @codetype    编号类型，表明是 exam,sheet,还是question
 * @maxNo       记录下一个最大的编号，注意不是系统当前最大编号，如需使用
 *              可直接取最大编号给新增类型编号，再自增一个编号为下一次使用准备
 * @type {Schema}
 */
var SystemSchema = new Schema({
    codeType: {type: String, required: true, index: {unique: true}}
    ,maxNo : {type: Number, default:1}
});

module.exports = mongoose.model('System', SystemSchema);