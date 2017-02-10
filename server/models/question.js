/** 试题对象表
 * 记录每个试题的结构，由于需要考虑一题多样，每个试题都包含一个子文档数组，是该题的多种样式，在生成考卷时需要随机选取。
 * */
var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

/**
 * 表结构 qcategorys {
 *      desc            试题题干范例，由于存在一题多样，这仅仅是个范例，具体试题在form字段中
 *      category        类属ID
 *      point           分值，默认1
 *      type            类型，目前支持 单选，多选，后续可加入判断，填空四种类型
 *      remark          备注
 *
 *      numForm         试题式样个数
 *      form            试题样式数组
 *          desc        题干部分
 *          ans         答案数组
 *              desc    答案描述
 *              isValid 是否正确
 *  }
 * @type {Schema}
 */
var AnswerSchema = new Schema({
    desc: {type: String, required: true}
    ,isValid: {type: Boolean}
});

var FormSchema = new Schema({
    desc: {type: String, required: true}
    ,images:[{type: String}]
    ,ans: [AnswerSchema]
});

var QuestionSchema = new Schema({
    desc: {type: String}
    ,code: {type: String, required: true, index:{unique:true}}
    ,lastModified: {type: Date}
    ,type: {type: String, index: true, required: true}
    ,category: {type: mongoose.Schema.Types.ObjectId, ref: 'Qcategory', index: true}
    ,remark: {type: String}
    ,point:{type: Number, default: 1, required: true}
    ,form: [FormSchema]
    ,numForm: {type: Number}
});

/** 自动记录试题样式数组中的第一个题干到主文档中，便于查询时可以立即看到试题的大致内容 */
QuestionSchema.pre('save', function (next) {
    var question = this;
    if (question.isModified('form')){
        if(question.form && question.form.length>0) {
            question.desc = question.form[0].desc;
            question.numForm = question.form.length;
        } else {
            question.desc = null;
            question.numForm = 0;
        }
    }

    next();
});


module.exports = mongoose.model('Question', QuestionSchema);