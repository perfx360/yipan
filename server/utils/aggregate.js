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
var Question = require('../models/question');

Question.aggregate([{$group:{_id:{category:"$category",type:"$type"},count:{$sum:1}}}]).exec(function(err,res) {
    if (err) {
        console.log('Error find: ', err);
    } else {
        for(var i in res){
            console.log(JSON.stringify(res[i]));
        }
    }
});