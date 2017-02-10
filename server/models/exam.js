/** 考试试卷对象表
 * 考试试卷是定义每个学生考卷具体内容的表，包含了题目的详细信息，这里应该是多次随机以后的
 * 固定结果，同时还可以记录学生的提交答案，参考答案，考试成绩等信息。
 * */
var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

/**
 * 对qid的说明，这里的qid仅作为对比答案的一个标识符，并不能直接对应Question对象，因为存在多种样式的可能
 * 所以qid的结构是 question id + '-' + formIndex
 * 如果需要回溯原题，需要再处理一下
 * 表结构 exams {
 *      config      考试配置ID
 *      tester      参考人员ID
 *
 *      questions   试题内容
 *          qid     试题ID号
 *          code    试题编号 + 样式索引
 *          type    试题类型
 *          desc    题干描述
 *          point   分值
 *          ans     提供的可选答案
 *
 *      ansExpect   参考答案
 *          qid     试题ID号
 *          ansIndex    答案索引值
 *
 *      ansSubmit   提交答案
 *          qid     试题ID号
 *          ansIndex    答案索引值
 *
 *      isSubmit    是否已经提交答案
 *      dateCorrect 判卷日期
 *      isCorrect   是否已经判卷
 *      score       成绩
 *  }
 * @type {Schema}
 */
var AnsSchema = new Schema({
    qid: {type: String, required: true}
    //qid: {type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true}
    ,ans: [{type: Number}]
});
var QueSchema = new Schema({
    qid: {type: String, required: true}
    ,code: {type: String, required: true}
    ,point: {type: Number, required: true}
    ,desc: {type: String, required: true}
    ,images: [String]
    ,ans: [String]
});

var TypeSchema = new Schema({
    type: {type: String, required: true}
    ,questions: [QueSchema]
});
var ExamSchema = new Schema({
    config: {type: mongoose.Schema.Types.ObjectId, ref: 'ExamConfig', required: true}
    ,tester: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true}
    ,isCorrected: {type: Boolean, default: false}
    ,dateCorrect: {type: Date, default: null}
    ,score: {type: Number, default: 0}
    ,point: {type: Number, default: 0}
    ,isSubmit: {type: Boolean, default: false}
    ,submitIP: {type: String, default: null}
    ,isRead: {type: Boolean, default: false}
    ,readIP: {type: String, default: null}
    ,dateRead: {type: Date, default: null}
    ,dateSubmit: {type: Date, default: null}
    ,dateGenerated: {type: Date, default: null}

    ,questions: [TypeSchema]
    ,ansExpect: [AnsSchema]
    ,ansSubmit: [AnsSchema]
});

/**
 * 为结构增加一个判卷的方法
 * 判卷就是比较参考答案和用户提交答案是否一致的过程
 * 步骤如下：
 *  1.  先把用户提交的答案和参考答案都转存成对象的数据结构，便于查找
 *  2.  遍历每一个问题，如果两者都有答案，则
 *  3.  如果是单选   直接比较两个答案数组的第一个元素，如相等获得对应问题分值的分数
 *  4.  如果是多选   则要看多选和少选的个数，分别来扣分，一般总共4道题计算，多选和少选均扣25%一个
 * @returns {*}
 */
ExamSchema.methods.getScore = function () {
    var exam = this;
    if(!exam.ansSubmit||exam.ansSubmit.length<1) return 0;
    if(!exam.ansExpect||exam.ansExpect.length<1) return 0;

    //重新组织提交答案和参考答案
    var submit = {};
    for(var i=0; i<exam.ansSubmit.length; i++){
        submit[exam.ansSubmit[i].qid] = exam.ansSubmit[i].ans;
    }
    var expected = {};
    for(var i=0; i<exam.ansExpect.length; i++){
        expected[exam.ansExpect[i].qid] = exam.ansExpect[i].ans;
    }

    //遍历每一个考试题
    var score = 0;
    var question;
    var type;
    //对每一种类型
    for(var t=0; t<exam.questions.length; t++){
        type = exam.questions[t].type;
        //遍历这个类型的所有试题
        for(var i=0; i<exam.questions[t].questions.length; i++) {
            question = exam.questions[t].questions[i];

            //获取两个答案数组
            var anse = expected[question.qid];
            var anss = submit[question.qid];
            if (!anss || !anse) continue;

            if (type == '单选') {
                //单选题直接比较两个数组的第一个元素是否相等
                if (anss.length > 0 && anse.length > 0) {
                    if (anss[0] == anse[0])
                        score += question.point;
                }
            } else if (type == '多选') {
                //遍历每一个提交的答案，统计多选的答案的个数
                var invalidAnsSubmit = 0;
                for (var j = 0; j < anss.length; j++) {
                    if (anse.indexOf(anss[j]) < 0)
                        invalidAnsSubmit++;
                }
                /**
                 * 漏选正确答案的个数   = 正确答案的个数 - 提交的正确答案的个数
                 *                      = 正确答案的个数 - (提交的答案总数 - 提交的错误答案个数)
                 *                      = 正确答案的个数 - 提交的答案总数 + 提交的错误答案个数
                 *                      = 正确答案的个数 + 多选的答案个数 - 提交的答案总数
                 * @type {number}
                 */
                var validAnsMissing = anse.length + invalidAnsSubmit - anss.length;

                //多选的得分公式 = 总分 - (多选答案个数 + 少选答案个数)/4
                score += question.point * (4 - validAnsMissing - invalidAnsSubmit) / 4;
            }
        }
    }

    return score;
};

module.exports = mongoose.model('Exam', ExamSchema);