/**
 * 测试mongoose的aggregate调用
 * Created by Administrator on 2015/9/15.
 *
 * 用于查询按类属和类型分组统计的聚合语句
 db.questions.aggregate([{$group:{_id:{category:"$category",type:"$type"},count:{$sum:1}}}]);
 */
var config = require('../../config');
var mongoose = require('mongoose');
mongoose.connect(config.database);
var Exam = require('../models/exam');
var User = require('../models/user');

Exam
    .find({config:"571f03a66398995c1490e88c"},{tester:1,isSubmit:1,score:1,_id:0})
    .populate('tester', 'name code')
    .exec(function(err,res) {
    if (err) {
        console.log('Error find: ', err);
    } else {
        console.log('序号\t学号\t姓名\t是否交卷\t成绩\t');
        var i = 0;
        var len = res.length;
        for(;i<len;i++){
            console.log(i+1
                ,res[i].tester.code
                ,res[i].tester.name
                ,res[i].isSubmit
                ,res[i].score
            );
        }
    }
});