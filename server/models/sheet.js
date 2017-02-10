/** 组卷对象表
 * 组卷是记录有哪些试题如何组成一个集合的，不包含具体的题目，而仅仅是一个配置情形
 * 组卷能回答的问题是：软件测试期中测验应考那几个章节，每个章节多少道题目，什么题型
 * */
var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

/**
 * 表结构 sheet {
 *      name        试卷名称
 *      num         总题量，目前是统计所含题目的个数总和
 *      remark      备注
 *      detail      试题明细
 *          category    来自哪个章节
 *          type        试题类型
 *          num         试题个数
 *  }
 * @type {Schema}
 */
var DetailSchema = new Schema({
    type: {type: String, required: true}
    ,category: {type: mongoose.Schema.Types.ObjectId, ref: 'Qcategory', required: true}
    ,num: {type: Number, required: true}
});

var SheetSchema = new Schema({
    name: {type: String, required: true}
    ,code: {type: String, required: true, index:{unique:true}}
    ,lastModified: {type: Date}
    ,num: {type: Number}
    ,remark: {type: String}
    ,detail: [DetailSchema]
});

/** 自动累计试题总数 */
SheetSchema.pre('save', function (next) {
    var sheet = this;
    if (sheet.isModified('detail')){
        var num = 0;
        for(var i=0;i<sheet.detail.length;i++){
            num += sheet.detail[i].num;
        }
        sheet.num = num;
    }

    next();
});

module.exports = mongoose.model('Sheet', SheetSchema);