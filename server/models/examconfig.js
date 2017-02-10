/** 考试配置对象表
 * 考试配置是定义使用哪套试卷，考试日期时间，参考人员等信息
 * */
var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

/**
 * 表结构 examconfigs {
 *      name        考试名称
 *      sheet       试卷ID
 *      canReview   是否能复卷，查看参考答案
 *      autoCorrect 是否自动判卷，如果不自动判断，需要手工或者批量判卷
 *      isFull      是否是测卷，测卷时会试题的每种式样都会产生一道题
 *      isGenerated 是否已经生成了试卷，考试定义以后，还需要一个较长的生成试卷过程，且任何对考试试卷套数和
 *                  试卷的变动都导致需要重新生成试卷，这里仅用于标志是否已经生成了试卷
 *      dateGenerated   生成试卷的时间戳
 *      isPublic    可以决定考卷学生是否可见，公开还是不公开
 *      dateBegin   考试正式公布的考试开始时间
 *      minAhead    允许提前获取试卷的时间，考试公布的开始时间-提前的分钟数就是考生能获取试卷的时间，也是决定“未开始”
 *                  还是“考试中”状态的决定条件。提前的时间允许在[0,20]范围内。
 *      dateBeginAhead  上面两个变量之和，即真正开始开始进入考试的时间
 *      dateEnd     考试正式公布的考试结束时间，是决定考试是否能提交答案的条件。
 *
 *      学生能否参加考试需要取决于下面三个条件：
 *          isPublic, isGenerated，考卷的状态是考试中（即请求试卷的时间是否在[dateBegin-minAhead, dateEnd]之间）
 *
 *      pattern     参考学生的学号匹配字符串
 *      remark      备注
 *      numTemplate 模版套数
 *  }
 * @type {Schema}
 */
var ExamConfigSchema = new Schema({
    name: {type: String, required: true}
    ,remark: {type: String}
    ,sheet: {type: mongoose.Schema.Types.ObjectId, ref: 'Sheet', required: true}
    ,canReview: {type: Boolean, default: false}
    ,autoCorrect: {type: Boolean, default: false}
    ,isFull: {type: Boolean, default: false}
    ,isGenerated: {type: Boolean, default: false}
    ,isPublic: {type: Boolean, default: false}
    ,dateBegin: {type: Date}
    ,dateBeginAhead: {type: Date}
    ,dateEnd: {type: Date}
    ,dateGenerated: {type: Date}
    ,datePublic: {type: Date}
    ,minAhead: {type: Number, default: 0}
    ,code: {type: String, required: true, index:{unique:true}}
    ,lastModified: {type: Date}
    ,ipPattern: {type: String}
    ,ipPatternB: {type: String}
    ,pattern: {type: String}
    ,numTemplate: {type: Number}
});

/**
 * 保存前的预处理操作
 *  */
ExamConfigSchema.pre('save', function (next) {
    var exam = this;
    //一旦修改了试卷定义或者模版套数，则需要重新生成试卷，这里设定未生成标志
    if (exam.isModified('sheet') || exam.isModified('numTemplate')){
        exam.isGenerated = false;
    }
    //一旦修改了开始或提前进入考试的分钟数，需要重新计算真正可以进入考试的时间
    if (exam.isModified('minAhead') || exam.isModified('dateBegin')){
        var begin = new Date(exam.dateBegin);
        if(!isNaN(exam.minAhead))
            begin.setMinutes(begin.getMinutes() - exam.minAhead);
        exam.dateBeginAhead = begin;
    }
    next();
});

module.exports = mongoose.model('ExamConfig', ExamConfigSchema);